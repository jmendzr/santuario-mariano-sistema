/* ============================================
   app.js — Controlador principal del frontend
   ============================================ */

const App = (() => {
  let session = null;
  let _searchTimer = null;

  async function init() {
    const token = localStorage.getItem('pq_token');
    const userData = localStorage.getItem('pq_user');
    if (token && userData) {
      try {
        session = JSON.parse(userData);
        showApp();
        navigate('dashboard');
      } catch(e) {
        localStorage.clear();
        showLogin();
      }
    } else {
      showLogin();
    }

    document.getElementById('loginPass').addEventListener('keydown', e => {
      if (e.key === 'Enter') login();
    });
  }

  async function login() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const err = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Iniciando sesión...';

    try {
      const res = await API.login(username, password);
      localStorage.setItem('pq_token', res.token);
      localStorage.setItem('pq_user', JSON.stringify(res.usuario));
      session = res.usuario;
      showApp();
      navigate('dashboard');
    } catch(e) {
      err.textContent = e.message || 'Error al iniciar sesión';
      err.style.display = 'block';
      document.getElementById('loginPass').value = '';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ingresar al Sistema';
    }
  }

  function logout() {
    localStorage.removeItem('pq_token');
    localStorage.removeItem('pq_user');
    session = null;
    showLogin();
  }

  function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
  }

  function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    document.getElementById('suName').textContent = session?.nombre || '';
    document.getElementById('suRole').textContent = session?.rol || '';
    document.getElementById('suAvatar').textContent = (session?.nombre||'U')[0];

    // Ocultar nav según rol
    if (!canEdit()) document.getElementById('navNuevoFeligres').style.display = 'none';
    if (session?.rol === 'consulta') document.getElementById('navConstancias').style.display = 'none';
    if (!isParroco()) document.getElementById('navConfig').style.display = 'none';
  }

  function navigate(view, param = '') {
    // Update nav
    document.querySelectorAll('.nav-link').forEach(l => {
      const isActive = l.dataset.view === view ||
        (view === 'perfil' && l.dataset.view === 'feligreses') ||
        (view === 'nuevo-feligres' && l.dataset.view === 'feligreses');
      l.classList.toggle('active', isActive);
    });

    // Route
    switch(view) {
      case 'dashboard':      Views.dashboard(); break;
      case 'feligreses':     Views.feligreses(); break;
      case 'nuevo-feligres': Views.formFeligres(param); break;
      case 'perfil':         Views.perfil(param); break;
      case 'sacramentos':    Views.sacramentos(param||'bautismo'); break;
      case 'constancias':    Views.constancias(param); break;
      case 'documentos':     Views.documentos(); break;
      case 'agenda':         Views.agenda(); break;
      case 'reportes':       Views.reportes(); break;
      case 'config':         Views.config(); break;
      default:               Views.dashboard();
    }

    document.getElementById('mainContent')?.scrollTo(0,0);
  }

  function debounceSearch(q) {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => Views.feligreses(q), 300);
  }

  function canEdit() { return session && ['parroco','secretaria'].includes(session.rol); }
  function isParroco() { return session?.rol === 'parroco'; }

  // Expose
  window.App = { init, login, logout, navigate, debounceSearch, session: null, canEdit, isParroco };

  // Proxy para acceder a session actualizado
  Object.defineProperty(window.App, 'session', {
    get: () => session,
  });

  return { init, login, logout, navigate, debounceSearch, canEdit, isParroco };
})();

document.addEventListener('DOMContentLoaded', App.init);
