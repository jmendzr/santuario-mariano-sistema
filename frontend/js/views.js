/* ============================================
   views.js — Vistas conectadas al backend real
   ============================================ */

const Views = (() => {

  // ══════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════
  async function dashboard() {
    setTopbar('Panel Principal', fechaLarga());
    setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);
    try {
      const [rep, cfg, agenda] = await Promise.all([
        API.getReportes(),
        API.getConfig(),
        API.getAgenda(),
      ]);
      const proximosEvs = agenda.filter(e => e.fecha >= hoy()).sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,4);

      const sacBars = SAC_ORDER.map(k => {
        const info = SAC_INFO[k];
        const row = rep.porSacramento?.find(r => r.tipo === k);
        const cnt = parseInt(row?.total || 0);
        const pct = rep.totales.total_feligreses > 0 ? Math.round(cnt / rep.totales.total_feligreses * 100) : 0;
        return `<div class="sac-mini-bar">
          <div class="sac-mini-label"><span>${info.emoji} ${info.label}</span><span class="sac-mini-count">${cnt}</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${info.color}"></div></div>
        </div>`;
      }).join('');

      const evHtml = proximosEvs.length
        ? proximosEvs.map(e=>`<div class="agenda-event">
            <div class="event-date-box"><div class="event-day">${e.fecha.split('-')[2]}</div><div class="event-month">${mesCorto(e.fecha)}</div></div>
            <div class="event-info"><div class="event-type">${esc(e.tipo)}</div><div class="event-title">${esc(e.titulo)}</div><div class="event-sub">🕐 ${esc(e.hora||'')} · 📍 ${esc(e.lugar||'')}</div></div>
          </div>`).join('')
        : '<div class="empty-state" style="padding:20px"><div class="empty-icon" style="font-size:28px">📅</div><div class="text-muted">Sin eventos próximos</div></div>';

      setContent(`
        <div class="content-area">
          <div class="dashboard-welcome">
            <div class="dw-title">Bienvenido, ${esc(App.session?.nombre||'')}</div>
            <div class="dw-sub">${esc(cfg.parroquia||'')} · ${esc(cfg.diocesis||'')}</div>
            <div class="dw-date">📍 ${esc(cfg.direccion||'')}</div>
          </div>
          <div class="stats-grid">
            ${[['👥','Feligreses',rep.totales.total_feligreses,rep.totales.activos+' activos'],
               ['✝️','Sacramentos',rep.totales.total_sacramentos,'registros'],
               ['📎','Documentos',rep.totales.total_documentos,'archivos'],
               ['📅','Próx. Eventos',proximosEvs.length,'en agenda']
              ].map(([ic,lb,v,s])=>`<div class="stat-card"><div class="stat-icon">${ic}</div><div class="stat-label">${lb}</div><div class="stat-value">${v}</div><div class="stat-sub">${s}</div></div>`).join('')}
          </div>
          <div class="dash-grid">
            <div>
              <div class="card mb-3">
                <div class="card-header"><div class="card-title">Registros recientes</div></div>
                <div class="table-wrap"><table>
                  <thead><tr><th>Feligrés</th><th>DNI</th><th>Registro</th></tr></thead>
                  <tbody>${(rep.recientes||[]).map(f=>`<tr>
                    <td><div class="flex-gap"><div class="avatar">${initiales(f.nombres,f.apellidos)}</div><span style="font-weight:700">${esc(f.nombres+' '+f.apellidos)}</span></div></td>
                    <td style="font-family:monospace">${esc(f.dni)}</td>
                    <td class="text-muted">${fmtFecha(f.creado_en?.split('T')[0])}</td>
                  </tr>`).join('')}</tbody>
                </table></div>
              </div>
            </div>
            <div>
              <div class="card mb-3"><div class="card-header"><div class="card-title">Sacramentos</div></div><div class="card-body">${sacBars}</div></div>
              <div class="card"><div class="card-header"><div class="card-title">Próximos Eventos</div></div><div class="card-body" style="padding:12px">${evHtml}</div></div>
            </div>
          </div>
        </div>`);
    } catch(e) { showError(e.message); }
  }

  // ══════════════════════════════════════════
  // FELIGRESES
  // ══════════════════════════════════════════
  async function feligreses(q='') {
    const canEdit = App.canEdit();
    setTopbar('Directorio de Feligreses','');
    setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);

    try {
      const res = await API.getFeligreses({ q, limit: 100 });
      const list = res.data || [];

      const rows = list.map(f=>`<tr>
        <td>
          <div class="flex-gap">
            <div class="avatar">${initiales(f.nombres,f.apellidos)}</div>
            <div>
              <div style="font-weight:700;color:var(--navy)">${esc(f.nombres+' '+f.apellidos)}</div>
              <div class="text-muted">${esc(f.email||'')} ${f.dni_verificado?'<span class="badge badge-green" style="font-size:10px">✓ RENIEC</span>':''}</div>
            </div>
          </div>
        </td>
        <td style="font-family:monospace">${esc(f.dni)}</td>
        <td>${calcEdad(f.fecha_nacimiento)} años</td>
        <td>${esc(f.telefono||'—')}</td>
        <td>${f.sacramentos ? f.sacramentos.map(s=>`<span title="${SAC_INFO[s.tipo]?.label||s.tipo}" style="font-size:16px">${SAC_INFO[s.tipo]?.emoji||'•'}</span>`).join('')||'—' : '—'}</td>
        <td><span class="badge ${f.activo?'badge-green':'badge-gray'}">${f.activo?'Activo':'Inactivo'}</span></td>
        <td><button class="btn btn-outline btn-sm" onclick="App.navigate('perfil','${f.id}')">Ver perfil</button></td>
      </tr>`).join('');

      setTopbar('Directorio de Feligreses', `${res.total} feligreses registrados`,
        `<div class="search-box"><input type="text" id="searchInput" placeholder="Buscar nombre, DNI, email..." value="${esc(q)}" oninput="App.debounceSearch(this.value)" style="width:280px"/></div>
         ${canEdit?`<button class="btn btn-primary" onclick="App.navigate('nuevo-feligres')">+ Nuevo Feligrés</button>`:''}`);
      setContent(`<div class="content-area"><div class="card"><div class="table-wrap">
        <table><thead><tr><th>Feligrés</th><th>DNI</th><th>Edad</th><th>Teléfono</th><th>Sacramentos</th><th>Estado</th><th></th></tr></thead>
        <tbody>${rows||'<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Sin resultados</div></div></td></tr>'}</tbody>
        </table></div></div></div>`);
    } catch(e) { showError(e.message); }
  }

  // ══════════════════════════════════════════
  // FORMULARIO FELIGRÉS (Nuevo / Editar)
  // ══════════════════════════════════════════
  async function formFeligres(id='') {
    const canEdit = App.canEdit();
    let f = {};
    if (id) {
      setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);
      try { f = await API.getFeligres(id); } catch(e) { showError(e.message); return; }
    }
    const isEdit = !!id;
    setTopbar(isEdit?'Editar Feligrés':'Nuevo Feligrés', isEdit?`Modificando: ${f.nombres||''} ${f.apellidos||''}`:'',
      canEdit?`<button class="btn btn-primary" onclick="Views.saveFeligresForm('${id}')">💾 Guardar</button>`:''
    );

    setContent(`<div class="content-area"><div class="card card-accent"><div class="card-body">
      <div class="alert alert-info">Los campos marcados con <strong>*</strong> son obligatorios.</div>

      <div class="form-section">
        <div class="form-section-title">🔍 Validación RENIEC</div>
        <div style="display:flex;gap:10px;align-items:flex-end">
          <div class="form-group" style="flex:0 0 200px">
            <label>DNI <span class="req">*</span></label>
            <input type="text" id="fDni" value="${esc(f.dni||'')}" placeholder="8 dígitos" maxlength="8"
              oninput="this.value=this.value.replace(/\D/g,'')"/>
          </div>
          <button class="btn btn-gold" onclick="Views.validarRENIEC()" id="btnReniec">
            🔍 Consultar RENIEC
          </button>
          <div id="reniecStatus"></div>
        </div>
        <div id="reniecResult" style="margin-top:10px"></div>
      </div>

      <div class="form-section">
        <div class="form-section-title">👤 Datos Personales</div>
        <div class="form-grid form-3">
          <div class="form-group"><label>Nombres <span class="req">*</span></label>
            <input type="text" id="fNombres" value="${esc(f.nombres||'')}" placeholder="Nombres completos"/></div>
          <div class="form-group"><label>Apellido Paterno <span class="req">*</span></label>
            <input type="text" id="fApellidos" value="${esc(f.apellidos||'')}" placeholder="Apellidos completos"/></div>
          <div class="form-group"><label>Apodo</label>
            <input type="text" id="fApodo" value="${esc(f.apodo||'')}"/></div>
          <div class="form-group"><label>Fecha de Nacimiento</label>
            <input type="date" id="fFechaNac" value="${f.fecha_nacimiento?.split('T')[0]||''}" max="${hoy()}"/></div>
          <div class="form-group"><label>Sexo</label>
            <select id="fSexo"><option value="M" ${(f.sexo||'M')==='M'?'selected':''}>Masculino</option><option value="F" ${f.sexo==='F'?'selected':''}>Femenino</option></select></div>
          <div class="form-group"><label>Estado Civil</label>
            <select id="fEstadoCivil">${['Soltero/a','Casado/a','Viudo/a','Divorciado/a','Separado/a','Unión libre'].map(o=>`<option ${(f.estado_civil||'Soltero/a')===o?'selected':''}>${o}</option>`).join('')}</select></div>
          <div class="form-group"><label>Nacionalidad</label>
            <input type="text" id="fNacionalidad" value="${esc(f.nacionalidad||'Peruana')}"/></div>
          <div class="form-group"><label>Lugar de Nacimiento</label>
            <input type="text" id="fLugarNac" value="${esc(f.lugar_nacimiento||'')}"/></div>
          <div class="form-group"><label>Ocupación</label>
            <input type="text" id="fOcupacion" value="${esc(f.ocupacion||'')}"/></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">📞 Contacto</div>
        <div class="form-grid form-3">
          <div class="form-group"><label>Teléfono</label><input type="tel" id="fTelefono" value="${esc(f.telefono||'')}" placeholder="9XX XXX XXX"/></div>
          <div class="form-group"><label>Correo Electrónico</label><input type="email" id="fEmail" value="${esc(f.email||'')}"/></div>
          <div class="form-group"><label>Parroquia de Origen</label><input type="text" id="fParroquiaOrigen" value="${esc(f.parroquia_origen||'')}"/></div>
          <div class="form-group full"><label>Dirección</label><input type="text" id="fDireccion" value="${esc(f.direccion||'')}" placeholder="Jr./Av. Nombre ###, Distrito, Lima"/></div>
          <div class="form-group"><label>Estado</label>
            <select id="fActivo"><option value="1" ${f.activo!==false?'selected':''}>Activo</option><option value="0" ${f.activo===false?'selected':''}>Inactivo</option></select></div>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:8px;border-top:1px solid var(--border)">
        <button class="btn btn-outline" onclick="App.navigate('${isEdit?'perfil':'feligreses'}','${id}')">Cancelar</button>
        <button class="btn btn-primary" onclick="Views.saveFeligresForm('${id}')">💾 ${isEdit?'Guardar Cambios':'Registrar Feligrés'}</button>
      </div>
    </div></div></div>`);
  }

  async function validarRENIEC() {
    const dni = document.getElementById('fDni')?.value?.trim();
    if (!dni || dni.length !== 8) { Toast.show('Ingrese un DNI de 8 dígitos', 'error'); return; }

    const btn = document.getElementById('btnReniec');
    const status = document.getElementById('reniecStatus');
    const result = document.getElementById('reniecResult');

    btn.disabled = true;
    btn.innerHTML = '⏳ Consultando...';
    status.innerHTML = '';
    result.innerHTML = '';

    try {
      const res = await API.consultarDNI(dni);
      const d = res.data;

      if (res.fuente === 'demo') {
        status.innerHTML = `<span class="badge badge-gold">⚠️ Modo Demo</span>`;
        result.innerHTML = `<div class="alert alert-warn">Configure su token RENIEC en el archivo .env para consultas reales. <a href="https://apisperu.com" target="_blank">Obtener token →</a></div>`;
      } else {
        status.innerHTML = `<span class="badge badge-green">✓ Verificado RENIEC</span>`;
        result.innerHTML = `
          <div class="alert alert-success">
            ✅ DNI válido encontrado en RENIEC:<br/>
            <strong>${esc(d.nombreCompleto)}</strong>
            ${d.fechaNacimiento ? ` · Nacido: ${fmtFecha(d.fechaNacimiento)}` : ''}
            ${d.sexo ? ` · ${d.sexo === 'M' ? 'Masculino' : 'Femenino'}` : ''}
          </div>`;

        // Auto-rellenar campos
        const [ap1, ...restAp] = (d.apellidoPaterno+' '+d.apellidoMaterno).trim().split(' ');
        if (d.nombres) { const inp = document.getElementById('fNombres'); if(inp && !inp.value) inp.value = toTitle(d.nombres); }
        if (d.apellidoPaterno) { const inp = document.getElementById('fApellidos'); if(inp && !inp.value) inp.value = toTitle((d.apellidoPaterno+' '+(d.apellidoMaterno||'')).trim()); }
        if (d.fechaNacimiento) { const inp = document.getElementById('fFechaNac'); if(inp && !inp.value) inp.value = d.fechaNacimiento; }
        if (d.sexo) { const sel = document.getElementById('fSexo'); if(sel) sel.value = d.sexo; }
        if (d.direccion) { const inp = document.getElementById('fDireccion'); if(inp && !inp.value) inp.value = toTitle(d.direccion); }
      }
    } catch(e) {
      status.innerHTML = `<span class="badge badge-red">✕ Error</span>`;
      result.innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Consultar RENIEC';
    }
  }

  function toTitle(s) {
    return (s||'').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  async function saveFeligresForm(existingId) {
    const g = id => document.getElementById(id)?.value?.trim() || '';
    const nombres = g('fNombres'), apellidos = g('fApellidos'), dni = g('fDni');
    if (!nombres || !apellidos || !dni) { Toast.show('Nombres, apellidos y DNI son obligatorios', 'error'); return; }
    if (!/^\d{8}$/.test(dni)) { Toast.show('DNI debe tener 8 dígitos numéricos', 'error'); return; }

    const data = {
      nombres, apellidos, dni,
      apodo: g('fApodo'), fecha_nacimiento: g('fFechaNac') || null,
      sexo: g('fSexo'), nacionalidad: g('fNacionalidad'),
      lugar_nacimiento: g('fLugarNac'), estado_civil: g('fEstadoCivil'),
      ocupacion: g('fOcupacion'), email: g('fEmail'),
      telefono: g('fTelefono'), direccion: g('fDireccion'),
      parroquia_origen: g('fParroquiaOrigen'),
      activo: document.getElementById('fActivo')?.value === '1',
    };

    try {
      const f = existingId
        ? await API.actualizarFeligres(existingId, data)
        : await API.crearFeligres(data);
      Toast.show(`Feligrés ${f.nombres} ${f.apellidos} ${existingId?'actualizado':'registrado'} ✓`);
      App.navigate('perfil', f.id);
    } catch(e) {
      Toast.show(e.message, 'error');
    }
  }

  // ══════════════════════════════════════════
  // PERFIL
  // ══════════════════════════════════════════
  async function perfil(id) {
    setTopbar('Cargando perfil...', '');
    setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);
    try {
      const f = await API.getFeligres(id);
      const canEdit = App.canEdit();
      const sacsMap = {};
      (f.sacramentos || []).forEach(s => { sacsMap[s.tipo] = s; });

      const sacCards = SAC_ORDER.map(k => {
        const info = SAC_INFO[k];
        const reg = sacsMap[k];
        const hasDoc = reg && f.documentos?.some(d => d.sacramento_id === reg.id);
        return `<div class="sac-card ${reg?'done':''} ${hasDoc?'has-doc':''}"
            onclick="Views.openSacModal('${id}','${k}',${reg?`'${reg.id}'`:'null'})">
          <div class="sac-check">✓</div>
          <div class="sac-doc-badge" title="Tiene documento adjunto">📎</div>
          <div class="sac-emoji">${info.emoji}</div>
          <div class="sac-name">${info.label}</div>
          <div class="sac-date">${reg?fmtFecha(reg.fecha?.split('T')[0]):'Sin registrar'}</div>
        </div>`;
      }).join('');

      const sacRows = (f.sacramentos||[]).map(s => {
        const info = SAC_INFO[s.tipo];
        const docs = (f.documentos||[]).filter(d => d.sacramento_id === s.id);
        return `<tr>
          <td><span style="font-size:18px">${info?.emoji||'•'}</span> <strong>${info?.label||s.tipo}</strong></td>
          <td>${fmtFecha(s.fecha?.split('T')[0])}</td>
          <td style="font-size:12px">${esc(s.parroquia||'—')}</td>
          <td style="font-size:11px;font-family:monospace">${[s.libro&&`L.${s.libro}`,s.folio&&`F.${s.folio}`,s.partida&&`P.${s.partida}`].filter(Boolean).join(' ')||'—'}</td>
          <td>${docs.length?docs.map(d=>`<a href="${API.urlDocumento(d.nombre_archivo)}" target="_blank" class="btn btn-outline btn-xs">📎 ${esc(d.nombre_original.substring(0,18))}</a>`).join(' '):'<span class="text-muted">Sin doc.</span>'}</td>
          <td><div class="flex-gap">
            <button class="btn btn-outline btn-xs" onclick="Views.openSacModal('${id}','${s.tipo}','${s.id}')">✏️</button>
            ${canEdit?`<button class="btn btn-xs" style="background:#FFF0F2;color:var(--danger);border:1px solid #FECDD3" onclick="Views.deleteSac('${s.id}','${id}')">🗑</button>`:''}
          </div></td>
        </tr>`;
      }).join('');

      const docsGen = (f.documentos||[]).filter(d=>!d.sacramento_id);
      const docsHtml = `
        ${canEdit?`<div class="card mb-2">
          <div class="card-header"><div class="card-title">📎 Subir Documento</div></div>
          <div class="card-body">
            <div class="form-grid form-2" style="margin-bottom:12px">
              <div class="form-group"><label>Categoría</label>
                <select id="docCategoria">${['Partida de Bautismo','Partida de Matrimonio','Fe de Bautismo','Confirmación','Fotocopia DNI','Carta de Recomendación','Otro'].map(o=>`<option>${o}</option>`).join('')}</select>
              </div>
            </div>
            <div class="drop-zone" id="docDropZone" onclick="document.getElementById('docFileInput').click()">
              <div class="drop-icon">📁</div><div class="drop-text">Clic o arrastre archivos aquí</div>
              <div class="drop-sub">PDF, JPG, PNG — Máx. 10MB</div>
            </div>
            <input type="file" id="docFileInput" accept=".pdf,.jpg,.jpeg,.png" style="display:none"
              onchange="Views.uploadDoc('${id}',event)"/>
          </div>
        </div>`:''}
        <div class="card">
          <div class="card-header"><div class="card-title">📂 Documentos Generales (${docsGen.length})</div></div>
          <div class="card-body">
            ${docsGen.length ? docsGen.map(d=>`<div class="doc-item">
              <span class="doc-icon">${d.tipo_mime?.includes('pdf')?'📋':'🖼️'}</span>
              <div style="flex:1"><div class="doc-name">${esc(d.nombre_original)}</div>
                <div class="doc-meta">${esc(d.categoria)} · ${fmtSize(d.tamanio_bytes||0)} · ${fmtFecha(d.subido_en?.split('T')[0])}</div></div>
              <div class="doc-actions">
                <a href="${d.ruta_almacen && d.ruta_almacen.startsWith('http') ? d.ruta_almacen : API.urlDocumento(d.nombre_archivo)}" target="_blank" class="btn btn-outline btn-sm">👁 Ver/Descargar</a>
                ${canEdit?`<button class="btn btn-danger-outline btn-sm" onclick="Views.deleteDoc('${d.id}','${id}')">🗑</button>`:''}
              </div>
            </div>`).join('')
            : '<div class="empty-state" style="padding:20px"><div class="empty-icon" style="font-size:28px">📂</div><div class="text-muted">Sin documentos generales</div></div>'}
          </div>
        </div>`;

      setTopbar(f.nombres+' '+f.apellidos, `DNI: ${f.dni} · Registrado: ${fmtFecha(f.creado_en?.split('T')[0])}`,
        `${canEdit?`<button class="btn btn-outline btn-sm" onclick="App.navigate('nuevo-feligres','${id}')">✏️ Editar</button>`:''}
         <button class="btn btn-gold btn-sm" onclick="App.navigate('constancias','${id}')">📜 Constancia</button>`
      );

      setContent(`<div class="content-area">
        <div class="profile-hero">
          <div class="avatar avatar-lg">${initiales(f.nombres,f.apellidos)}</div>
          <div style="flex:1">
            <div class="ph-name">${esc(f.nombres+' '+f.apellidos)}</div>
            <div class="ph-meta">DNI: ${esc(f.dni)} ${f.dni_verificado?'<span class="badge badge-green" style="font-size:10px">✓ RENIEC</span>':''} · ${calcEdad(f.fecha_nacimiento)} años · ${f.sexo==='F'?'Femenino':'Masculino'}</div>
            <div class="ph-meta">📞 ${esc(f.telefono||'—')} · ✉️ ${esc(f.email||'—')}</div>
            <div class="ph-meta">📍 ${esc(f.direccion||'—')}</div>
            <div class="ph-tags">
              <span class="badge ${f.activo?'badge-green':'badge-gray'}">${f.activo?'Activo':'Inactivo'}</span>
              <span class="badge badge-gold">${(f.sacramentos||[]).length} Sacramentos</span>
              ${f.ocupacion?`<span class="tag">💼 ${esc(f.ocupacion)}</span>`:''}
            </div>
          </div>
        </div>
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab(event,'tabSac')">✝️ Sacramentos</button>
          <button class="tab-btn" onclick="switchTab(event,'tabDocs')">📁 Documentos</button>
          <button class="tab-btn" onclick="switchTab(event,'tabDatos')">📋 Datos</button>
        </div>
        <div id="tabSac" class="tab-content active">
          <div class="sac-grid">${sacCards}</div>
          ${sacRows?`<div class="card"><div class="card-header"><div class="card-title">Detalle</div></div>
            <div class="table-wrap"><table><thead><tr><th>Sacramento</th><th>Fecha</th><th>Parroquia</th><th>Referencia</th><th>Documentos</th><th></th></tr></thead>
            <tbody>${sacRows}</tbody></table></div></div>`:''}
        </div>
        <div id="tabDocs" class="tab-content">${docsHtml}</div>
        <div id="tabDatos" class="tab-content">
          <div class="card card-accent"><div class="card-body"><div class="form-grid form-3">
            ${[['Nombres',f.nombres],['Apellidos',f.apellidos],['DNI',f.dni],
               ['Nacimiento',fmtFecha(f.fecha_nacimiento?.split('T')[0])],['Edad',calcEdad(f.fecha_nacimiento)+' años'],['Sexo',f.sexo==='F'?'Femenino':'Masculino'],
               ['Estado Civil',f.estado_civil||'—'],['Ocupación',f.ocupacion||'—'],['Nacionalidad',f.nacionalidad||'—'],
               ['Teléfono',f.telefono||'—'],['Email',f.email||'—'],['Parroquia Origen',f.parroquia_origen||'—'],
               ['Dirección',f.direccion||'—','full'],
              ].map(([l,v,cls])=>`<div ${cls?'style="grid-column:1/-1"':''}>
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:2px">${l}</div>
                <div style="font-size:14px;font-weight:600;color:var(--navy)">${esc(v||'—')}</div>
              </div>`).join('')}
          </div></div></div>
        </div>
      </div>`);

      // Setup drop zone
      setupDropZone(id);

    } catch(e) { showError(e.message); }
  }

  // ── MODAL SACRAMENTO ──────────────────────────
  async function openSacModal(feligresId, sacKey, sacId) {
    const canEdit = App.canEdit();
    const info = SAC_INFO[sacKey];
    let reg = {};
    let docs = [];

    if (sacId) {
      try {
        const f = await API.getFeligres(feligresId);
        reg = (f.sacramentos||[]).find(s=>s.id===sacId) || {};
        docs = (f.documentos||[]).filter(d=>d.sacramento_id===sacId);
      } catch(e) {}
    }

    const isMatrimonio = sacKey === 'matrimonio';
    const needsPad = ['bautismo','confirmacion','eucaristia'].includes(sacKey);

    // Build feligres selects con búsqueda
    const selPad = buildSearchSelect('sacPadrino', reg.padrino_id||'', reg.padrino_nombres ? reg.padrino_nombres+' '+reg.padrino_apellidos : '', 'Buscar padrino...', feligresId);
    const selMad = buildSearchSelect('sacMadrina', reg.madrina_id||'', reg.madrina_nombres ? reg.madrina_nombres+' '+reg.madrina_apellidos : '', 'Buscar madrina...', feligresId);
    const selCon = buildSearchSelect('sacConyuge', reg.conyuge_id||'', reg.conyuge_nombres ? reg.conyuge_nombres+' '+reg.conyuge_apellidos : '', 'Buscar cónyuge...', feligresId);

    const docsHtml = `<div id="sacDocsList">${renderDocsList(docs, feligresId, sacKey, sacId, canEdit)}</div>`);

