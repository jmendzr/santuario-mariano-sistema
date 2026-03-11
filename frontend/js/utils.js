/* ============================================
   UTILS.JS — Utilidades globales
   ============================================ */

// ── Fechas ────────────────────────────────────
function fmtFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}
function calcEdad(fecha) {
  if (!fecha) return '—';
  const hoy = new Date(), nac = new Date(fecha);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() - nac.getMonth() < 0 ||
      (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}
function hoy() {
  return new Date().toISOString().split('T')[0];
}
function fechaLarga() {
  return new Date().toLocaleDateString('es-PE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}
function mesCorto(f) {
  if (!f) return '';
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return meses[parseInt(f.split('-')[1]) - 1];
}

// ── Tamaño archivo ────────────────────────────
function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}

// ── Iniciales ─────────────────────────────────
function initiales(nombres, apellidos) {
  return ((nombres||'')[0]||'') + ((apellidos||'')[0]||'');
}

// ── ID único ──────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

// ── Toast ─────────────────────────────────────
const Toast = {
  _t: null,
  show(msg, type='success') {
    const el = document.getElementById('toast');
    el.textContent = ''; // clear
    const icons = { success:'✓', error:'✕', info:'ℹ' };
    el.innerHTML = `<span>${icons[type]||'✓'}</span> ${msg}`;
    el.className = `toast show ${type}`;
    clearTimeout(this._t);
    this._t = setTimeout(() => { el.classList.remove('show'); }, 3200);
  }
};

// ── Modal ─────────────────────────────────────
const Modal = {
  open(html, cls='') {
    const box = document.getElementById('modalBox');
    box.className = 'modal-box ' + cls;
    box.innerHTML = html;
    document.getElementById('modalOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  },
  close() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('modalBox').innerHTML = '';
    document.body.style.overflow = '';
  }
};

// ── Confirmación ──────────────────────────────
function confirm(msg, onOk, onCancel) {
  Modal.open(`
    <div class="modal-header">
      <div class="modal-title">⚠️ Confirmar acción</div>
      <button class="modal-close" onclick="Modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:15px;color:var(--slate);line-height:1.6">${msg}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="Modal.close();${onCancel||''}">Cancelar</button>
      <button class="btn btn-burg" onclick="Modal.close();(${onOk.toString()})()">Confirmar</button>
    </div>
  `, 'modal-sm');
}

// ── Escape HTML ───────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Feligrés nombre completo ──────────────────
function nombreCompleto(f) {
  if (!f) return '—';
  return `${f.nombres} ${f.apellidos}`;
}

// ── Select de feligreses ──────────────────────
function buildFeligresSelect(name, value='', label='Seleccionar feligrés', excludeId='') {
  const lista = DB.getFeligreses().filter(f => f.id !== excludeId && f.activo);
  const opts = lista.map(f =>
    `<option value="${f.id}" ${f.id===value?'selected':''}>${nombreCompleto(f)} — DNI: ${f.dni}</option>`
  ).join('');
  return `<select name="${name}" id="${name}">
    <option value="">${label}</option>
    ${opts}
  </select>`;
}

// ── Íconos sacramento ─────────────────────────
const SAC_INFO = {
  bautismo:      { label:'Bautismo',           emoji:'💧', color:'#4A90D9' },
  eucaristia:    { label:'Primera Comunión',   emoji:'✝️', color:'#D4A017' },
  confirmacion:  { label:'Confirmación',       emoji:'🕊️', color:'#7B68EE' },
  penitencia:    { label:'Confesión',          emoji:'🙏', color:'#6B8CAE' },
  matrimonio:    { label:'Matrimonio',         emoji:'💍', color:'#C0766A' },
  uncion:        { label:'Unción de Enfermos', emoji:'🕯️', color:'#8B7355' },
  ordenacion:    { label:'Ordenación',         emoji:'📿', color:'#5A8A6E' },
};
const SAC_ORDER = ['bautismo','eucaristia','confirmacion','penitencia','matrimonio','uncion','ordenacion'];

// ── Leer archivo como base64 ──────────────────
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve({ name:file.name, size:file.size, type:file.type, data:e.target.result, fecha:hoy() });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ── Generar QR placeholder (text-to-qr fake) ──
function qrPlaceholder(text) {
  return `<div class="qr-placeholder" title="${esc(text)}">
    <div>
      <div style="font-size:22px;margin-bottom:4px">▣</div>
      <div style="font-size:10px;line-height:1.3;text-align:center">QR Verificación<br/>Disponible en<br/>versión servidor</div>
    </div>
  </div>`;
}
