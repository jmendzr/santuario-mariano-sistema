/* ============================================
   api.js — Cliente HTTP para el backend
   ============================================ */

const API = (() => {
  const BASE = window.location.origin + '/api';

  function getToken() {
    return localStorage.getItem('pq_token');
  }

  function getHeaders(isFormData = false) {
    const h = { 'Authorization': `Bearer ${getToken()}` };
    if (!isFormData) h['Content-Type'] = 'application/json';
    return h;
  }

  async function request(method, path, body = null, isFormData = false) {
    const opts = {
      method,
      headers: getHeaders(isFormData),
    };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    try {
      const res = await fetch(BASE + path, opts);
      if (res.status === 401) {
        localStorage.removeItem('pq_token');
        localStorage.removeItem('pq_user');
        window.location.reload();
        return null;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        throw new Error('No se pudo conectar con el servidor. Verifique su conexión.');
      }
      throw err;
    }
  }

  // ── AUTH ────────────────────────────────────
  async function login(username, password) {
    const res = await fetch(BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    return data;
  }
  async function getMe() { return request('GET', '/auth/me'); }
  async function getUsuarios() { return request('GET', '/auth/usuarios'); }
  async function crearUsuario(data) { return request('POST', '/auth/usuarios', data); }
  async function resetPassword(userId, password_nuevo) { return request('PUT', `/auth/usuarios/${userId}/password`, { password_nuevo }); }
  async function cambiarPassword(password_actual, password_nuevo) { return request('PUT', '/auth/password', { password_actual, password_nuevo }); }

  // ── RENIEC ──────────────────────────────────
  async function consultarDNI(dni) { return request('GET', `/reniec/${dni}`); }

  // ── FELIGRESES ──────────────────────────────
  async function getFeligreses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/feligreses?${qs}`);
  }
  async function getFeligres(id) { return request('GET', `/feligreses/${id}`); }
  async function crearFeligres(data) { return request('POST', '/feligreses', data); }
  async function actualizarFeligres(id, data) { return request('PUT', `/feligreses/${id}`, data); }
  async function desactivarFeligres(id) { return request('DELETE', `/feligreses/${id}`); }
  async function buscarPadrinos(q, exclude = '') {
    return request('GET', `/feligreses/buscar/padrinos?q=${encodeURIComponent(q)}&exclude=${exclude}`);
  }

  // ── SACRAMENTOS ─────────────────────────────
  async function getSacramentos(tipo = '') {
    return request('GET', `/sacramentos${tipo ? '?tipo=' + tipo : ''}`);
  }
  async function guardarSacramento(data) { return request('POST', '/sacramentos', data); }
  async function eliminarSacramento(id) { return request('DELETE', `/sacramentos/${id}`); }

  // ── DOCUMENTOS ──────────────────────────────
  async function getDocumentos() { return request('GET', '/documentos'); }
  async function subirDocumento(feligresId, file, categoria, sacramentoId = null) {
    const form = new FormData();
    form.append('archivo', file);
    form.append('feligres_id', feligresId);
    form.append('categoria', categoria || 'General');
    if (sacramentoId) form.append('sacramento_id', sacramentoId);
    return request('POST', '/documentos/upload', form, true);
  }
  async function eliminarDocumento(id) { return request('DELETE', `/documentos/${id}`); }
  function urlDocumento(filename) { return `${BASE}/documentos/file/${filename}`; }

  // ── AGENDA ──────────────────────────────────
  async function getAgenda() { return request('GET', '/agenda'); }
  async function crearEvento(data) { return request('POST', '/agenda', data); }
  async function actualizarEvento(id, data) { return request('PUT', `/agenda/${id}`, data); }
  async function eliminarEvento(id) { return request('DELETE', `/agenda/${id}`); }

  // ── CONFIG ──────────────────────────────────
  async function getConfig() { return request('GET', '/config'); }
  async function guardarConfig(data) { return request('PUT', '/config', data); }

  // ── REPORTES ────────────────────────────────
  async function getReportes() { return request('GET', '/reportes'); }

  return {
    login, getMe, getUsuarios, crearUsuario, resetPassword, cambiarPassword,
    consultarDNI,
    getFeligreses, getFeligres, crearFeligres, actualizarFeligres, desactivarFeligres, buscarPadrinos,
    getSacramentos, guardarSacramento, eliminarSacramento,
    getDocumentos, subirDocumento, eliminarDocumento, urlDocumento,
    getAgenda, crearEvento, actualizarEvento, eliminarEvento,
    getConfig, guardarConfig,
    getReportes,
    getToken, BASE,
  };
})();