Modal.open(`
      <div class="modal-header">
        <div class="modal-title">${info.emoji} ${info.label} — Feligrés</div>
        <button class="modal-close" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        ${!canEdit?'<div class="alert alert-warn">Solo lectura.</div>':''}
        <div class="form-section">
          <div class="form-section-title">📅 Datos del Sacramento</div>
          <div class="form-grid form-2">
            <div class="form-group"><label>Fecha <span class="req">*</span></label>
              <input type="date" id="sacFecha" value="${reg.fecha?.split('T')[0]||''}" ${!canEdit?'disabled':''} max="${hoy()}"/></div>
            <div class="form-group"><label>Parroquia</label>
              <input type="text" id="sacParroquia" value="${esc(reg.parroquia||'')}" ${!canEdit?'disabled':''}/></div>
            <div class="form-group"><label>Libro</label><input type="text" id="sacLibro" value="${esc(reg.libro||'')}" placeholder="Ej: 12" ${!canEdit?'disabled':''}/></div>
            <div class="form-group"><label>Folio</label><input type="text" id="sacFolio" value="${esc(reg.folio||'')}" placeholder="Ej: 45" ${!canEdit?'disabled':''}/></div>
            <div class="form-group"><label>N° Partida</label><input type="text" id="sacPartida" value="${esc(reg.partida||'')}" placeholder="Ej: 123" ${!canEdit?'disabled':''}/></div>
          </div>
        </div>
        ${needsPad?`
        <div class="form-section">
          <div class="form-section-title">👤 Padrinos (del directorio parroquial)</div>
          <div class="form-grid form-2">
            <div class="form-group"><label>Padrino</label>${canEdit?selPad:`<input disabled value="${esc((reg.padrino_nombres||'')+(reg.padrino_apellidos?' '+reg.padrino_apellidos:''))||'—'}"/>`}</div>
            <div class="form-group"><label>Madrina</label>${canEdit?selMad:`<input disabled value="${esc((reg.madrina_nombres||'')+(reg.madrina_apellidos?' '+reg.madrina_apellidos:''))||'—'}"/>`}</div>
          </div>
        </div>`:''}
        ${isMatrimonio?`
        <div class="form-section">
          <div class="form-section-title">💍 Cónyuge</div>
          <div class="form-group">${canEdit?selCon:`<input disabled value="${esc((reg.conyuge_nombres||'')+(reg.conyuge_apellidos?' '+reg.conyuge_apellidos:''))||'—'}"/>`}</div>
        </div>`:''}
        <div class="form-section">
          <div class="form-section-title">📝 Notas</div>
          <div class="form-group"><textarea id="sacNotas" ${!canEdit?'disabled':''}>${esc(reg.notas||'')}</textarea></div>
        </div>
        <div class="form-section">
          <div class="form-section-title">📎 Documentos del Sacramento</div>
          ${docsHtml}
          ${canEdit?`
          <div class="drop-zone mt-2" id="sacDropZone" onclick="document.getElementById('sacFileInput').click()" style="margin-top:10px;padding:20px">
            <div class="drop-icon" style="font-size:24px">📄</div>
            <div class="drop-text" style="font-size:13px">Adjuntar documento escaneado</div>
            <div class="drop-sub">PDF, JPG, PNG — Máx. 10MB</div>
          </div>
          <input type="file" id="sacFileInput" accept=".pdf,.jpg,.jpeg,.png" style="display:none"
            onchange="Views.uploadSacDoc('${feligresId}','${sacKey}',${sacId?`'${sacId}'`:'null'},event)"/>`:''}
        </div>
      </div>
      ${canEdit?`<div class="modal-footer">
        <button class="btn btn-outline" onclick="Modal.close()">Cancelar</button>
        ${sacId?`<button class="btn btn-danger-outline" onclick="Views.deleteSac('${sacId}','${feligresId}')">🗑 Eliminar</button>`:''}
        <button class="btn btn-gold" onclick="Views.saveSac('${feligresId}','${sacKey}',${sacId?`'${sacId}'`:'null'})">💾 Guardar</button>
      </div>`:`<div class="modal-footer"><button class="btn btn-outline" onclick="Modal.close()">Cerrar</button></div>`}
    `, 'modal-lg');
  }

  function buildSearchSelect(id, value, label, placeholder, excludeId) {
    return `<div class="search-select-wrap" id="wrap_${id}">
      <input type="hidden" id="${id}_val" value="${esc(value)}"/>
      <input type="text" id="${id}_search" value="${esc(label)}" placeholder="${placeholder}"
        oninput="Views.searchPadrino('${id}','${excludeId}',this.value)"
        onfocus="Views.showPadrinoDropdown('${id}','${excludeId}',this.value)"
        autocomplete="off"/>
      <div id="${id}_dropdown" class="search-dropdown" style="display:none"></div>
    </div>`;
  }

  let _padSearchTimers = {};
  async function searchPadrino(id, excludeId, q) {
    clearTimeout(_padSearchTimers[id]);
    document.getElementById(id+'_val').value = '';
    _padSearchTimers[id] = setTimeout(async () => {
      try {
        const list = await API.buscarPadrinos(q, excludeId);
        showDropdown(id, list);
      } catch(e) {}
    }, 250);
  }
  async function showPadrinoDropdown(id, excludeId, q) {
    try {
      const list = await API.buscarPadrinos(q || '', excludeId);
      showDropdown(id, list);
    } catch(e) {}
  }
  function showDropdown(id, list) {
    const dd = document.getElementById(id+'_dropdown');
    if (!dd) return;
    if (!list.length) { dd.style.display='none'; return; }
    dd.innerHTML = list.map(f=>`
      <div class="search-dropdown-item" onclick="Views.selectPadrino('${id}','${f.id}','${esc(f.nombres+' '+f.apellidos)}')">
        <strong>${esc(f.nombres+' '+f.apellidos)}</strong> — DNI: ${esc(f.dni)}
      </div>`).join('');
    dd.style.display = 'block';
    // Cerrar al hacer clic fuera
    setTimeout(()=>{ document.addEventListener('click', ()=>{ dd.style.display='none'; }, {once:true}); }, 10);
  }
  function selectPadrino(id, val, label) {
    const inp = document.getElementById(id+'_val'); if(inp) inp.value = val;
    const srch = document.getElementById(id+'_search'); if(srch) srch.value = label;
    const dd = document.getElementById(id+'_dropdown'); if(dd) dd.style.display='none';
  }

  async function saveSac(feligresId, sacKey, sacId) {
    const fecha = document.getElementById('sacFecha')?.value;
    if (!fecha) { Toast.show('La fecha es obligatoria', 'error'); return; }

    const data = {
      feligres_id: feligresId,
      tipo: sacKey,
      fecha,
      parroquia: document.getElementById('sacParroquia')?.value || '',
      libro:     document.getElementById('sacLibro')?.value || '',
      folio:     document.getElementById('sacFolio')?.value || '',
      partida:   document.getElementById('sacPartida')?.value || '',
      padrino_id: document.getElementById('sacPadrino_val')?.value || null,
      madrina_id: document.getElementById('sacMadrina_val')?.value || null,
      conyuge_id: document.getElementById('sacConyuge_val')?.value || null,
      notas:     document.getElementById('sacNotas')?.value || '',
    };

    try {
      await API.guardarSacramento(data);
      Modal.close();
      Toast.show(`${SAC_INFO[sacKey].label} guardado ✓`);
      App.navigate('perfil', feligresId);
    } catch(e) { Toast.show(e.message, 'error'); }
  }

  async function deleteSac(sacId, feligresId) {
    Modal.close();
    setTimeout(() => {
      confirm('¿Eliminar este registro de sacramento?', async () => {
        try {
          await API.eliminarSacramento(sacId);
          Toast.show('Sacramento eliminado', 'info');
          App.navigate('perfil', feligresId);
        } catch(e) { Toast.show(e.message, 'error'); }
      });
    }, 100);
  }

  async function uploadDoc(feligresId, event) {
    const file = event.target.files[0];
    if (!file) return;
    const cat = document.getElementById('docCategoria')?.value || 'General';
    Toast.show('Subiendo archivo...', 'info');
    try {
      await API.subirDocumento(feligresId, file, cat, null);
      Toast.show(`"${file.name}" subido ✓`);
      App.navigate('perfil', feligresId);
    } catch(e) { Toast.show(e.message, 'error'); }
  }

  async function uploadSacDoc(feligresId, sacKey, sacId, event) {
    const file = event.target.files[0];
    if (!file) return;
    Toast.show('Adjuntando documento...', 'info');
    try {
      await API.subirDocumento(feligresId, file, SAC_INFO[sacKey]?.label||sacKey, sacId);
      Toast.show(`Documento adjuntado ✓`);
      // Recargar docs dentro del modal sin cerrarlo
      const canEdit = App.canEdit();
      const f = await API.getFeligres(feligresId);
      const docs = (f.documentos||[]).filter(d => d.sacramento_id === sacId);
      const listEl = document.getElementById('sacDocsList');
      if (listEl) listEl.innerHTML = renderDocsList(docs, feligresId, sacKey, sacId, canEdit);
      const inp = document.getElementById('sacFileInput');
      if (inp) inp.value = '';
    } catch(e) { Toast.show(e.message, 'error'); }
  }

  function renderDocsList(docs, feligresId, sacKey, sacId, canEdit) {
    if (!docs.length) return '<div class="text-muted" style="font-size:12px">Sin documentos adjuntos</div>';
    return docs.map(d => {
      const url = d.ruta_almacen && d.ruta_almacen.startsWith('http') ? d.ruta_almacen : API.urlDocumento(d.nombre_archivo);
      return `<div class="doc-item" style="margin-bottom:8px">
        <span class="doc-icon">${d.tipo_mime?.includes('pdf')?'📋':'🖼️'}</span>
        <div style="flex:1"><div class="doc-name">${esc(d.nombre_original)}</div><div class="doc-meta">${fmtSize(d.tamanio_bytes||0)}</div></div>
        <div class="doc-actions">
          <a href="${url}" target="_blank" class="btn btn-outline btn-xs">👁 Ver</a>
          ${canEdit?`<button class="btn btn-danger-outline btn-xs" onclick="Views.deleteDocModal('${d.id}','${feligresId}','${sacKey}',${sacId?`'${sacId}'`:'null'})">🗑</button>`:''}
        </div>
      </div>`;
    }).join('');
  }

  async function deleteDoc(docId, feligresId) {
    confirm('¿Eliminar este documento?', async () => {
      try { await API.eliminarDocumento(docId); Toast.show('Eliminado','info'); App.navigate('perfil', feligresId); }
      catch(e) { Toast.show(e.message,'error'); }
    });
  }
  async function deleteDocModal(docId, feligresId, sacKey, sacId) {
    try { await API.eliminarDocumento(docId); Toast.show('Documento eliminado','info'); Modal.close(); App.navigate('perfil', feligresId); }
    catch(e) { Toast.show(e.message,'error'); }
  }

  function setupDropZone(feligresId) {
    const dz = document.getElementById('docDropZone');
    if (!dz) return;
    dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', ()=>dz.classList.remove('drag-over'));
    dz.addEventListener('drop', async e=>{
      e.preventDefault(); dz.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        const cat = document.getElementById('docCategoria')?.value || 'General';
        try { await API.subirDocumento(feligresId, file, cat, null); Toast.show(`"${file.name}" subido ✓`); App.navigate('perfil', feligresId); }
        catch(ex) { Toast.show(ex.message, 'error'); }
      }
    });
  }

  // ══════════════════════════════════════════
  // SACRAMENTOS VIEW
  // ══════════════════════════════════════════
  async function sacramentos(filtro='bautismo') {
    setTopbar('Registro de Sacramentos','');
    setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);
    try {
      const list = await API.getSacramentos(filtro);
      const info = SAC_INFO[filtro];

      const tabs = SAC_ORDER.map(k=>`<button class="tab-btn ${filtro===k?'active':''}" onclick="App.navigate('sacramentos','${k}')">
        ${SAC_INFO[k].emoji} ${SAC_INFO[k].label}
      </button>`).join('');

      const rows = list.map(s=>`<tr>
        <td><div class="flex-gap"><div class="avatar">${initiales(s.nombres,s.apellidos)}</div>
          <div><div style="font-weight:700">${esc(s.nombres+' '+s.apellidos)}</div><div class="text-muted">${esc(s.dni)}</div></div></div></td>
        <td>${fmtFecha(s.fecha?.split('T')[0])}</td>
        <td style="font-size:12px">${esc(s.parroquia||'—')}</td>
        <td style="font-size:12px">${filtro==='matrimonio'
          ? esc((s.conyuge_nombres||'')+(s.conyuge_apellidos?' '+s.conyuge_apellidos:''))||'—'
          : [s.padrino_nombres&&(s.padrino_nombres+' '+s.padrino_apellidos), s.madrina_nombres&&(s.madrina_nombres+' '+s.madrina_apellidos)].filter(Boolean).join(' / ')||'—'}</td>
        <td style="font-size:11px;font-family:monospace">${[s.libro&&`L.${s.libro}`,s.folio&&`F.${s.folio}`,s.partida&&`P.${s.partida}`].filter(Boolean).join(' ')||'—'}</td>
        <td>${parseInt(s.total_docs)>0?`<span class="badge badge-green">📎 ${s.total_docs}</span>`:'<span class="badge badge-gray">Sin doc.</span>'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="App.navigate('perfil','${s.feligres_id}')">Perfil</button></td>
      </tr>`).join('');

      setTopbar('Registro de Sacramentos', `${info.emoji} ${info.label} — ${list.length} registros`);
      setContent(`<div class="content-area">
        <div class="tabs" style="flex-wrap:wrap">${tabs}</div>
        <div class="card">
          ${list.length
            ? `<div class="table-wrap"><table>
                <thead><tr><th>Feligrés</th><th>Fecha</th><th>Parroquia</th><th>${filtro==='matrimonio'?'Cónyuge':'Padrinos'}</th><th>Referencia</th><th>Docs</th><th></th></tr></thead>
                <tbody>${rows}</tbody></table></div>`
            : `<div class="empty-state"><div class="empty-icon">${info.emoji}</div><div class="empty-title">Sin registros de ${info.label}</div></div>`}
        </div>
      </div>`);
    } catch(e) { showError(e.message); }
  }

  // ══════════════════════════════════════════
  // DOCUMENTOS REPOSITORIO
  // ══════════════════════════════════════════
  async function documentos() {
    setTopbar('Repositorio de Documentos','');
    setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);
    try {
      const list = await API.getDocumentos();
      const rows = list.map(d=>`<tr>
        <td><div class="flex-gap">
          <span style="font-size:24px">${d.tipo_mime?.includes('pdf')?'📋':'🖼️'}</span>
          <div><div style="font-weight:600;font-size:13px">${esc(d.nombre_original)}</div><div class="text-muted">${esc(d.categoria||'General')}</div></div>
        </div></td>
        <td><button class="btn btn-ghost btn-sm" onclick="App.navigate('perfil','${d.feligres_id}')">${esc(d.nombres+' '+d.apellidos)}</button></td>
        <td style="font-family:monospace;font-size:12px">${esc(d.dni)}</td>
        <td><span class="badge badge-blue">${esc(d.sacramento_tipo||'General')}</span></td>
        <td class="text-muted">${fmtFecha(d.subido_en?.split('T')[0])}</td>
        <td>${fmtSize(d.tamanio_bytes||0)}</td>
        <td><a href="${API.urlDocumento(d.nombre_archivo)}" target="_blank" class="btn btn-outline btn-sm">⬇ Ver</a></td>
      </tr>`).join('');
      setTopbar('Repositorio de Documentos', `${list.length} documentos en el archivo parroquial`);
      setContent(`<div class="content-area">
        ${list.length
          ? `<div class="card"><div class="table-wrap"><table>
              <thead><tr><th>Documento</th><th>Feligrés</th><th>DNI</th><th>Origen</th><th>Fecha</th><th>Tamaño</th><th></th></tr></thead>
              <tbody>${rows}</tbody></table></div></div>`
          : `<div class="empty-state card"><div class="empty-icon">📁</div><div class="empty-title">Repositorio vacío</div></div>`}
      </div>`);
    } catch(e) { showError(e.message); }
  }

  // ══════════════════════════════════════════
  // CONSTANCIAS
  // ══════════════════════════════════════════
  async function constancias(preselId='') {
    const sacOpts = SAC_ORDER.map(k=>`<option value="${k}">${SAC_INFO[k].emoji} ${SAC_INFO[k].label}</option>`).join('');
    setTopbar('Emitir Constancia', 'Generación de constancias de sacramentos');

    let feligresList = [];
    try { const r = await API.getFeligreses({ limit: 500 }); feligresList = r.data || []; } catch(e) {}
    const selOpts = feligresList.map(f=>`<option value="${f.id}" ${f.id===preselId?'selected':''}>${esc(f.nombres+' '+f.apellidos)} — ${esc(f.dni)}</option>`).join('');

    setContent(`<div class="content-area">
      <div style="display:grid;grid-template-columns:320px 1fr;gap:24px">
        <div class="card" style="align-self:start">
          <div class="card-header"><div class="card-title">⚙️ Configurar</div></div>
          <div class="card-body">
            <div class="form-group mb-2"><label>Feligrés</label>
              <select id="constFeligres" onchange="Views.previewConstancia()">
                <option value="">— Seleccionar —</option>${selOpts}
              </select></div>
            <div class="form-group mb-2"><label>Sacramento</label>
              <select id="constSac" onchange="Views.previewConstancia()">${sacOpts}</select></div>
            <div class="form-group mb-3"><label>Propósito</label>
              <input type="text" id="constProp" placeholder="Ej: Para trámites civiles" oninput="Views.previewConstancia()"/></div>
            <button class="btn btn-primary btn-full" onclick="Views.previewConstancia()">👁 Vista Previa</button>
            <button class="btn btn-gold btn-full mt-1" onclick="window.print()">🖨️ Imprimir / PDF</button>
          </div>
        </div>
        <div id="constanciaArea">
          <div class="empty-state card"><div class="empty-icon">📜</div><div class="empty-title">Seleccione feligrés y sacramento</div></div>
        </div>
      </div>
    </div>`);

    if (preselId) setTimeout(Views.previewConstancia, 100);
  }

  async function previewConstancia() {
    const fId = document.getElementById('constFeligres')?.value;
    const sacKey = document.getElementById('constSac')?.value;
    const prop = document.getElementById('constProp')?.value || 'los fines que el interesado estime conveniente';
    const area = document.getElementById('constanciaArea');
    if (!fId || !area) return;

    try {
      const [f, cfg] = await Promise.all([API.getFeligres(fId), API.getConfig()]);
      const sacsMap = {};
      (f.sacramentos||[]).forEach(s=>{sacsMap[s.tipo]=s;});
      const reg = sacsMap[sacKey];
      const info = SAC_INFO[sacKey];
      const session = App.session;

      let body = '';
      if (!reg) {
        body = `<div class="alert alert-warn">Este feligrés no tiene registrado el sacramento de <strong>${info.label}</strong>.</div>`;
      } else {
        const refText = [reg.libro&&`Libro N° ${reg.libro}`, reg.folio&&`Folio ${reg.folio}`, reg.partida&&`Partida N° ${reg.partida}`].filter(Boolean).join(', ');
        let sacText = '';
        if (sacKey==='bautismo')
          sacText = `recibió el <strong>Sacramento del Bautismo</strong> el día <strong>${fmtFecha(reg.fecha?.split('T')[0])}</strong>, en la ${esc(reg.parroquia||cfg.parroquia||'')}${reg.padrino_nombres?`, siendo padrino(s): <strong>${esc(reg.padrino_nombres+' '+reg.padrino_apellidos)}</strong>`:''}.`;
        else if (sacKey==='matrimonio')
          sacText = `contrajo <strong>Matrimonio Católico</strong> el día <strong>${fmtFecha(reg.fecha?.split('T')[0])}</strong>, en la ${esc(reg.parroquia||cfg.parroquia||'')}${reg.conyuge_nombres?`, con <strong>${esc(reg.conyuge_nombres+' '+reg.conyuge_apellidos)}</strong>`:''}.`;
        else
          sacText = `tiene registrado el <strong>Sacramento de ${info.label}</strong> el día <strong>${fmtFecha(reg.fecha?.split('T')[0])}</strong>, en la ${esc(reg.parroquia||cfg.parroquia||'')}.`;

        body = `<p class="const-body">
          El suscrito Párroco de la <strong>${esc(cfg.parroquia||'')}</strong>, ${esc(cfg.diocesis||'')}, hace constar que:<br/><br/>
          <strong>${esc(f.nombres+' '+f.apellidos)}</strong>, identificado(a) con DNI N° <strong>${esc(f.dni)}</strong>
          ${f.fecha_nacimiento?`, nacido(a) el <strong>${fmtFecha(f.fecha_nacimiento?.split('T')[0])}</strong>`:''}, ${sacText}<br/><br/>
          ${refText?`Lo cual consta en los archivos parroquiales: <strong>${esc(refText)}</strong>.<br/><br/>`:''}
          La presente constancia se expide a solicitud del interesado, para <strong>${esc(prop)}</strong>.<br/><br/>
          Se expide en Lima, a los ${new Date().getDate()} días del mes de ${new Date().toLocaleString('es-PE',{month:'long'})} del año ${new Date().getFullYear()}.
        </p>`;
      }

      area.innerHTML = `<div class="constancia-preview">
        <div class="const-header">
          <div class="const-cross">✝</div>
          <div class="const-parish">${esc(cfg.parroquia||'')}</div>
          <div class="const-diocese">${esc(cfg.diocesis||'')} · ${esc(cfg.direccion||'')}</div>
          <div class="const-diocese">Tel: ${esc(cfg.telefono||'')} · ${esc(cfg.email||'')}</div>
        </div>
        <div class="const-title">Constancia de ${info?.label||''}</div>
        ${body}
        ${reg?`<div class="const-footer"><div class="const-sign"><div class="const-sign-line">${esc(cfg.parroco||'')}<br/><small>Párroco</small></div></div></div>`:''}
      </div>`;
    } catch(e) { area.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`; }
  }

  // ══════════════════════════════════════════
  // AGENDA
  // ══════════════════════════════════════════
  async function agenda() {
    const canEdit = App.canEdit();
    setTopbar('Agenda Litúrgica','');
    setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);
    try {
      const list = await API.getAgenda();
      list.sort((a,b)=>a.fecha.localeCompare(b.fecha));
      const items = list.map(e=>`<div class="agenda-event">
        <div class="event-date-box"><div class="event-day">${e.fecha.split('-')[2]}</div><div class="event-month">${mesCorto(e.fecha)}</div></div>
        <div class="event-info"><div class="event-type">${esc(e.tipo)}</div><div class="event-title">${esc(e.titulo)}</div>
          <div class="event-sub">🕐 ${esc(e.hora||'')} · 📍 ${esc(e.lugar||'')} · 👤 ${esc(e.celebrante||'')}</div></div>
        <div class="flex-gap">
          <span class="badge ${e.fecha>=hoy()?'badge-green':'badge-gray'}">${e.fecha>=hoy()?'Próximo':'Pasado'}</span>
          ${canEdit?`<button class="btn btn-ghost btn-sm" onclick="Views.deleteEvento('${e.id}')">🗑</button>`:''}
        </div>
      </div>`).join('');
      setTopbar('Agenda Litúrgica', `${list.length} eventos`,
        canEdit?`<button class="btn btn-primary" onclick="Views.addEventoModal()">+ Nuevo Evento</button>`:''
      );
      setContent(`<div class="content-area">${items||'<div class="empty-state card"><div class="empty-icon">📅</div><div class="empty-title">Sin eventos</div></div>'}</div>`);
    } catch(e) { showError(e.message); }
  }

  function addEventoModal() {
    const tipos = ['Misa','Bautismo','Matrimonio','Confirmación','Unción','Catequesis','Reunión','Otro'];
    Modal.open(`
      <div class="modal-header"><div class="modal-title">📅 Nuevo Evento</div><button class="modal-close" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-grid form-2">
          <div class="form-group"><label>Tipo <span class="req">*</span></label><select id="evTipo">${tipos.map(t=>`<option>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label>Fecha <span class="req">*</span></label><input type="date" id="evFecha" value="${hoy()}"/></div>
          <div class="form-group"><label>Hora</label><input type="time" id="evHora" value="10:00"/></div>
          <div class="form-group"><label>Lugar</label><input type="text" id="evLugar" value="Iglesia principal"/></div>
          <div class="form-group full"><label>Título <span class="req">*</span></label><input type="text" id="evTitulo" placeholder="Ej: Misa del Domingo"/></div>
          <div class="form-group full"><label>Celebrante</label><input type="text" id="evCelebrante"/></div>
          <div class="form-group full"><label>Descripción</label><textarea id="evDesc"></textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Views.saveEvento()">💾 Guardar</button>
      </div>`, 'modal-sm');
  }
  async function saveEvento() {
    const g=id=>document.getElementById(id)?.value||'';
    const tipo=g('evTipo'),fecha=g('evFecha'),titulo=g('evTitulo');
    if(!fecha||!titulo){Toast.show('Fecha y título requeridos','error');return;}
    try {
      await API.crearEvento({tipo,fecha,hora:g('evHora'),lugar:g('evLugar'),titulo,celebrante:g('evCelebrante'),descripcion:g('evDesc')});
      Modal.close(); Toast.show('Evento creado ✓'); App.navigate('agenda');
    } catch(e){Toast.show(e.message,'error');}
  }
  async function deleteEvento(id) {
    confirm('¿Eliminar este evento?', async()=>{
      try{await API.eliminarEvento(id);Toast.show('Evento eliminado','info');App.navigate('agenda');}
      catch(e){Toast.show(e.message,'error');}
    });
  }

  // ══════════════════════════════════════════
  // REPORTES
  // ══════════════════════════════════════════
  async function reportes() {
    setTopbar('Reportes y Estadísticas', 'Resumen del archivo parroquial',
      `<button class="btn btn-outline btn-sm" onclick="window.print()">🖨️ Imprimir</button>`);
    setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);
    try {
      const rep = await API.getReportes();
      const sacBars = SAC_ORDER.map(k=>{
        const info=SAC_INFO[k], row=rep.porSacramento?.find(r=>r.tipo===k), cnt=parseInt(row?.total||0);
        const pct = rep.totales.total_feligreses>0?Math.round(cnt/rep.totales.total_feligreses*100):0;
        return `<div class="report-bar-row">
          <div class="report-bar-header"><span class="report-bar-label">${info.emoji} ${info.label}</span><span class="report-bar-count">${cnt} (${pct}%)</span></div>
          <div class="report-bar-bg"><div class="report-bar-fill" style="width:${pct}%;background:${info.color}"></div></div>
        </div>`;
      }).join('');

      const estadoBars = (rep.porEstado||[]).map(e=>{
        const pct=rep.totales.total_feligreses>0?Math.round(e.total/rep.totales.total_feligreses*100):0;
        return `<div class="report-bar-row">
          <div class="report-bar-header"><span>${esc(e.estado_civil||'No especificado')}</span><span class="report-bar-count">${e.total}</span></div>
          <div class="report-bar-bg"><div class="report-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');

      const sexoM = rep.porSexo?.find(s=>s.sexo==='M')?.total||0;
      const sexoF = rep.porSexo?.find(s=>s.sexo==='F')?.total||0;

      setContent(`<div class="content-area">
        <div class="stats-grid">
          ${[['👥','Feligreses',rep.totales.total_feligreses],['✅','Activos',rep.totales.activos],['📎','Documentos',rep.totales.total_documentos],['✝️','Sacramentos',rep.totales.total_sacramentos]].map(([ic,lb,v])=>`
            <div class="stat-card"><div class="stat-icon">${ic}</div><div class="stat-label">${lb}</div><div class="stat-value">${v}</div></div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
          <div class="card"><div class="card-header"><div class="card-title">Sacramentos</div></div><div class="card-body">${sacBars}</div></div>
          <div class="card"><div class="card-header"><div class="card-title">Estado Civil</div></div><div class="card-body">${estadoBars||'<div class="text-muted">Sin datos</div>'}</div></div>
          <div class="card">
            <div class="card-header"><div class="card-title">Género</div></div>
            <div class="card-body" style="text-align:center">
              <div style="display:flex;justify-content:center;gap:24px;margin-bottom:20px">
                ${[['♂️','Masculino',sexoM,'var(--navy)'],['♀️','Femenino',sexoF,'var(--burgundy)']].map(([ic,lb,v,c])=>`
                  <div><div style="font-size:28px">${ic}</div>
                    <div style="font-family:var(--font-serif);font-size:28px;color:${c};font-weight:700">${v}</div>
                    <div class="text-muted">${lb}</div></div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>`);
    } catch(e) { showError(e.message); }
  }

  // ══════════════════════════════════════════
  // CONFIGURACIÓN
  // ══════════════════════════════════════════
  async function config() {
    if (!App.isParroco()) {
      setContent(`<div class="content-area"><div class="alert alert-warn">⚠️ Solo el párroco puede acceder a la configuración.</div></div>`);
      return;
    }
    setTopbar('Configuración', 'Administración del sistema');
    setContent(`<div style="display:flex;justify-content:center;padding:60px"><div class="spinner"></div></div>`);
    try {
      const [cfg, usuarios] = await Promise.all([API.getConfig(), API.getUsuarios()]);
      const usrRows = usuarios.map(u=>`<tr>
        <td>${esc(u.nombre)}</td>
        <td style="font-family:monospace">${esc(u.username)}</td>
        <td><span class="badge ${u.rol==='parroco'?'badge-burg':u.rol==='secretaria'?'badge-blue':'badge-gray'}">${esc(u.rol)}</span></td>
        <td><span class="badge ${u.activo?'badge-green':'badge-gray'}">${u.activo?'Activo':'Inactivo'}</span></td>
        <td>${u.ultimo_login?fmtFecha(u.ultimo_login?.split('T')[0]):'Nunca'}</td>
        <td>${u.rol!=='parroco'?`<button class="btn btn-ghost btn-sm" onclick="Views.resetPassModal('${u.id}')">🔑</button>`:''}</td>
      </tr>`).join('');

      setTopbar('Configuración', 'Administración del sistema',
        `<button class="btn btn-primary" onclick="Views.saveConfig()">💾 Guardar</button>`);
      setContent(`<div class="content-area">
        <div class="card mb-3 card-accent">
          <div class="card-header"><div class="card-title">🏛️ Datos de la Parroquia</div></div>
          <div class="card-body">
            <div class="form-grid form-2">
              ${[['cfgParroquia','Nombre de la Parroquia',cfg.parroquia],['cfgDiocesis','Diócesis',cfg.diocesis],
                 ['cfgParroco','Párroco',cfg.parroco],['cfgVicario','Vicario',cfg.vicario||''],
                 ['cfgTelefono','Teléfono',cfg.telefono],['cfgEmail','Email',cfg.email]].map(([id,lbl,val])=>`
                <div class="form-group"><label>${lbl}</label><input type="text" id="${id}" value="${esc(val||'')}"/></div>`).join('')}
              <div class="form-group full"><label>Dirección</label><input type="text" id="cfgDireccion" value="${esc(cfg.direccion||'')}"/></div>
              <div class="form-group"><label>Web</label><input type="text" id="cfgWeb" value="${esc(cfg.web||'')}"/></div>
              <div class="form-group"><label>RUC</label><input type="text" id="cfgRuc" value="${esc(cfg.ruc||'')}"/></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">👤 Usuarios del Sistema</div>
            <button class="btn btn-outline btn-sm" onclick="Views.nuevoUsuarioModal()">+ Nuevo Usuario</button>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Último Login</th><th></th></tr></thead>
            <tbody>${usrRows}</tbody></table></div>
        </div>
      </div>`);
    } catch(e) { showError(e.message); }
  }

  async function saveConfig() {
    const g=id=>document.getElementById(id)?.value||'';
    try {
      await API.guardarConfig({parroquia:g('cfgParroquia'),diocesis:g('cfgDiocesis'),parroco:g('cfgParroco'),vicario:g('cfgVicario'),telefono:g('cfgTelefono'),email:g('cfgEmail'),direccion:g('cfgDireccion'),web:g('cfgWeb'),ruc:g('cfgRuc')});
      Toast.show('Configuración guardada ✓');
    } catch(e){Toast.show(e.message,'error');}
  }

  function resetPassModal(userId) {
    Modal.open(`
      <div class="modal-header"><div class="modal-title">🔑 Cambiar Contraseña</div><button class="modal-close" onclick="Modal.close()">✕</button></div>
      <div class="modal-body"><div class="form-group"><label>Nueva contraseña</label><input type="password" id="newPass" placeholder="Mínimo 6 caracteres"/></div></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Views._doResetPass('${userId}')">Guardar</button>
      </div>`, 'modal-sm');
  }
  async function _doResetPass(userId) {
    const pass=document.getElementById('newPass')?.value;
    if(!pass||pass.length<6){Toast.show('Mínimo 6 caracteres','error');return;}
    try{await API.resetPassword(userId,pass);Modal.close();Toast.show('Contraseña actualizada ✓');}
    catch(e){Toast.show(e.message,'error');}
  }

  function nuevoUsuarioModal() {
    Modal.open(`
      <div class="modal-header"><div class="modal-title">👤 Nuevo Usuario</div><button class="modal-close" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-grid form-2">
          <div class="form-group"><label>Nombre completo</label><input type="text" id="nuNombre"/></div>
          <div class="form-group"><label>Usuario</label><input type="text" id="nuUser" placeholder="minúsculas, sin espacios"/></div>
          <div class="form-group"><label>Contraseña</label><input type="password" id="nuPass" placeholder="Mínimo 6 caracteres"/></div>
          <div class="form-group"><label>Rol</label><select id="nuRol"><option value="secretaria">Secretaria</option><option value="consulta">Solo Lectura</option></select></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Views._doNuevoUsuario()">Crear</button>
      </div>`, 'modal-sm');
  }
  async function _doNuevoUsuario() {
    const g=id=>document.getElementById(id)?.value?.trim()||'';
    const nombre=g('nuNombre'),username=g('nuUser'),password=g('nuPass'),rol=g('nuRol');
    if(!nombre||!username||!password){Toast.show('Todos los campos son requeridos','error');return;}
    try{await API.crearUsuario({nombre,username,password,rol});Modal.close();Toast.show('Usuario creado ✓');App.navigate('config');}
    catch(e){Toast.show(e.message,'error');}
  }

  // ── HELPERS UI ─────────────────────────────────
  function setTopbar(title, sub='', actions='') {
    const tb = document.getElementById('topbarContainer');
    if (!tb) return;
    tb.innerHTML = `
      <div class="topbar">
        <div class="topbar-left">
          <div><div class="topbar-title">${esc(title)}</div>${sub?`<div class="topbar-sub">${sub}</div>`:''}</div>
        </div>
        <div class="topbar-right">${actions}</div>
      </div>`;
  }
  function setContent(html) {
    const c = document.getElementById('mainContent');
    if (c) c.innerHTML = html;
  }
  function showError(msg) {
    setContent(`<div class="content-area"><div class="alert alert-error">❌ ${esc(msg)}</div></div>`);
  }

  window.switchTab = function(e, tabId) {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
  };

  return {
    dashboard, feligreses, formFeligres, saveFeligresForm,
    validarRENIEC, perfil,
    openSacModal, saveSac, deleteSac, uploadDoc, uploadSacDoc, deleteDoc, deleteDocModal,
    searchPadrino, showPadrinoDropdown, selectPadrino,
    sacramentos, documentos, constancias, previewConstancia,
    agenda, addEventoModal, saveEvento, deleteEvento,
    reportes, config, saveConfig, resetPassModal, _doResetPass, nuevoUsuarioModal, _doNuevoUsuario,
  };
})();
