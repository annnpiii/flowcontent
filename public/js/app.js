/* ============================
   ContentFlow â€” SPA Engine
   Fresh redesign â€” warm editorial + hot pink
   ============================ */

// ====== STATE ======
let currentUser = null;
let activeBrandId = null;
let currentPage = 'dashboard';
let calendarState = { view: 'month', currentDate: new Date(), status: '', filters: {} };
let selectedMonth = '';
let planPage = 1;
let planSort = 'upload_date';
let planStatus = '';
let planOrder = 'DESC';

// ====== UNIVERSAL SORT ======
let reportSort = 'posting_date';
let reportOrder = 'DESC';
let reportDateOrder = 'DESC';
let reportStatus = '';

function toggleSort(ctx) {
  const col = ctx === 'report' ? 'posting_date' : 'upload_date';
  if (ctx === 'report') {
    reportOrder = reportOrder === 'ASC' ? 'DESC' : 'ASC';
    navigate('report');
  }
}

function sortArrow(order) {
  return order === 'ASC' ? ' &#9650;' : ' &#9660;';
}
let selectedFolder = null;
let notifOpen = false;

// ====== GLOBAL SEARCH ======
let searchTimer = null;
function searchDebounce(q) {
  clearTimeout(searchTimer);
  const el = document.getElementById('searchResults');
  if (q.length < 2) { el.classList.add('hidden'); return; }
  searchTimer = setTimeout(() => globalSearch(q), 300);
}
async function globalSearch(q) {
  try {
    const data = await api('/api/search?q=' + encodeURIComponent(q));
    const el = document.getElementById('searchResults');
    if (!data.results.length) { el.classList.add('hidden'); return; }
    el.innerHTML = data.results.map(r => {
      const icons = { plan:'assignment', content:'calendar_month', hub:'photo_library', promo:'campaign' };
      const pages = { plan:'contentplan', content:'calendar', hub:'hub', promo:'promo' };
      return `<button class="w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors flex items-center gap-2.5 border-b border-border-light last:border-0"
        onclick="document.getElementById('globalSearch').value='';closeSearch();navigate('${pages[r.type]||'dashboard'}')">
        <span class="material-symbols-outlined text-lg text-text-muted">${icons[r.type]||'search'}</span>
        <div class="min-w-0 flex-1">
          <p class="text-body-md text-text-primary truncate">${r.name}</p>
          <p class="text-caption text-text-muted">${r.type === 'plan' ? 'Rencana Konten' : r.type === 'content' ? 'Kalender' : r.type === 'hub' ? 'Pusat Konten' : 'Promo'} · ${r.date || ''}</p>
        </div>
      </button>`;
    }).join('');
    el.classList.remove('hidden');
  } catch(e) { /* silent */ }
}
function closeSearch() { const el = document.getElementById('searchResults'); if (el) el.classList.add('hidden'); }
document.addEventListener('click', function(e) {
  const el = document.getElementById('searchResults');
  if (!el || el.classList.contains('hidden')) return;
  if (!e.target.closest('#globalSearch') && !e.target.closest('#searchResults')) el.classList.add('hidden');
});

// ====== AUTH ======
async function login() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      openModal('Error', `
        <div class="empty-state">
          <div class="empty-state-icon" style="background:#fef2f2;color:#dc2626">
            <span class="material-symbols-outlined">error</span>
          </div>
          <div class="empty-state-title">Login Gagal</div>
          <div class="empty-state-desc">${data.error || 'Username atau password salah'}</div>
        </div>
      `, '<button class="btn btn-secondary" onclick="closeModal()">Coba Lagi</button>');
      return;
    }
    currentUser = data.user;
    showApp();
    navigate('dashboard');
  } catch (e) { toast('Gagal konek ke server', 'error'); }
}

async function logout() {
  if (window._notifPoll) clearInterval(window._notifPoll);
  await fetch('/api/logout', { method: 'POST' });
  currentUser = null;
  document.getElementById('loginPage').style.display = '';
  document.getElementById('appLayout').classList.add('hidden');
  notifOpen = false;
  document.getElementById('notifDropdown').classList.add('hidden');
}

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      showApp();
      navigate('dashboard');
    }
  } catch(e) {}
}

// ====== DARK MODE ======
function initDarkMode() {
  try {
    const stored = localStorage.getItem('flowcontent-dark');
    if (stored === 'true') document.documentElement.classList.add('dark');
  } catch(e) {}
  updateDarkUI();
}
function toggleDarkMode() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  localStorage.setItem('flowcontent-dark', html.classList.contains('dark'));
  updateDarkUI();
}
function updateDarkUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const icon = document.getElementById('darkModeIcon');
  const label = document.getElementById('darkModeLabel');
  if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
  if (label) label.textContent = isDark ? 'Terang' : 'Gelap';
}

function showApp() {
  try {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appLayout').classList.remove('hidden');
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.add('hidden');
  initDarkMode();
  const initial = (currentUser.display_name || currentUser.username).charAt(0).toUpperCase();
  document.getElementById('topbarUserName').textContent = currentUser.display_name || currentUser.username;
  document.getElementById('topbarUserAvatar').textContent = initial;
  if (currentUser.role === 'admin') {
    document.getElementById('adminNav').classList.remove('hidden');
    ['contentplan','calendar','hub','trends','assetgen','report'].forEach(p => {
      const el = document.querySelector(`.nav-item[data-page="${p}"]`);
      if (el) el.classList.remove('hidden');
    });
  } else {
    document.getElementById('adminNav').classList.add('hidden');
    const allNav = ['contentplan','calendar','hub','trends','assetgen','report'];
    if (currentUser.permissions) {
      const perms = typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions;
      if (Array.isArray(perms)) {
        allNav.forEach(p => {
          const el = document.querySelector(`.nav-item[data-page="${p}"]`);
          if (el) el.classList.toggle('hidden', !perms.includes(p));
        });
      }
    } else {
      allNav.forEach(p => {
        const el = document.querySelector(`.nav-item[data-page="${p}"]`);
        if (el) el.classList.add('hidden');
      });
    }
  }
  } catch(e) { console.error('showApp render error:', e); }

  // Notif polling — always runs even if showApp above errored
  loadNotifications();
  if (window._notifPoll) clearInterval(window._notifPoll);
  window._notifPoll = setInterval(loadNotifications, 2000);
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) loadNotifications();
  });
  initBrandSwitcher();
}

// ====== BRAND SWITCHER ======
let brands = [];
function toggleBrandDropdown() {
  const dd = document.getElementById('brandDropdown');
  const ch = document.getElementById('brandChevron');
  dd.classList.toggle('hidden');
  ch.style.transform = dd.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

async function switchBrand(brandId) {
  const data = await api('/api/brand/switch', {
    method: 'POST',
    body: JSON.stringify({ brand_id: brandId })
  });
  activeBrandId = data.activeBrandId;
  document.getElementById('brandChevron').style.transform = 'rotate(0deg)';
  document.getElementById('brandDropdown').classList.add('hidden');
  document.querySelectorAll('.brand-option').forEach(el => el.classList.remove('bg-white/[0.06]'));
  const brandEl = [...document.querySelectorAll('.brand-option')].find(el => el.textContent.trim() === (brands.find(b => b.id === brandId)?.name));
  if (brandEl) brandEl.classList.add('bg-white/[0.06]');
  if (currentPage === 'dashboard') navigate('dashboard');
  else navigate(currentPage);
}

async function initBrandSwitcher() {
  try {
    const data = await api('/api/me');
    brands = data.brands || [];
    activeBrandId = data.activeBrandId;
    const list = document.getElementById('brandList');
    list.innerHTML = '';
    for (const b of brands) {
      const btn = document.createElement('button');
      btn.className = 'brand-option flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-white hover:bg-white/[0.06] transition-all text-sm';
      btn.onclick = () => switchBrand(b.id);
      btn.innerHTML = b.logo_url
        ? `<img src="${b.logo_url}" alt="${b.name}" class="w-6 h-6 rounded object-cover flex-shrink-0"><span class="truncate">${b.name}</span>`
        : `<div class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:${b.color || '#f43f5e'}">${b.name.charAt(0).toUpperCase()}</div><span class="truncate">${b.name}</span>`;
      if (b.id === activeBrandId) btn.classList.add('bg-white/[0.06]');
      list.appendChild(btn);
    }
    updateBrandPill();
  } catch(e) { console.error('Brand init error', e); }
}

function brandAccentColor(brand) {
  if (!brand) return '#FF1695';
  if (brand.name === 'Curabeauty') return '#FF1695';
  if (brand.name === 'Martabak Kenangan') return '#eab308';
  return brand.color || '#f43f5e';
}

function setBrandAccent(color) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  let style = document.getElementById('brand-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'brand-style';
    document.head.appendChild(style);
  }
  style.textContent = `
    :root {
      --accent: ${color};
      --accent-rgb: ${r},${g},${b};
    }
    .text-accent, .dark .text-accent { color: ${color} !important; }
    .bg-accent { background: ${color} !important; }
    .bg-accent-subtle { background: rgba(${r},${g},${b}, 0.1) !important; }
    .bg-accent-hover:hover { background: ${color} !important; }
    .text-accent-hover:hover { color: ${color} !important; }
    .platform-ig { background: rgba(${r},${g},${b}, 0.1); color: ${color}; }
    .dark .platform-ig { background: rgba(${r},${g},${b}, 0.15); color: ${color}; }
    .input-file::file-selector-button { background: ${color} !important; }
    .btn-primary { background: ${color} !important; }
    .btn-primary:hover { filter: brightness(0.85); }
    .nav-item.active::before { background: ${color} !important; }
    .stat-card { border-left-color: ${color} !important; }
    .approval-card:hover { border-left-color: ${color} !important; }
    .approval-card.pending_approval { border-left-color: ${color} !important; }
    .hub-item:hover { border-color: ${color} !important; }
    .trend-card:hover { border-color: ${color} !important; }
    .template-card:hover { border-color: ${color} !important; }
    .input:focus { border-color: ${color} !important; box-shadow: 0 0 0 3px rgba(${r},${g},${b}, 0.12) !important; }
    .dark .input:focus { border-color: ${color} !important; box-shadow: 0 0 0 3px rgba(${r},${g},${b}, 0.15) !important; }
    .file-input + label:hover { border-color: ${color} !important; }
    .file-input:focus + label { border-color: ${color} !important; border-color: ${color} !important; }
    .dark .sidebar .nav-item:hover { color: ${color} !important; }
    .dark .sidebar .nav-item.active::before { background: ${color} !important; }
    .dark #darkModeToggle:hover { color: ${color} !important; }
    .platform-both { background: ${color} !important; }
    .cal-day.today .cal-day-number { color: ${color} !important; }
    .dark .stat-card { border-left-color: ${color} !important; }
    .badge-revision_requested::before { background: ${color} !important; }
    .border-accent { border-color: ${color} !important; }
    .\\!border-accent { border-color: ${color} !important; }
    .\\!bg-accent-subtle { background: rgba(${r},${g},${b}, 0.1) !important; }
  `;
}

function updateBrandPill() {
  const brand = brands.find(b => b.id === activeBrandId);
  const icon = document.getElementById('brandSwitcherIcon');
  const pill = document.getElementById('brandPill');
  if (!brand) return;
  const accent = brandAccentColor(brand);
  setBrandAccent(accent);
  pill.textContent = brand.name;
  pill.style.display = 'inline';
  pill.style.background = '#111111';
  pill.style.color = accent;
  document.getElementById('brandSwitcherName').textContent = brand.name;
  icon.style.background = brand.color || '#f43f5e';
  icon.innerHTML = brand.logo_url
    ? `<img src="${brand.logo_url}" alt="${brand.name}" class="w-7 h-7 rounded-md object-cover">`
    : `<span class="material-symbols-outlined text-white text-sm" style="font-variation-settings:'FILL'1">auto_awesome</span>`;
}

// ====== NAVIGATION ======
function navigate(page) {
  // Admin has unrestricted access
  if (currentUser && currentUser.role !== 'admin') {
    // Approval is always accessible (shows own submissions)
    if (page !== 'approval') {
      if (currentUser.permissions) {
        const perms = typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions;
        if (Array.isArray(perms) && !perms.includes(page) && page !== 'dashboard') {
          return navigate('dashboard');
        }
      } else {
        if (page !== 'dashboard') return navigate('dashboard');
      }
    }
  }
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  const titles = {
    dashboard: 'Dashboard', contentplan: 'Rencana Konten', calendar: 'Kalender Konten',
    approval: 'Approval', hub: 'Pusat Konten', promo: 'Promo',
    trends: 'Pantau Tren', assetgen: 'Buat Desain', report: 'Laporan', users: 'Kelola Tim', brands: 'Brand'
  };
  const subtitles = {
    dashboard: 'Semua alur konten dalam satu tempat',
    contentplan: 'Atur jadwal & ide konten bulanan',
    calendar: 'Lihat jadwal posting di kalender',
    approval: 'Review & approve konten sebelum tayang',
    hub: 'Pusat penyimpanan aset konten',
    promo: 'Kelola promo & diskon brand',
    trends: 'Tren terbaru dari berbagai platform',
    assetgen: 'Buat desain konten dengan cepat',
    report: 'Analisis performa konten',
    users: 'Atur tim & akses pengguna',
    brands: 'Kelola brand & identitas'
  };
  const sub = document.getElementById('topbarSubtitle');
  if (sub) sub.textContent = subtitles[page] || '';
  updateBrandPill();
  const content = document.getElementById('pageContent');
  content.classList.remove('content-ready');
  content.classList.add('page-exiting');
  setTimeout(() => {
    content.classList.remove('page-exiting');
    if (page === 'dashboard') renderDashboard(content);
    else if (page === 'contentplan') renderContentPlan(content);
    else if (page === 'calendar') renderCalendar(content);
    else if (page === 'approval') renderApproval(content);
    else if (page === 'hub') renderHub(content);
    else if (page === 'promo') renderPromo(content);
    else if (page === 'trends') renderTrends(content);
    else if (page === 'assetgen') renderAssetGen(content);
    else if (page === 'report') renderReport(content);
    else if (page === 'brands') renderBrands(content);
    else if (page === 'users') renderUsers(content);
    content.classList.add('content-ready');
  }, 120);
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.add('hidden');
  document.getElementById('brandDropdown').classList.add('hidden');
  document.getElementById('notifDropdown').classList.add('hidden');
  document.getElementById('brandChevron').style.transform = 'rotate(0deg)';
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.toggle('open');
  backdrop.classList.toggle('hidden');
}

// ====== API WRAPPER ======
async function api(url, options = {}) {
  const opts = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ====== UTILITIES ======
function canvaUrl(val) {
  if (!val) return '#';
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  return `https://www.canva.com/design/create?template=${val}`;
}
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  el.innerHTML = `<span class="material-symbols-outlined text-lg">${icons[type] || 'info'}</span>${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 200);
  }, 3000);
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '';
  const parts = d.split(/[- :]/);
  // Date object for timezone-aware date formatting
  const dt = new Date(parts[0], parts[1]-1, parts[2], parts[3]||0, parts[4]||0, parts[5]||0);
  const date = dt.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Makassar' });
  // Time comes directly from the SQLite string (already Makassar time)
  const h = (parts[3]||'00').padStart(2, '0');
  const m = (parts[4]||'00').padStart(2, '0');
  return date + ' ' + h + ':' + m;
}

function formatRupiah(n) {
  return 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function statusBadge(status) {
  const labels = {
    draft: 'Draf', pending_review: 'Perlu Review', pending_approval: 'Pending Approval',
    revision_requested: 'Diminta Revisi', scheduled: 'Terjadwal', posted: 'Terposting',
    failed: 'Gagal', done: 'Selesai', Published: 'Terbit'
  };
  const cls = {
    draft: 'badge-draft', pending_review: 'badge-pending_review', pending_approval: 'badge-pending_approval',
    revision_requested: 'badge-revision_requested', scheduled: 'badge-scheduled', posted: 'badge-posted',
    failed: 'badge-failed', done: 'badge-done', Published: 'badge-done'
  };
  return `<span class="badge ${cls[status] || 'badge-draft'}">${labels[status] || status}</span>`;
}

function platformIcon(platform) {
  if (platform === 'ig') return '<span class="platform-badge platform-ig">IG</span>';
  if (platform === 'tiktok') return '<span class="platform-badge platform-tiktok">TT</span>';
  if (platform === 'both') return '<span class="platform-badge platform-both">IG+TT</span>';
  return `<span class="platform-badge" style="background:#f6f3ef;color:#8a7e7a">${platform}</span>`;
}

function openModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function modalOpenCreateContent() {
  navigate('calendar');
}

// ====== NOTIFICATIONS ======
function toggleNotifications() {
  notifOpen = !notifOpen;
  const dd = document.getElementById('notifDropdown');
  if (notifOpen) {
    dd.classList.remove('hidden');
    loadNotifications();
  } else {
    dd.classList.add('hidden');
  }
}

async function loadNotifications() {
  try {
    const data = await api('/api/notifications');
    var prevUnread = window._prevUnread || 0;
    renderNotifications(data.notifications);
    const badge = document.getElementById('notifBadge');
    if (data.unread > 0) {
      badge.classList.remove('hidden');
      badge.textContent = data.unread > 99 ? '99+' : data.unread;
      badge.style.width = 'auto';
      badge.style.height = 'auto';
      badge.style.padding = '0 4px';
      badge.style.fontSize = '9px';
      badge.style.lineHeight = '14px';
      // Toast on NEW notification (unread count increased)
      if (data.unread > prevUnread && prevUnread > 0) {
        toast('Ada ' + (data.unread - prevUnread) + ' notifikasi baru!', 'info');
      }
    } else {
      badge.classList.add('hidden');
    }
    window._prevUnread = data.unread;
  } catch(e) { console.error('Notif load error:', e); }
}

function renderNotifications(notifs) {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (!notifs.length) {
    list.innerHTML = '<div class="empty-state" style="padding:32px"><div class="empty-state-desc">Belum ada notifikasi</div></div>';
    return;
  }
  list.innerHTML = notifs.map(n => {
    var timeStr = '';
    try { timeStr = formatDateTime(n.created_at); } catch(e) { timeStr = n.created_at || ''; }
    return '<div class="notif-item ' + (n.is_read ? '' : 'unread') + '">' +
      '<div class="notif-icon"><span class="material-symbols-outlined text-sm">' + (n.type === 'approved' ? 'check_circle' : (n.type === 'pending_approval' || n.type === 'pending_review') ? 'how_to_reg' : n.type === 'revision' ? 'edit' : 'notifications') + '</span></div>' +
      '<div class="notif-content" onclick="notifClick(\'' + n.id + '\',\'' + n.type + '\')"><div class="notif-message">' + (n.message || '') + '</div>' +
      '<div class="notif-time">' + timeStr + '</div></div>' +
      '<button class="notif-del" onclick="event.stopPropagation();deleteNotif(\'' + n.id + '\')"><span class="material-symbols-outlined text-sm">close</span></button></div>';
  }).join('');
}

async function notifClick(id, type) {
  navigate('approval');  // Always go to approval page
  try {
    await api('/api/notifications/' + id + '/read', { method: 'PUT' });
    loadNotifications();
  } catch(e) {}
}

async function deleteNotif(id) {
  try {
    await api('/api/notifications/' + id, { method: 'DELETE' });
    loadNotifications();
    toast('Notifikasi dihapus');
  } catch(e) { console.error('Delete notif error:', e); }
}

async function deleteAllReadNotifs() {
  try {
    const res = await api('/api/notifications', { method: 'DELETE' });
    loadNotifications();
    if (res && res.deleted > 0) toast('Semua notifikasi dibersihkan!');
  } catch(e) { console.error('Delete all error:', e); }
}

async function markNotifRead(id) {
  try {
    await api(`/api/notifications/${id}/read`, { method: 'PUT' });
    loadNotifications();
  } catch(e) {}
}

async function markAllRead() {
  try {
    await api('/api/notifications/read-all', { method: 'PUT' });
    loadNotifications();
  } catch(e) {}
}

// Close notification dropdown on click outside
document.addEventListener('click', function(e) {
  if (notifOpen && !e.target.closest('.notification-bell') && !e.target.closest('.notif-dropdown')) {
    notifOpen = false;
    document.getElementById('notifDropdown').classList.add('hidden');
  }
});

// Check auth on load
checkAuth();

/* ========================================================================
   ====== DASHBOARD ======================================================
   ======================================================================== */
async function renderDashboard(el) {
  el.innerHTML = `<div class="space-y-6">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="skeleton h-32"></div><div class="skeleton h-32"></div><div class="skeleton h-32"></div><div class="skeleton h-32"></div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 skeleton h-80"></div><div class="skeleton h-80"></div>
    </div>
  </div>`;
  try {
    const [dash, contents] = await Promise.all([
      api('/api/dashboard'),
      api('/api/contents?limit=10')
    ]);
    el.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
           <h1 class="font-display text-display-md text-text-primary tracking-tight">Flowcontent</h1>
          <p class="text-body-md text-text-secondary mt-1">Semua alur konten lo dalam satu tempat.</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateContent()">
          <span class="material-symbols-outlined text-lg">add_circle</span>
            Konten Baru
          </button>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="card p-5 card-hoverable">
          <div class="flex items-center justify-between mb-3">
            <span class="text-label-sm text-text-secondary">Pending Approval</span>
            <span class="material-symbols-outlined text-text-muted">pending_actions</span>
          </div>
          <div class="font-display text-display-md text-accent font-bold">${dash.pendingApproval}</div>
          <div class="mt-2 flex items-center gap-1.5 text-caption text-text-secondary">
            <span class="material-symbols-outlined text-sm text-success">trending_up</span>
            Siap direview
          </div>
        </div>
        <div class="card p-5 card-hoverable">
          <div class="flex items-center justify-between mb-3">
            <span class="text-label-sm text-text-secondary">Terjadwal</span>
            <span class="material-symbols-outlined text-text-muted">event_available</span>
          </div>
          <div class="font-display text-display-md text-text-primary font-bold">${dash.scheduled}</div>
          <div class="mt-2 flex items-center gap-1.5 text-caption text-text-secondary">
            Jadwal posting
          </div>
        </div>
        <div class="card p-5 card-hoverable">
          <div class="flex items-center justify-between mb-3">
            <span class="text-label-sm text-text-secondary">Draf</span>
            <span class="material-symbols-outlined text-text-muted">edit_note</span>
          </div>
          <div class="font-display text-display-md text-text-primary font-bold">${dash.drafts}</div>
          <div class="mt-2 flex items-center gap-1.5 text-caption text-text-secondary">
            Lagi dikerjain
          </div>
        </div>
        <div class="card p-5 card-hoverable">
          <div class="flex items-center justify-between mb-3">
            <span class="text-label-sm text-text-secondary">Selesai</span>
            <span class="material-symbols-outlined text-text-muted">check_circle</span>
          </div>
          <div class="font-display text-display-md text-success font-bold">${dash.scheduled + dash.pendingApproval + dash.drafts}</div>
          <div class="mt-2 flex items-center gap-1.5 text-caption text-text-secondary">
            Total konten aktif
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 card overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border-light">
            <h3 class="text-title-md text-text-primary">Konten Terbaru</h3>
            <button class="btn btn-ghost btn-sm" onclick="navigate('calendar')">Lihat Semua</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                  <tr>
                    <th>Tanggal</th><th>Judul</th><th>Platform</th><th>Status</th><th>Pembuat</th>
                  </tr>
              </thead>
              <tbody>
                ${contents.contents.map(c => `
                  <tr class="cursor-pointer" onclick="openContentDetail('${c.id}')">
                    <td class="text-text-secondary text-caption">${formatDate(c.posting_date)}</td>
                <td class="font-medium">${c.content_plan_id ? '<span class="text-[10px] mr-1" title="Dari Rencana Konten">📋</span>' : ''}${c.title}</td>
                    <td>${platformIcon(c.platform)}</td>
                    <td>${statusBadge(c.status)}</td>
                    <td class="text-text-secondary text-caption">${c.creator_name || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card p-5">
          <h3 class="text-title-md text-text-primary mb-4">Aktivitas</h3>
          <div id="activityFeed" class="space-y-3">
            <div class="space-y-3"><div class="skeleton h-12"></div><div class="skeleton h-12"></div><div class="skeleton h-12"></div></div>
          </div>
        </div>
      </div>
    `;
    const act = await api('/api/activities');
    document.getElementById('activityFeed').innerHTML = act.logs.length
      ? act.logs.map(a => `
        <div class="flex gap-3 py-2.5 border-b border-border-light/60 last:border-0">
          <div class="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0"></div>
          <div class="flex-1 min-w-0">
            <div class="text-body-sm text-text-primary"><strong>${a.user_name || 'System'}</strong> ${a.action}</div>
            <div class="text-caption text-text-secondary mt-0.5">${formatDateTime(a.created_at)}</div>
          </div>
        </div>
      `).join('')
      : '<div class="text-body-sm text-text-secondary py-4 text-center">Belum ada aktivitas</div>';
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="background:#fef2f2;color:#dc2626"><span class="material-symbols-outlined">error</span></div><div class="empty-state-title">Gagal Muat</div><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

/* ========================================================================
   ====== CONTENT PLAN ====================================================
   ======================================================================== */
async function renderContentPlan(el) {
  el.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
      <div class="skeleton h-7 w-40 rounded-lg"></div>
      <div class="flex gap-2 items-center">
        <div class="skeleton h-9 w-[160px] rounded-input"></div>
        <div class="skeleton h-9 w-[130px] rounded-input"></div>
      </div>
    </div>
    <div class="card overflow-hidden">
      <div class="skeleton-table">
        ${Array.from({length:6}, (_,i) => `
          <div class="skeleton-row">
            <div class="skeleton-cell" style="width:70px"></div>
            <div class="skeleton-cell" style="width:40px"></div>
            <div class="skeleton-cell" style="width:70px"></div>
            <div class="skeleton-cell" style="width:60px"></div>
            <div class="skeleton-cell" style="width:90px"></div>
            <div class="skeleton-cell"></div>
            <div class="skeleton-cell" style="width:60px"></div>
            <div class="skeleton-cell" style="width:50px"></div>
            <div class="skeleton-cell" style="width:50px"></div>
          </div>
        `).join('')}
      </div>
    </div>`;
  try {
    const [plansData, monthsData] = await Promise.all([
      api('/api/content-plans?page=' + planPage + '&limit=20&sort=' + planSort + '&order=' + planOrder + (selectedMonth ? '&month=' + encodeURIComponent(selectedMonth) : '') + (planStatus ? '&status=' + encodeURIComponent(planStatus) : '')),
      api('/api/content-plans/months')
    ]);
    const plans = plansData.plans || [];
    const months = monthsData.months || [];
    const total = plansData.total || 0;
    const totalPages = Math.ceil(total / 20);

    el.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-6 flex-wrap content-fade-in" id="planToolbar">
        <h2 class="font-display text-display-sm text-text-primary tracking-tight">Rencana Konten</h2>
        <div class="flex items-center gap-2 flex-wrap" id="planToolbarInner">
          <select class="input py-1 text-xs !w-auto" id="planMonthFilter" onchange="filterPlanMonth(this.value)">
            <option value="">Bulan</option>
            ${months.map(m => `<option value="${m}" ${selectedMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" onclick="exportPlans()">
            <span class="material-symbols-outlined text-lg">download</span> <span class="plan-label">Download CSV</span>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="importPlans()">
            <span class="material-symbols-outlined text-lg">upload</span> <span class="plan-label">Import CSV</span>
          </button>
          <button class="btn btn-primary btn-sm" id="planAddBtn" onclick="openCreatePlan()">
            <span class="material-symbols-outlined text-lg">add</span> <span class="plan-label">Tambah Rencana</span>
          </button>
        </div>
      </div>
      <div id="bulkBar" class="bulk-bar">
        <span class="bulk-count" id="bulkCount">0 selected</span>
        <button class="btn btn-sm bulk-delete" onclick="bulkDeletePlans()">
          <span class="material-symbols-outlined text-lg">delete</span> Hapus
        </button>
        <button class="btn btn-sm" onclick="showBulkStatusModal()">
          <span class="material-symbols-outlined text-lg">pending</span> Ubah Status
        </button>
        <button class="btn btn-sm" onclick="clearBulkSelect()">
          <span class="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      <div class="card overflow-hidden">
        <div class="table-wrap">
          <table class="plan-table">
            <thead>
              <tr>
                <th style="width:36px"><input type="checkbox" class="row-checkbox" onchange="toggleSelectAll(this, 'planTable')"></th>
                <th class="cursor-pointer select-none hover:text-accent transition-colors relative" onclick="togglePlanStatusDropdown()">Status ${planStatus ? '‹' + (planStatus === 'Draft' ? 'Draf' : planStatus) + '›' : ''}</th><th>PIC</th><th class="cursor-pointer select-none hover:text-accent transition-colors" onclick="togglePlanSort('upload_date')">Tanggal ${planSort === 'upload_date' ? (planOrder === 'ASC' ? '▲' : '▼') : '⇅'}</th><th>Pilar</th><th>Tipe</th><th>Judul / Hook</th><th>Brand</th><th>Publisher</th><th style="width:80px">Aksi</th>
              </tr>
            </thead>
            <tbody id="planTable">
              ${plans.length ? plans.map(p => `
                <tr class="hover:bg-surface-hover transition-colors">
                  <td><input type="checkbox" class="row-checkbox" value="${p.id}" onchange="updateBulkBar('planTable')"></td>
                  <td>${statusBadge(p.status)}</td>
                  <td class="font-medium">${p.pic || '-'}</td>
                  <td class="text-text-secondary">${p.upload_date || '-'}</td>
                  <td><span class="text-caption px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary">${p.pillar || '-'}</span></td>
                  <td class="max-w-[140px] truncate text-text-secondary" title="${p.content_type || ''}">${p.content_type || '-'}</td>
                  <td class="font-medium max-w-[200px] truncate" title="${p.title}">${p.title}</td>
                  <td class="text-text-secondary">${p.brand || '-'}</td>
                  <td class="text-text-secondary">${p.publisher || '-'}</td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-ghost btn-sm !px-2" onclick="openPlanDetail('${p.id}')" title="Detail">
                        <span class="material-symbols-outlined text-sm">visibility</span>
                      </button>
                      <button class="btn btn-ghost btn-sm !px-2" onclick="openEditPlan('${p.id}')" title="Edit">
                        <span class="material-symbols-outlined text-sm">edit</span>
                      </button>
                      ${currentUser && (currentUser.role === 'admin' || currentUser.role === 'creator') ? `
                      <button class="btn btn-ghost btn-sm !px-2 text-error hover:text-error" onclick="deletePlan('${p.id}','${p.title.replace(/'/g, "\\'")}')" title="Hapus">
                        <span class="material-symbols-outlined text-sm">delete</span>
                      </button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="11"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">assignment</span></div><div class="empty-state-title">Belum ada rencana konten</div><div class="empty-state-desc">Buat rencana pertama lo, yuk!</div></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      ${totalPages > 1 ? `
      <div class="flex items-center justify-between gap-3 mt-4">
        <div class="text-caption text-text-secondary">${total} rencana · Halaman ${planPage} dari ${totalPages}</div>
        <div class="flex gap-1">
          <button class="btn btn-ghost btn-sm ${planPage <= 1 ? 'opacity-30 pointer-events-none' : ''}" onclick="gotoPlanPage(${planPage - 1})">Prev</button>
          ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
            const start = Math.max(1, Math.min(planPage - 2, totalPages - 4));
            const pg = start + i;
            return pg <= totalPages ? `<button class="btn btn-ghost btn-sm ${pg === planPage ? 'bg-accent text-white hover:bg-accent' : ''}" onclick="gotoPlanPage(${pg})">${pg}</button>` : '';
          }).join('')}
          <button class="btn btn-ghost btn-sm ${planPage >= totalPages ? 'opacity-30 pointer-events-none' : ''}" onclick="gotoPlanPage(${planPage + 1})">Next</button>
        </div>
      </div>` : ''}
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="background:#fef2f2;color:#dc2626"><span class="material-symbols-outlined">error</span></div><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

function filterPlanMonth(month) {
  selectedMonth = month;
  planPage = 1;
  navigate('contentplan');
}
function filterPlanStatus(status) {
  planStatus = status;
  planPage = 1;
  navigate('contentplan');
}
function togglePlanStatusDropdown() {
  const existing = document.getElementById('planStatusDropdown');
  if (existing) { existing.remove(); return; }
  const div = document.createElement('div');
  div.id = 'planStatusDropdown';
  div.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/20';
  div.onclick = function(e) { if (e.target === div) div.remove(); };
  div.innerHTML = `
    <div class="bg-surface border border-border-light rounded-card shadow-elevated p-2 min-w-[140px]" onclick="event.stopPropagation()">
      <button class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors ${!planStatus ? 'text-accent font-semibold' : 'text-text-primary'}" onclick="selectPlanStatus('')">Semua</button>
      <button class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors ${planStatus === 'Draft' ? 'text-accent font-semibold' : 'text-text-primary'}" onclick="selectPlanStatus('Draft')">Draft</button>
      <button class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors ${planStatus === 'Published' ? 'text-accent font-semibold' : 'text-text-primary'}" onclick="selectPlanStatus('Published')">Published</button>
    </div>`;
  document.body.appendChild(div);
}
function selectPlanStatus(status) {
  planStatus = status;
  planPage = 1;
  document.getElementById('planStatusDropdown')?.remove();
  navigate('contentplan');
}

function gotoPlanPage(page) {
  planPage = page;
  navigate('contentplan');
}

function togglePlanSort(col) {
  if (planSort === col) {
    planOrder = planOrder === 'ASC' ? 'DESC' : 'ASC';
  } else {
    planSort = col;
    planOrder = 'ASC';
  }
  planPage = 1;
  navigate('contentplan');
}

// ====== BULK ACTIONS ======
function toggleSelectAll(checkbox, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = checkbox.checked);
  updateBulkBar(tbodyId);
}
function updateBulkBar(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  const bar = document.getElementById('bulkBar');
  if (!tbody || !bar) return;
  const checked = tbody.querySelectorAll('.row-checkbox:checked');
  const count = checked.length;
  bar.querySelector('.bulk-count').textContent = count + ' selected';
  bar.classList.toggle('show', count > 0);
  const header = tbody.parentElement?.previousElementSibling?.querySelector('.row-checkbox');
  if (header) header.checked = count === tbody.querySelectorAll('.row-checkbox').length;
}
function clearBulkSelect() {
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.bulk-bar').forEach(b => b.classList.remove('show'));
}
function getBulkSelectedIds() {
  return Array.from(document.querySelectorAll('.row-checkbox:checked'))
    .filter(cb => cb.closest('tbody'))
    .map(cb => cb.value)
    .filter(Boolean);
}
async function bulkDeletePlans() {
  const ids = getBulkSelectedIds();
  if (!ids.length) return;
  if (!confirm('Hapus ' + ids.length + ' rencana konten? Tindakan ini permanen.')) return;
  const btn = document.querySelector('.bulk-delete');
  if (btn) btn.disabled = true;
  try {
    const res = await api('/api/content-plans/bulk', { method: 'DELETE', body: { ids } });
    if (res.success) { toast(ids.length + ' rencana berhasil dihapus'); clearBulkSelect(); navigate('contentplan'); }
    else throw new Error(res.error);
  } catch(e) { toast(e.message, 'error'); }
  if (btn) btn.disabled = false;
}
async function bulkStatusPlans(status) {
  document.getElementById('bulkStatusModal')?.remove();
  const ids = getBulkSelectedIds();
  if (!ids.length) return;
  try {
    const res = await api('/api/content-plans/bulk/status', { method: 'PATCH', body: { ids, status } });
    if (res.success) { toast(ids.length + ' rencana diubah ke ' + status); clearBulkSelect(); navigate('contentplan'); }
    else throw new Error(res.error);
  } catch(e) { toast(e.message, 'error'); }
}
function showBulkStatusModal() {
  const existing = document.getElementById('bulkStatusModal');
  if (existing) { existing.remove(); return; }
  const div = document.createElement('div');
  div.id = 'bulkStatusModal';
  div.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/20';
  div.onclick = function(e) { if (e.target === div) div.remove(); };
  div.innerHTML = `
    <div class="bg-surface border border-border-light rounded-card shadow-elevated p-2 min-w-[180px]" onclick="event.stopPropagation()">
      <div class="text-label-sm text-text-secondary px-3 py-2 border-b border-border-light">Ubah Status</div>
      <button class="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-surface-hover transition-colors" onclick="bulkStatusPlans('Draft')">Draft</button>
      <button class="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-surface-hover transition-colors" onclick="bulkStatusPlans('Published')">Published</button>
      <button class="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-surface-hover transition-colors" onclick="bulkStatusPlans('Proses Writing')">Proses Writing</button>
      <button class="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-surface-hover transition-colors" onclick="bulkStatusPlans('Ready for review')">Ready for review</button>
    </div>`;
  document.body.appendChild(div);
}
async function bulkDeleteContents() {
  const ids = getBulkSelectedIds();
  if (!ids.length) return;
  if (!confirm('Hapus ' + ids.length + ' konten? Tindakan ini permanen.')) return;
  try {
    const res = await api('/api/contents/bulk', { method: 'DELETE', body: { ids } });
    if (res.success) { toast(ids.length + ' konten berhasil dihapus'); clearBulkSelect(); navigate('report'); }
    else throw new Error(res.error);
  } catch(e) { toast(e.message, 'error'); }
}

// ====== BULK IMPORT/EXPORT ======
async function apiBlob(url) {
  const res = await fetch(url);
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Export gagal'); }
  return res.blob();
}

async function exportPlans() {
  try {
    const blob = await apiBlob('/api/content-plans/export');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'content-plans.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Export berhasil!');
  } catch(e) { toast(e.message, 'error'); }
}

async function importPlans() {
  openModal('Import CSV', `
    <div class="space-y-4">
      <p class="text-body-md text-text-secondary">Paste data CSV. Baris pertama = header. Format header: <code class="text-accent">Judul,Status,PIC,Tanggal,Pilar,Tipe,Konsep,Publisher,Brand</code></p>
      <div class="form-group">
        <label class="form-label">Data CSV</label>
        <textarea class="input" id="importCsv" rows="8" placeholder="Judul,Status,PIC,Tanggal,Pilar,Tipe,Konsep,Publisher,Brand"></textarea>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="fillTemplate()">Isi Template</button>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="confirmImport()">Import</button>
  `);
}
function fillTemplate() {
  document.getElementById('importCsv').value = 'Judul,Status,PIC,Tanggal,Pilar,Tipe,Konsep,Publisher,Brand\nKonten Baru,Draft,Kerenh,01/07/2026,Soft Selling,Instagram Feed,Konsep disini...,Kekew,Curabeauty';
}
async function confirmImport() {
  const csv = document.getElementById('importCsv').value;
  if (!csv || csv.split('\n').length < 2) { toast('Isi data CSV dulu', 'error'); return; }
  closeModal();
  try {
    const data = await api('/api/content-plans/import', { method: 'POST', body: JSON.stringify({ csv }) });
    toast(`Berhasil import ${data.count} rencana konten!`);
    navigate('contentplan');
  } catch(e) { toast(e.message, 'error'); }
}

// ====== CONTENT PLAN CRUD ======
async function openCreatePlan() {
  openModal('Rencana Baru', `
    <form id="planForm" onsubmit="return false" class="space-y-4">
      <div class="grid grid-cols-3 gap-4">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="input" id="plan_status"><option value="Draft">Draf</option><option value="Published">Terbit</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">PIC</label>
          <input class="input" id="plan_pic" placeholder="Nama PIC">
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal</label>
          <input class="input" id="plan_date" type="date">
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div class="form-group">
          <label class="form-label">Pilar</label>
          <select class="input" id="plan_pillar">
            <option value="">Pilih</option><option value="Entertainment">Entertainment</option><option value="Soft Selling">Soft Selling</option><option value="Hard Selling">Hard Selling</option><option value="Edukasi">Edukasi</option><option value="Interaksi">Interaksi</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tipe</label>
          <select class="input" id="plan_type">
            <option value="">Pilih</option><option value="Instagram Single Feed">Instagram Single Feed</option><option value="Instagram Carousel Feed">Instagram Carousel Feed</option><option value="Instagram Reels">Instagram Reels</option><option value="TikTok Video">TikTok Video</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Brand</label>
          <input class="input" id="plan_brand" placeholder="Brand">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Judul / Hook <span class="text-error">*</span></label>
        <input class="input" id="plan_title" required placeholder="Judul atau hook konten">
      </div>
      <div class="form-group">
        <label class="form-label">Konsep / Catatan</label>
        <textarea class="input" id="plan_concept" rows="2"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Publisher</label>
          <input class="input" id="plan_publisher" placeholder="Nama publisher">
        </div>
        <div class="form-group">
          <label class="form-label">Bulan</label>
          <input class="input" id="plan_month" placeholder="Contoh: Januari 2026">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Link Canva</label>
          <input class="input" id="plan_canva" placeholder="https://canva.com/...">
        </div>
        <div class="form-group">
          <label class="form-label">Link Upload</label>
          <input class="input" id="plan_link" placeholder="https://">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Keterangan Page</label>
        <input class="input" id="plan_page" placeholder="cover motion : page 1-18">
      </div>
    </form>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="createPlan()">Buat</button>
  `);
}

async function createPlan() {
  const title = document.getElementById('plan_title').value;
  if (!title) { toast('Judul wajib diisi', 'error'); return; }
  const dateVal = document.getElementById('plan_date').value;
  const dateDisplay = dateVal ? new Date(dateVal + 'T00:00:00').toLocaleDateString('id-ID', {day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  try {
    await api('/api/content-plans', {
      method: 'POST',
      body: JSON.stringify({
        status: document.getElementById('plan_status').value,
        pic: document.getElementById('plan_pic').value,
        upload_date: dateDisplay,
        pillar: document.getElementById('plan_pillar').value,
        content_type: document.getElementById('plan_type').value,
        title,
        concept: document.getElementById('plan_concept').value,
        publisher: document.getElementById('plan_publisher').value,
        brand: document.getElementById('plan_brand').value,
        canva_link: document.getElementById('plan_canva').value,
        upload_link: document.getElementById('plan_link').value,
        page_notes: document.getElementById('plan_page').value,
        month_group: document.getElementById('plan_month').value
      })
    });
    toast('Rencana konten berhasil dibuat!');
    closeModal();
    navigate('contentplan');
  } catch(e) { toast(e.message, 'error'); }
}

async function deletePlan(id, title) {
  openModal('Hapus Rencana', `
    <div class="text-center py-4">
      <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
        <span class="material-symbols-outlined text-3xl text-error">delete_forever</span>
      </div>
      <p class="text-body-md text-text-primary mb-1">Yakin mau hapus rencana ini?</p>
      <p class="text-title-md font-semibold text-text-primary mb-3">"${title}"</p>
      <p class="text-caption text-text-secondary">Semua data terkait (termasuk di kalender) akan ikut terhapus.</p>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn !bg-error !text-white hover:!bg-[#b91c1c]" onclick="confirmDeletePlan('${id}')">Yakin, Hapus</button>
  `);
}

async function confirmDeletePlan(id) {
  closeModal();
  try {
    await api(`/api/content-plans/${id}`, { method: 'DELETE' });
    toast('Rencana konten berhasil dihapus!');
    navigate('contentplan');
  } catch(e) { toast(e.message, 'error'); }
}

async function openPlanDetail(id) {
  try {
    const [plansData, logsData] = await Promise.all([
      api('/api/content-plans'),
      api('/api/activities?content_id=' + id)
    ]);
    const plan = plansData.plans.find(p => p.id === id);
    if (!plan) { toast('Rencana gak ditemukan', 'error'); return; }
    const logs = logsData.logs || [];
    openModal('Detail Rencana', `
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="form-group"><span class="form-label">Status</span><div class="text-body-md font-medium">${statusBadge(plan.status)}</div></div>
          <div class="form-group"><span class="form-label">PIC</span><div class="text-body-md font-medium">${plan.pic || '-'}</div></div>
          <div class="form-group"><span class="form-label">Date</span><div class="text-body-md font-medium">${plan.upload_date || '-'}</div></div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="form-group"><span class="form-label">Pillar</span><div class="text-body-md font-medium">${plan.pillar || '-'}</div></div>
          <div class="form-group"><span class="form-label">Type</span><div class="text-body-md font-medium">${plan.content_type || '-'}</div></div>
          <div class="form-group"><span class="form-label">Brand</span><div class="text-body-md font-medium">${plan.brand || '-'}</div></div>
        </div>
        <div class="form-group"><span class="form-label">Title / Hook</span><div class="text-title-md font-semibold">${plan.title}</div></div>
        ${plan.concept ? `<div class="form-group"><span class="form-label">Konsep / Catatan</span><div class="text-body-md bg-surface-hover p-3 rounded-input">${plan.concept}</div></div>` : ''}
        ${plan.copywriting ? `<div class="form-group"><span class="form-label">Copywriting</span><div class="text-body-md bg-surface-hover p-3 rounded-input">${plan.copywriting}</div></div>` : ''}
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group"><span class="form-label">Publisher</span><div class="text-body-md font-medium">${plan.publisher || '-'}</div></div>
          ${plan.canva_link ? `<div class="form-group"><span class="form-label">Link Canva</span><a href="${plan.canva_link}" target="_blank" class="text-accent hover:underline inline-flex items-center gap-1 text-body-md"><span class="material-symbols-outlined text-sm">open_in_new</span>Buka Canva</a></div>` : ''}
        </div>
        <div class="grid grid-cols-2 gap-4">
          ${plan.upload_link ? `<div class="form-group"><span class="form-label">Upload Link</span><a href="${plan.upload_link}" target="_blank" class="text-accent hover:underline inline-flex items-center gap-1 text-body-md"><span class="material-symbols-outlined text-sm">open_in_new</span>Lihat Postingan</a></div>` : ''}
          ${plan.page_notes ? `<div class="form-group"><span class="form-label">Keterangan Page</span><div class="text-body-md font-medium">${plan.page_notes}</div></div>` : ''}
        </div>
        ${plan.insight ? `<div class="form-group"><span class="form-label">Insight</span><div class="text-body-md">${plan.insight}</div></div>` : ''}
        ${plan.evaluation ? `<div class="form-group"><span class="form-label">Evaluation</span><div class="text-body-md">${plan.evaluation}</div></div>` : ''}
        ${logs.length ? `
        <div class="border-t border-border-light pt-4 mt-2">
          <span class="form-label flex items-center gap-1.5 mb-3"><span class="material-symbols-outlined text-sm">history</span> Riwayat</span>
          <div class="space-y-2">${logs.slice(0, 10).map(l => `
            <div class="flex items-start gap-2.5 text-caption">
              <div class="w-1.5 h-1.5 rounded-full bg-accent/60 mt-1.5 shrink-0"></div>
              <div class="flex-1 min-w-0">
                <p class="text-text-secondary">${l.details || l.action}</p>
                <p class="text-text-muted mt-0.5">${l.user_name || '-'} · ${formatDateTime(l.created_at)}</p>
              </div>
            </div>
          `).join('')}</div>
        </div>` : ''}
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
      <button class="btn btn-primary" onclick="closeModal();openEditPlan('${id}')">Edit</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function openEditPlan(id) {
  try {
    const data = await api('/api/content-plans');
    const p = data.plans.find(x => x.id === id);
    if (!p) { toast('Rencana gak ditemukan', 'error'); return; }
    openModal('Edit Rencana', `
      <form id="planForm" onsubmit="return false" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="form-group"><label class="form-label">Status</label>
            <select class="input" id="plan_status"><option value="Draft" ${p.status==='Draft'?'selected':''}>Draf</option><option value="Published" ${p.status==='Published'?'selected':''}>Terbit</option></select>
          </div>
          <div class="form-group"><label class="form-label">PIC</label><input class="input" id="plan_pic" value="${p.pic||''}"></div>
          <div class="form-group"><label class="form-label">Tanggal</label><input class="input" id="plan_date" type="date"></div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="form-group"><label class="form-label">Pilar</label>
            <select class="input" id="plan_pillar"><option value="">Pilih</option>${['Entertainment','Soft Selling','Hard Selling','Edukasi','Interaksi'].map(o => `<option value="${o}" ${p.pillar===o?'selected':''}>${o}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Tipe</label>
            <select class="input" id="plan_type"><option value="">Pilih</option>${['Instagram Single Feed','Instagram Carousel Feed','Instagram Reels','TikTok Video'].map(o => `<option value="${o}" ${p.content_type===o?'selected':''}>${o}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Brand</label><input class="input" id="plan_brand" value="${p.brand||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Judul / Hook</label><input class="input" id="plan_title" value="${p.title}"></div>
        <div class="form-group"><label class="form-label">Konsep</label><textarea class="input" id="plan_concept" rows="2">${p.concept||''}</textarea></div>
        <div class="form-group"><label class="form-label">Copywriting</label><textarea class="input" id="plan_copywriting" rows="3">${p.copywriting||''}</textarea></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group"><label class="form-label">Publisher</label><input class="input" id="plan_publisher" value="${p.publisher||''}"></div>
          <div class="form-group"><label class="form-label">Bulan</label><input class="input" id="plan_month" value="${p.month_group||''}"></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group"><label class="form-label">Link Canva</label><input class="input" id="plan_canva" value="${p.canva_link||''}"></div>
          <div class="form-group"><label class="form-label">Link Upload</label><input class="input" id="plan_link" value="${p.upload_link||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Keterangan Page</label><input class="input" id="plan_page" value="${p.page_notes||''}"></div>
        <div class="form-group"><label class="form-label">Insight</label><textarea class="input" id="plan_insight" rows="2">${p.insight||''}</textarea></div>
        <div class="form-group"><label class="form-label">Evaluasi</label><textarea class="input" id="plan_evaluation" rows="2">${p.evaluation||''}</textarea></div>
      </form>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="updatePlan('${id}')">Simpan</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function updatePlan(id) {
  const title = document.getElementById('plan_title').value;
  if (!title) { toast('Judul wajib diisi', 'error'); return; }
  try {
    await api('/api/content-plans', {
      method: 'POST',
      body: JSON.stringify({
        id,
        status: document.getElementById('plan_status').value,
        pic: document.getElementById('plan_pic').value,
        pillar: document.getElementById('plan_pillar').value,
        content_type: document.getElementById('plan_type').value,
        title,
        concept: document.getElementById('plan_concept').value,
        copywriting: document.getElementById('plan_copywriting').value,
        publisher: document.getElementById('plan_publisher').value,
        brand: document.getElementById('plan_brand').value,
        canva_link: document.getElementById('plan_canva').value,
        upload_link: document.getElementById('plan_link').value,
        page_notes: document.getElementById('plan_page').value,
        month_group: document.getElementById('plan_month').value,
        insight: document.getElementById('plan_insight').value,
        evaluation: document.getElementById('plan_evaluation').value
      })
    });
    toast('Rencana konten berhasil diupdate!');
    closeModal();
    navigate('contentplan');
  } catch(e) { toast(e.message, 'error'); }
}

/* ========================================================================
   ====== CONTENT CALENDAR ================================================
   ======================================================================== */
let calContents = [];

// ====== CALENDAR DRAG & DROP ======
function dragCalEvent(ev, id) {
  ev.dataTransfer.setData('text/plain', id);
  ev.dataTransfer.effectAllowed = 'move';
  ev.target.style.opacity = '0.5';
}
function dropCalEvent(ev, dateStr) {
  ev.preventDefault();
  ev.target.style.background = '';
  const id = ev.dataTransfer.getData('text/plain');
  if (!id) return;
  updateContentDate(id, dateStr);
}
async function updateContentDate(id, dateStr) {
  try {
    await api(`/api/contents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ posting_date: dateStr })
    });
    toast('Tanggal konten berhasil diubah!');
    navigate('calendar');
  } catch(e) { toast(e.message, 'error'); }
}

async function renderCalendar(el) {
  el.innerHTML = `<div class="space-y-4"><div class="skeleton h-12 w-64"></div><div class="skeleton h-[500px] rounded-card"></div></div>`;
  try {
    calContents = await api('/api/contents');
    const allContents = calContents.contents || calContents || [];
    const calContainerId = 'calContainer-' + Date.now();
    el.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3 content-fade-in">
        <h2 class="font-display text-display-sm text-text-primary tracking-tight">Kalender Konten</h2>
      <div class="flex items-center gap-2">
        <div class="flex bg-surface border border-border-light rounded-input overflow-hidden">
          <button class="px-4 py-1.5 text-label-sm ${calendarState.view === 'month' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'} transition-all" onclick="changeCalView('month')">Bulan</button>
          <button class="px-4 py-1.5 text-label-sm ${calendarState.view === 'week' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'} transition-all" onclick="changeCalView('week')">Minggu</button>
          <button class="px-4 py-1.5 text-label-sm ${calendarState.view === 'list' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'} transition-all" onclick="changeCalView('list')">Daftar</button>
        </div>
        ${calendarState.view === 'list' ? `
        <select class="input py-1.5 text-sm !w-auto min-w-[110px]" onchange="filterCalStatus(this.value)">
          <option value="">Semua</option>
          ${['draft','pending_review','pending_approval','scheduled','posted'].map(s => `<option value="${s}" ${calendarState.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}
        </select>` : ''}
          <button class="btn btn-primary btn-sm" onclick="openCreateContent()">
            <span class="material-symbols-outlined text-lg">add</span>
          Konten Baru
          </button>
        </div>
      </div>
      <div id="${calContainerId}"></div>
    `;
    const calContainer = document.getElementById(calContainerId);
    if (calendarState.view === 'month') {
      calContainer.innerHTML = renderCalMonthHTML(allContents);
      calContainer.classList.add('content-fade-in');
    } else if (calendarState.view === 'week') {
      calContainer.innerHTML = renderCalWeekHTML(allContents);
      calContainer.classList.add('content-fade-in');
    } else {
      calContainer.innerHTML = renderCalListHTML(allContents);
      calContainer.classList.add('content-fade-in');
    }
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

function changeCalView(view) {
  calendarState.view = view;
  navigate('calendar');
}
function filterCalStatus(status) {
  calendarState.status = status;
  navigate('calendar');
}

function changeCalMonth(delta) {
  const d = calendarState.currentDate;
  calendarState.currentDate = new Date(d.getFullYear(), d.getMonth() + delta, 1);
  navigate('calendar');
}

function todayStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function renderCalMonthHTML(contents) {
  const d = calendarState.currentDate;
  const y = d.getFullYear();
  const m = d.getMonth();
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();
  const today = new Date();

  const statusColors = {
    draft: 'bg-[#b0a6a0]/30 text-text-secondary',
    pending_review: 'bg-warning-bg text-warning',
    pending_approval: 'bg-accent-subtle text-accent',
    revision_requested: 'bg-accent-subtle text-accent-hover',
    scheduled: 'bg-success-bg text-success',
    posted: 'bg-accent-subtle text-accent-hover'
  };

  function truncate(str, len) {
    return str && str.length > len ? str.slice(0, len) + '..' : str;
  }

  let html = `
    <div class="cal-header">
      <div class="cal-nav">
        <button class="btn btn-ghost btn-icon" onclick="changeCalMonth(-1)">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <h3 class="font-display text-display-sm text-text-primary min-w-[200px] text-center">${monthNames[m]} ${y}</h3>
        <button class="btn btn-ghost btn-icon" onclick="changeCalMonth(1)">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="calendarState.currentDate=new Date();navigate('calendar')">
          <span class="material-symbols-outlined text-sm">today</span>
        Hari Ini
      </button>
    </div>
    <div class="card overflow-hidden">
      <div class="cal-grid">
        ${['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => `<div class="cal-day-header">${d}</div>`).join('')}
  `;

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><div class="cal-day-number">${daysInPrev - i}</div></div>`;
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = todayStr(today) === dateStr;
    const dayContents = contents.filter(c => c.posting_date === dateStr);
    const maxVisible = 2;
    const visible = dayContents.slice(0, maxVisible);
    const remaining = dayContents.length - maxVisible;
    html += `<div class="cal-day ${isToday ? 'today' : ''}"
        ondragover="event.preventDefault();this.style.background='rgba(255,22,149,0.06)'"
        ondragleave="this.style.background=''"
        ondrop="dropCalEvent(event,'${dateStr}')">
      <div class="cal-day-number">${day}</div>
      ${visible.length ? visible.map(c => `
        <div class="cal-event ${statusColors[c.status] || 'bg-surface-hover'}" draggable="true"
             ondragstart="dragCalEvent(event,'${c.id}')"
             onclick="event.stopPropagation();openContentDetail('${c.id}')" title="${c.title}">
          ${truncate(c.title, 18)}
        </div>
      `).join('') : ''}
      ${remaining > 0 ? `<div class="cal-more" onclick="event.stopPropagation();openCalDay('${dateStr}')">+${remaining} lainnya</div>` : ''}
    </div>`;
  }

  // Next month days
  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-day other-month"><div class="cal-day-number">${i}</div></div>`;
  }

  html += '</div></div>';
  return html;
}

function renderCalWeekHTML(contents) {
  const d = calendarState.currentDate;
  const y = d.getFullYear();
  const m = d.getMonth();
  const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const startOfMonth = new Date(y, m, 1);
  const endOfMonth = new Date(y, m + 1, 0);
  const days = [];
  for (let dt = new Date(startOfMonth); dt <= endOfMonth; dt.setDate(dt.getDate() + 1)) {
    days.push(new Date(dt));
  }

  const statusColors = {
    draft: 'bg-[#b0a6a0]/30 text-text-secondary',
    pending_review: 'bg-warning-bg text-warning',
    pending_approval: 'bg-accent-subtle text-accent',
    revision_requested: 'bg-accent-subtle text-accent-hover',
    scheduled: 'bg-success-bg text-success',
    posted: 'bg-accent-subtle text-accent-hover'
  };

  const today = new Date();
  let html = `
    <div class="cal-header">
      <div class="cal-nav">
        <button class="btn btn-ghost btn-icon" onclick="changeCalMonth(-1)">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <h3 class="font-display text-display-sm text-text-primary">${monthNames[m]} ${y}</h3>
        <button class="btn btn-ghost btn-icon" onclick="changeCalMonth(1)">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="calendarState.currentDate=new Date();navigate('calendar')">
          <span class="material-symbols-outlined text-sm">today</span>
        Hari Ini
      </button>
    </div>
    <div class="card overflow-hidden">
      <div class="cal-grid cal-week-view">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-day-header">${d}</div>`).join('')}
  `;

  for (let i = 0; i < days.length; i++) {
    const dt = days[i];
    const dateStr = todayStr(dt);
    const isToday = todayStr(today) === dateStr;
    const dayContents = contents.filter(c => c.posting_date === dateStr);
    html += `<div class="cal-day ${isToday ? 'today' : ''}" onclick="openCalDay('${dateStr}')">
      <div class="cal-day-number">${dt.getDate()}</div>
      ${dayContents.slice(0, 4).map(c => `
        <div class="cal-event ${statusColors[c.status] || 'bg-surface-hover'}" onclick="event.stopPropagation();openContentDetail('${c.id}')" title="${c.title}">${c.content_plan_id ? '<span class="text-[9px] uppercase tracking-wider opacity-60 mr-1">📋</span>' : ''}${c.title}</div>
      `).join('')}
      ${dayContents.length > 4 ? `<div class="text-[10px] text-text-muted px-1">+${dayContents.length - 4}</div>` : ''}
    </div>`;
  }
  html += '</div></div>';
  return html;
}

function renderCalListHTML(contents) {
  const filtered = calendarState.status ? contents.filter(c => c.status === calendarState.status) : contents;
  const sorted = [...filtered].sort((a, b) => (a.posting_date || '').localeCompare(b.posting_date || ''));
  let html = `
    <div class="card overflow-hidden">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th class="cursor-pointer select-none hover:text-accent" onclick="reportDateOrder = reportDateOrder === 'ASC' ? 'DESC' : 'ASC'; navigate('report')">Tanggal ${reportDateOrder === 'ASC' ? '▲' : '▼'}</th><th>Judul</th><th>Platform</th><th>Status</th><th>Pembuat</th></tr>
          </thead>
          <tbody>
            ${sorted.length ? sorted.map(c => `
              <tr class="cursor-pointer" onclick="openContentDetail('${c.id}')">
                <td class="text-text-secondary text-caption">${formatDate(c.posting_date)}</td>
                <td class="font-medium">${c.title}</td>
                <td>${platformIcon(c.platform)}</td>
                <td>${statusBadge(c.status)}</td>
                <td class="text-text-secondary text-caption">${c.creator_name || '-'}</td>
              </tr>
            `).join('') : `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">calendar_month</span></div><div class="empty-state-title">Belum ada konten</div><div class="empty-state-desc">Buat konten pertama lo, yuk!</div></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
  return html;
}

function openCalDay(dateStr) {
  const dayContents = (calContents.contents || calContents || []).filter(c => c.posting_date === dateStr);
  if (!dayContents.length) {
    openCreateContent();
    return;
  }
  openModal(`Content â€” ${formatDate(dateStr)}`, `
    <div class="space-y-3">
      ${dayContents.map(c => `
        <div class="card p-4 cursor-pointer" onclick="closeModal();openContentDetail('${c.id}')">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-body-md text-text-primary">${c.title}</div>
              <div class="text-caption text-text-secondary mt-1">${c.caption ? c.caption.substring(0, 80) + '...' : 'Gak ada caption'}</div>
            </div>
            <div class="flex flex-col items-end gap-2">
              ${platformIcon(c.platform)}
              ${statusBadge(c.status)}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>`);
}

/* ========================================================================
   ====== CONTENT CRUD (from Calendar) ====================================
   ======================================================================== */
async function openCreateContent() {
  try {
    const usersData = await api('/api/users');
    const users = usersData.users || [];
    openModal('Konten Baru', `
      <form id="contentForm" onsubmit="return false" class="space-y-4">
        <div class="form-group">
          <label class="form-label">Judul <span class="text-error">*</span></label>
          <input class="input" id="content_title" required placeholder="Judul konten">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">Platform</label>
            <select class="input" id="content_platform">
              <option value="ig">Instagram</option><option value="tiktok">TikTok</option><option value="both">Dua-duanya</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal Posting</label>
            <input class="input" id="content_date" type="date">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Caption</label>
          <textarea class="input" id="content_caption" rows="3" placeholder="Caption konten..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Catatan</label>
          <textarea class="input" id="content_notes" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">URL Media</label>
          <input class="input" id="content_media" placeholder="https://">
        </div>
        <div class="form-group">
          <label class="form-label">Link Canva</label>
          <input class="input" id="content_canva" placeholder="https://canva.com/...">
        </div>
        ${currentUser.role !== 'creator' ? `
        <div class="form-group">
          <label class="form-label">Assign ke</label>
          <select class="input" id="content_creator">
            <option value="${currentUser.id}">${currentUser.display_name} (gue)</option>
            ${users.filter(u => u.id !== currentUser.id).map(u => `<option value="${u.id}">${u.display_name}</option>`).join('')}
          </select>
        </div>` : ''}
      </form>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="createContent()">Buat</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function createContent() {
  const title = document.getElementById('content_title').value;
  if (!title) { toast('Judul wajib diisi', 'error'); return; }
  try {
    await api('/api/contents', {
      method: 'POST',
      body: JSON.stringify({
        title,
        platform: document.getElementById('content_platform').value,
        posting_date: document.getElementById('content_date').value,
        caption: document.getElementById('content_caption').value,
        notes: document.getElementById('content_notes').value,
        media_url: document.getElementById('content_media').value,
        canva_link: document.getElementById('content_canva').value,
        creator_id: document.getElementById('content_creator') ? document.getElementById('content_creator').value : currentUser.id
      })
    });
    toast('Konten berhasil dibuat!');
    closeModal();
    navigate('calendar');
  } catch(e) { toast(e.message, 'error'); }
}

async function openContentDetail(id) {
  try {
    const data = await api('/api/contents');
    const all = data.contents || data;
    const c = Array.isArray(all) ? all.find(x => x.id === id) : all;
    if (!c) { toast('Konten gak ditemukan', 'error'); return; }
    openModal(c.title, `
      <div class="space-y-4">
        <div class="flex items-center gap-3 flex-wrap">
          ${platformIcon(c.platform)}
          ${statusBadge(c.status)}
        </div>
        ${c.caption ? `<div class="form-group"><span class="form-label">Caption</span><div class="text-body-md bg-surface-hover p-3 rounded-input">${c.caption}</div></div>` : ''}
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group"><span class="form-label">Tanggal</span><div class="text-body-md font-medium">${formatDate(c.posting_date)}</div></div>
          <div class="form-group"><span class="form-label">Pembuat</span><div class="text-body-md font-medium">${c.creator_name || '-'}</div></div>
        </div>
        ${c.notes ? `<div class="form-group"><span class="form-label">Catatan</span><div class="text-body-md">${c.notes}</div></div>` : ''}
        ${c.media_url ? `<div class="form-group"><span class="form-label">Media</span><a href="${c.media_url}" target="_blank" class="text-accent hover:underline inline-flex items-center gap-1"><span class="material-symbols-outlined text-sm">open_in_new</span>Lihat Media</a></div>` : ''}
        ${c.canva_link ? `<div class="form-group"><span class="form-label">Link Canva</span><a href="${c.canva_link}" target="_blank" class="text-accent hover:underline inline-flex items-center gap-1"><span class="material-symbols-outlined text-sm">open_in_new</span>Buka Canva</a></div>` : ''}
        <div class="grid grid-cols-2 gap-2 text-caption text-text-secondary">
          <span>Dibuat: ${formatDateTime(c.created_at)}</span>
          ${c.updated_at ? `<span>Diupdate: ${formatDateTime(c.updated_at)}</span>` : ''}
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
      ${c.status === 'draft' ? `<button class="btn btn-primary" onclick="closeModal();submitContent('${id}')">Kirim buat Review</button>` : ''}
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function submitContent(id) {
  try {
    await api(`/api/contents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'pending_review' })
    });
    toast('Konten dikirim buat review!');
    navigate('calendar');
  } catch(e) { toast(e.message, 'error'); }
}

/* ========================================================================
   ====== APPROVAL ========================================================
   ======================================================================== */
async function renderApproval(el) {
  el.innerHTML = `<div class="space-y-4"><div class="grid grid-cols-2 gap-4"><div class="skeleton h-28"></div><div class="skeleton h-28"></div></div><div class="skeleton h-96 rounded-card"></div></div>`;
  try {
    const data = await api('/api/contents');
    const isAdmin = currentUser.role === 'admin';
    let items = data.contents || [];

    if (isAdmin) {
      items = items.filter(c => c.status === 'pending_review' || c.status === 'pending_approval');
    } else {
      // Creator sees their own submitted content history
      items = items.filter(c => c.creator_id === currentUser.id &&
        ['pending_review','pending_approval','revision_requested','approved','scheduled'].includes(c.status));
    }

    const pendingReview = items.filter(c => c.status === 'pending_review');
    const pendingApproval = items.filter(c => c.status === 'pending_approval');
    const revisions = items.filter(c => c.status === 'revision_requested');
    const approved = items.filter(c => c.status === 'scheduled' || c.status === 'approved');

    // Build stat cards (can't nest backticks inside template literal)
    var cardsHtml = '';
    if (isAdmin) {
      cardsHtml = '<div class="card p-5"><div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-lg bg-warning-bg flex items-center justify-center"><span class="material-symbols-outlined text-warning">rate_review</span></div><div><div class="text-title-md text-text-primary">Perlu Direview</div><div class="font-display text-display-md text-text-primary font-bold">' + pendingReview.length + '</div></div></div></div><div class="card p-5"><div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center"><span class="material-symbols-outlined text-accent">verified</span></div><div><div class="text-title-md text-text-primary">Pending Approval</div><div class="font-display text-display-md text-accent font-bold">' + pendingApproval.length + '</div></div></div></div>';
    } else {
      cardsHtml = '<div class="card p-5"><div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-lg bg-warning-bg flex items-center justify-center"><span class="material-symbols-outlined text-warning">rate_review</span></div><div><div class="text-title-md text-text-primary">Direview</div><div class="font-display text-display-md text-text-primary font-bold">' + pendingReview.length + '</div></div></div></div><div class="card p-5"><div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center"><span class="material-symbols-outlined text-accent">verified</span></div><div><div class="text-title-md text-text-primary">Di-approve</div><div class="font-display text-display-md text-accent font-bold">' + approved.length + '</div></div></div></div><div class="card p-5"><div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center"><span class="material-symbols-outlined text-error">edit_note</span></div><div><div class="text-title-md text-text-primary">Revisi</div><div class="font-display text-display-md text-error font-bold">' + revisions.length + '</div></div></div></div><div class="card p-5"><div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center"><span class="material-symbols-outlined text-accent">event_available</span></div><div><div class="text-title-md text-text-primary">Terjadwal</div><div class="font-display text-display-md text-accent font-bold">' + approved.length + '</div></div></div></div>';
    }

    let html = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-display text-display-sm text-text-primary tracking-tight">${isAdmin ? 'Workflow Approval' : 'Status Pengajuanku'}</h2>
      </div>
      <div class="grid grid-cols-2${isAdmin ? '' : ' md:grid-cols-4'} gap-4 mb-6">
        ${cardsHtml}
      </div>
    `;

    if (!items.length) {
      html += `<div class="card p-12"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">verified</span></div><div class="empty-state-title">${isAdmin ? 'Aman semua' : 'Belum ada pengajuan'}</div><div class="empty-state-desc">${isAdmin ? 'Gak ada konten yang perlu direview atau di-approve' : 'Konten yang lo kirim buat review bakal muncul di sini'}</div></div></div>`;
    } else {
      html += `<div class="card overflow-hidden"><div class="table-wrap"><table><thead><tr><th>Judul</th><th>${isAdmin ? 'Pembuat' : 'Status'}</th><th>Tanggal</th><th>Status</th><th>Link Canva</th><th>Aksi</th></tr></thead><tbody>`;
      items.forEach(c => {
        html += `
          <tr>
            <td class="font-medium">${c.title}</td>
            <td class="text-text-secondary">${isAdmin ? (c.creator_name || '-') : statusBadge(c.status)}</td>
            <td class="text-text-secondary text-caption">${formatDate(c.posting_date)}</td>
            <td>${statusBadge(c.status)}</td>
            <td>${c.canva_link ? `<a href="${c.canva_link}" target="_blank" class="text-accent hover:underline inline-flex items-center gap-1 text-caption"><span class="material-symbols-outlined text-sm">open_in_new</span>Canva</a>` : '<span class="text-caption text-text-muted">—</span>'}</td>
            <td>
              <div class="flex gap-1.5 flex-wrap">
                <button class="btn btn-ghost btn-sm" onclick="openApprovalDetail('${c.id}')">
                  <span class="material-symbols-outlined text-sm">visibility</span> Lihat
                </button>
                ${isAdmin ? `
                  <button class="btn btn-primary btn-sm" onclick="approveContent('${c.id}','schedule')">
                    <span class="material-symbols-outlined text-sm">check</span> Setujui
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="requestRevision('${c.id}')">
                    <span class="material-symbols-outlined text-sm">edit</span> Revisi
                  </button>
                ` : ''}
                ${!isAdmin && c.status === 'revision_requested' ? `
                  <button class="btn btn-secondary btn-sm" onclick="openRevisionReply('${c.id}')">
                    <span class="material-symbols-outlined text-sm">edit</span> Perbaiki
                  </button>
                ` : ''}
                <button class="btn btn-ghost btn-sm text-error" onclick="deleteContent('${c.id}','${c.title.replace(/'/g,"\\'")}')">
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </td>
          </tr>`;
      });
      html += `</tbody></table></div></div>`;
    }
    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

async function openRevisionReply(id) {
  const data = await api('/api/contents');
  const c = (data.contents || []).find(x => x.id === id);
  if (!c) { toast('Konten gak ditemukan', 'error'); return; }
  openModal('Perbaiki Konten', `
    <div class="space-y-4">
      ${c.revision_feedback ? `<div class="form-group"><span class="form-label">Feedback Admin</span><div class="text-body-md bg-warning-bg p-3 rounded-input">${c.revision_feedback}</div></div>` : ''}
      <div class="form-group">
        <label class="form-label">Link Canva (hasil revisi)</label>
        <input class="input" id="revise_canva" placeholder="https://canva.com/..." value="${c.canva_link||''}">
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="resubmitRevision('${id}')">Kirim Ulang</button>
  `);
}

async function resubmitRevision(id) {
  const canva = document.getElementById('revise_canva').value;
  try {
    // Update canva link and resubmit for review
    await api('/api/contents/' + id, {
      method: 'PUT',
      body: JSON.stringify({ canva_link: canva })
    });
    await api('/api/contents/' + id + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status: 'pending_review' })
    });
    toast('Revisi udah dikirim ulang!');
    closeModal();
    navigate('approval');
  } catch(e) { toast(e.message, 'error'); }
}

async function openApprovalDetail(id) {
  try {
    const data = await api('/api/contents');
    const all = data.contents || data;
    const c = Array.isArray(all) ? all.find(x => x.id === id) : all;
    if (!c) { toast('Konten gak ditemukan', 'error'); return; }
    openModal(c.title, `
      <div class="space-y-4">
        <div class="flex items-center gap-3 flex-wrap">
          ${platformIcon(c.platform)}
          ${statusBadge(c.status)}
        </div>
        ${c.caption ? `<div class="form-group"><span class="form-label">Caption</span><div class="text-body-md bg-surface-hover p-3 rounded-input">${c.caption}</div></div>` : ''}
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group"><span class="form-label">Tanggal</span><div class="text-body-md font-medium">${formatDate(c.posting_date)}</div></div>
          <div class="form-group"><span class="form-label">Pembuat</span><div class="text-body-md font-medium">${c.creator_name || '-'}</div></div>
        </div>
        ${c.revision_feedback ? `<div class="form-group"><span class="form-label">Feedback Revisi</span><div class="text-body-md bg-warning-bg p-3 rounded-input">${c.revision_feedback}</div></div>` : ''}
        ${c.canva_link ? `<div class="form-group"><span class="form-label">Link Canva</span><a href="${c.canva_link}" target="_blank" class="text-accent hover:underline inline-flex items-center gap-1"><span class="material-symbols-outlined text-sm">open_in_new</span>Buka Canva</a></div>` : ''}
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

function deleteContent(id, title) {
  openModal('Hapus Konten', `
    <div class="text-center py-4">
      <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
        <span class="material-symbols-outlined text-3xl text-error">delete_forever</span>
      </div>
      <p class="text-body-md text-text-primary mb-1">Yakin mau hapus konten ini?</p>
      <p class="text-title-md font-semibold text-text-primary mb-3">"${title}"</p>
      <p class="text-caption text-text-secondary">Konten akan dihapus permanen dari semua halaman.</p>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn !bg-error !text-white hover:!bg-[#b91c1c]" onclick="confirmDeleteContent('${id}')">Yakin, Hapus</button>
  `);
}

async function confirmDeleteContent(id) {
  try {
    await api('/api/contents/' + id, { method: 'DELETE' });
    toast('Konten berhasil dihapus');
    closeModal();
    navigate('approval');
  } catch(e) { toast(e.message, 'error'); }
}

async function approveContent(id, action) {
  const status = action === 'forward' ? 'pending_approval' : 'scheduled';
  try {
    await api(`/api/contents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    if (action === 'schedule') {
      await api(`/api/contents/${id}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({ posting_date: '', posting_time: '10:00' })
      }).catch(() => {});
    }
    toast(action === 'forward' ? 'Disetujui & dilanjutkan!' : 'Disetujui & dijadwalkan!');
    navigate('approval');
  } catch(e) { toast(e.message, 'error'); }
}

function requestRevision(id) {
  openModal('Minta Revisi', `
    <div class="form-group">
      <label class="form-label">Feedback <span class="text-error">*</span></label>
      <textarea class="input" id="revisionFeedback" rows="4" placeholder="Apa yang perlu direvisi?"></textarea>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="submitRevision('${id}')">Kirim Feedback</button>
  `);
}

async function submitRevision(id) {
  const feedback = document.getElementById('revisionFeedback').value;
  if (!feedback) { toast('Feedback wajib diisi', 'error'); return; }
  try {
    await api(`/api/contents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'revision_requested', feedback })
    });
    toast('Revisi udah diminta!');
    closeModal();
    navigate('approval');
  } catch(e) { toast(e.message, 'error'); }
}

/* ========================================================================
   ====== CONTENT HUB =====================================================
   ======================================================================== */
const FOLDERS = [
  { id: 'caption', name: 'Template Caption', icon: 'text_fields' },
  { id: 'hooks', name: 'Hook & Headline', icon: 'format_quote' },
  { id: 'reels', name: 'Draf Reels', icon: 'video_library' },
  { id: 'design', name: 'Template Desain', icon: 'frame_source' },
  { id: 'brand', name: 'Panduan Brand', icon: 'book' }
];

async function renderHub(el) {
  el.innerHTML = `<div class="space-y-4"><div class="skeleton h-48"></div><div class="skeleton h-64"></div></div>`;
  try {
    const data = await api('/api/items');
    const items = data.items || [];

    el.innerHTML = `
      <div class="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h2 class="font-display text-display-sm text-text-primary tracking-tight">Pusat Konten</h2>
        <button class="btn btn-primary btn-sm" onclick="openUploadItem()">
          <span class="material-symbols-outlined text-lg">upload</span>
          Upload
        </button>
      </div>

      <div class="grid grid-cols-5 gap-3 mb-6">
        ${FOLDERS.map(f => `
          <button class="card p-4 text-center card-hoverable ${selectedFolder === f.id ? '!border-accent !bg-accent-subtle' : ''}" onclick="selectFolder('${f.id}')">
            <div class="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center mx-auto mb-2">
              <span class="material-symbols-outlined text-text-secondary">${f.icon}</span>
            </div>
            <div class="text-label-sm text-text-primary">${f.name}</div>
          </button>
        `).join('')}
        <button class="card p-4 text-center card-hoverable ${!selectedFolder ? '!border-accent !bg-accent-subtle' : ''}" onclick="selectFolder(null)">
          <div class="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center mx-auto mb-2">
            <span class="material-symbols-outlined text-text-secondary">folder</span>
          </div>
          <div class="text-label-sm text-text-primary">Semua Item</div>
        </button>
      </div>

      <div class="card overflow-hidden">
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Nama</th><th>Folder</th><th>Tipe</th><th>Diunggah</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              ${items.filter(i => !selectedFolder || i.folder_id === selectedFolder).length ? items.filter(i => !selectedFolder || i.folder_id === selectedFolder).map(i => {
                const fileIcon = i.file_type === 'image' ? 'image' : i.file_type === 'video' ? 'video_file' : i.file_path ? (i.file_path.match(/\.pdf$/i) ? 'picture_as_pdf' : i.file_path.match(/\.(doc|docx)$/i) ? 'description' : i.file_path.match(/\.(xls|xlsx|csv)$/i) ? 'table_chart' : 'article') : 'article';
                return `<tr>
                  <td class="font-medium">${i.title || i.name}</td>
                  <td><span class="text-caption px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary">${FOLDERS.find(f => f.id === i.folder_id)?.name || i.folder_id || '-'}</span></td>
                  <td class="text-text-secondary">
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-sm">${fileIcon}</span>
                      ${i.file_path ? (i.file_path.match(/\.pdf$/i) ? 'PDF' : i.file_path.match(/\.(doc|docx)$/i) ? 'DOC' : i.file_path.match(/\.(xls|xlsx)$/i) ? 'XLS' : i.file_path.match(/\.csv$/i) ? 'CSV' : i.file_path.match(/\.(png|jpg|jpeg)$/i) ? 'Image' : i.file_type || 'text') : (i.file_type || 'text')}
                    </span>
                  </td>
                  <td class="text-text-secondary text-caption">${formatDateTime(i.created_at)}</td>
                  <td>
                    <div class="flex gap-1">
                      ${i.file_path ? `<a href="${i.file_path}" target="_blank" class="btn btn-ghost btn-sm !px-2" title="Download">
                        <span class="material-symbols-outlined text-sm">download</span>
                      </a>` : ''}
                      <button class="btn btn-ghost btn-sm !px-2" onclick="viewHubItem('${i.id}')" title="Lihat">
                        <span class="material-symbols-outlined text-sm">visibility</span>
                      </button>
                      <button class="btn btn-ghost btn-sm !px-2" onclick="useAsDraft('${i.id}')" title="Use as Draft">
                        <span class="material-symbols-outlined text-sm">add_circle</span>
                      </button>
                      <button class="btn btn-ghost btn-sm !px-2 text-error" onclick="deleteHubItem('${i.id}')" title="Delete">
                        <span class="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">photo_library</span></div><div class="empty-state-title">Kosong</div><div class="empty-state-desc">Upload item pertama lo, yuk!</div></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

function selectFolder(folderId) {
  selectedFolder = folderId;
  navigate('hub');
}

function openUploadItem() {
  openModal('Upload Item', `
    <form id="uploadForm" class="space-y-4" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">Judul <span class="text-error">*</span></label>
        <input class="input" id="hub_title" required placeholder="Judul item">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Folder</label>
          <select class="input" id="hub_folder">
            ${FOLDERS.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Kategori</label>
          <input class="input" id="hub_category" placeholder="Contoh: caption, design">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">File <span class="text-text-muted">(opsional)</span></label>
        <div class="relative">
          <input class="input file-input" id="hub_file" type="file" accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.csv" onchange="updateFileName(this)">
          <label for="hub_file" class="flex items-center gap-2 text-text-secondary cursor-pointer">
            <span class="material-symbols-outlined text-lg">upload_file</span>
            <span id="fileLabel">Pilih PNG, PDF, DOC, XLS, atau CSV</span>
          </label>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Link Canva</label>
          <input class="input" id="hub_canva" placeholder="https://canva.com/...">
        </div>
        <div class="form-group">
          <label class="form-label">Keterangan Page</label>
          <input class="input" id="hub_page" placeholder="cover motion : page 1-18">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Deskripsi</label>
        <textarea class="input" id="hub_description" rows="3" placeholder="Deskripsi item (opsional)"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Tags</label>
        <input class="input" id="hub_tags" placeholder="Tag pisah pake koma">
      </div>
    </form>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="uploadHubItem()">Upload</button>
  `);
}

// File input label updater
window.updateFileName = function(input) {
  const label = document.getElementById('fileLabel');
  if (input.files && input.files[0]) {
    label.textContent = input.files[0].name + ' (' + (input.files[0].size / 1024).toFixed(1) + ' KB)';
  } else {
    label.textContent = 'Pilih PNG, PDF, DOC, XLS, atau CSV';
  }
};

async function uploadHubItem() {
  const title = document.getElementById('hub_title').value;
  const fileInput = document.getElementById('hub_file');
  if (!title) { toast('Judul wajib diisi', 'error'); return; }

  const formData = new FormData();
  if (fileInput.files && fileInput.files[0]) formData.append('file', fileInput.files[0]);
  formData.append('title', title);
  formData.append('folder_id', document.getElementById('hub_folder').value);
  formData.append('description', document.getElementById('hub_description').value);
  formData.append('tags', document.getElementById('hub_tags').value);
  formData.append('category', document.getElementById('hub_category').value);
  formData.append('canva_link', document.getElementById('hub_canva').value);
  formData.append('page_notes', document.getElementById('hub_page').value);

  try {
    const res = await fetch('/api/items', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload gagal');
    }
    toast('Item berhasil diupload!');
    closeModal();
    navigate('hub');
  } catch(e) { toast(e.message, 'error'); }
}

async function viewHubItem(id) {
  try {
    const data = await api('/api/items');
    const item = data.items.find(i => i.id === id);
    if (!item) { toast('Item gak ditemukan', 'error'); return; }
    openModal(item.title, `
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <span class="text-caption px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary">${FOLDERS.find(f => f.id === item.folder_id)?.name || item.folder_id || '-'}</span>
          <span class="text-caption px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary">${item.file_type || 'text'}</span>
        </div>
        ${item.description ? `<div class="text-body-md bg-surface-hover p-4 rounded-input whitespace-pre-wrap">${item.description}</div>` : ''}
        ${item.file_path ? `<div class="form-group"><span class="form-label">File</span><a href="${item.file_path}" target="_blank" class="text-accent hover:underline inline-flex items-center gap-1"><span class="material-symbols-outlined text-sm">open_in_new</span>Lihat File</a></div>` : ''}
        <div class="text-caption text-text-secondary">Diunggah ${formatDateTime(item.created_at)}${item.created_by_name ? ' oleh ' + item.created_by_name : ''}</div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
      <button class="btn btn-primary" onclick="closeModal();useAsDraft('${id}')">Pakai sebagai Draf</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function useAsDraft(id) {
  try {
    const data = await api('/api/items');
    const item = data.items.find(i => i.id === id);
    if (!item) { toast('Item gak ditemukan', 'error'); return; }
    await api('/api/contents', {
      method: 'POST',
      body: JSON.stringify({
        title: item.title,
        caption: item.description || '',
        platform: 'ig',
        creator_id: currentUser.id
      })
    });
    toast('Draf berhasil dibuat dari item!');
    navigate('calendar');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteHubItem(id) {
  try {
    const data = await api('/api/items');
    const item = data.items.find(i => i.id === id);
    const itemName = item ? item.title || item.name : 'item ini';
    openModal('Hapus Item', `
      <div class="text-center py-2">
        <div class="w-16 h-16 rounded-2xl bg-error-bg flex items-center justify-center mx-auto mb-5">
          <span class="material-symbols-outlined text-error text-3xl" style="font-variation-settings:'FILL'1">delete_forever</span>
        </div>
        <h3 class="text-title-lg text-text-primary mb-2">Hapus "${itemName}"?</h3>
        <p class="text-body-md text-text-secondary max-w-[320px] mx-auto">Ini gak bisa dibalikin, ya. File dan datanya bakal ilang permanen.</p>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn !bg-error !text-white hover:!bg-[#b91c1c]" onclick="confirmDeleteItem('${id}')">
        <span class="material-symbols-outlined text-lg">delete</span>
        Hapus Permanen
      </button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function confirmDeleteItem(id) {
  try {
    await api(`/api/items/${id}`, { method: 'DELETE' });
    closeModal();
    toast('Item berhasil dihapus');
    navigate('hub');
  } catch(e) { toast(e.message, 'error'); }
}

/* ========================================================================
   ====== PROMO MANAGER ===================================================
   ======================================================================== */
async function renderPromo(el) {
  el.innerHTML = `<div class="space-y-4"><div class="skeleton h-12"></div><div class="skeleton h-96 rounded-card"></div></div>`;
  try {
    const data = await api('/api/promos');
    const promos = data.promos || [];

    el.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-display text-display-sm text-text-primary tracking-tight">Promo</h2>
        <button class="btn btn-primary btn-sm" onclick="openCreatePromo()">
          <span class="material-symbols-outlined text-lg">add</span> Promo Baru
        </button>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${promos.length ? promos.map(p => `
          <div class="card p-5 ${p.status === 'active' || p.status == null ? '' : 'opacity-55'}">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-title-md text-text-primary">${p.name}</h3>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-caption px-2 py-0.5 rounded-full ${(p.status === 'active' || p.status == null) ? 'bg-success-bg text-success' : 'bg-surface-hover text-text-secondary'}">${(p.status === 'active' || p.status == null) ? 'Aktif' : 'Nonaktif'}</span>
                  <span class="text-caption text-text-secondary">${p.subsidy_type === 'percentage' ? p.subsidy_value + '%' : formatRupiah(p.subsidy_value)} off</span>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm ${(p.status === 'active' || p.status == null) ? 'text-warning' : 'text-success'}" onclick="togglePromo('${p.id}')">
                <span class="material-symbols-outlined">${(p.status === 'active' || p.status == null) ? 'toggle_on' : 'toggle_off'}</span>
              </button>
            </div>
            ${p.allocation ? `
              <div class="mt-4">
                <div class="text-label-sm text-text-secondary mb-2">${p.promo_type === 'all_item' ? 'Semua Item' : 'Alokasi Cabang'}</div>
                <div class="space-y-1.5">
                  ${(typeof p.allocation === 'string' ? JSON.parse(p.allocation) : p.allocation).map(b => `
                    <div class="flex items-center justify-between text-body-sm">
                      <span class="text-text-primary">${b.branch || b.name}</span>
                      <span class="font-medium">${b.pct || b.allocation}%</span>
                    </div>
                  `).join('')}
                </div>
                <div class="mt-3 pt-3 border-t border-border-light flex justify-between text-body-sm font-medium">
                  <span>Harga Dasar</span>
                  <span>${formatRupiah(p.base_price)}</span>
                </div>
              </div>
            ` : ''}
          </div>
        `).join('') : `<div class="lg:col-span-2 card p-12"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">campaign</span></div><div class="empty-state-title">Belum ada promo</div><div class="empty-state-desc">Buat promo pertama lo, yuk!</div></div></div>`}
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

async function togglePromo(id) {
  try {
    const data = await api('/api/promos');
    const p = data.promos.find(x => x.id === id);
    if (!p) { toast('Promo gak ditemukan', 'error'); return; }
    const newStatus = (p.status === 'active' || p.status == null) ? 'inactive' : 'active';
    await api(`/api/promos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    toast(newStatus === 'active' ? 'Promo diaktifkan' : 'Promo dinonaktifkan');
    navigate('promo');
  } catch(e) { toast(e.message, 'error'); }
}

function openCreatePromo() {
  openModal('Promo Baru', `
    <form id="promoForm" class="space-y-4" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">Nama Promo <span class="text-error">*</span></label>
        <input class="input" id="promo_name" placeholder="Contoh: Ramadhan Sale">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Tipe</label>
          <select class="input" id="promo_type">
            <option value="fixed">Fixed (Rp)</option><option value="percentage">Persen (%)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nilai</label>
          <input class="input" id="promo_value" type="number" placeholder="Jumlah">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Harga Dasar</label>
        <input class="input" id="promo_base" type="number" placeholder="Harga dasar">
      </div>
      <div class="form-group">
        <label class="form-label">Cakupan Promo</label>
        <div class="flex bg-surface border border-border-light rounded-input overflow-hidden w-fit">
          <button type="button" class="scope-btn px-4 py-1.5 text-label-sm bg-accent text-white transition-all" data-scope="branch" onclick="setPromoScope('branch')">Per Cabang</button>
          <button type="button" class="scope-btn px-4 py-1.5 text-label-sm text-text-secondary hover:text-text-primary transition-all" data-scope="all_item" onclick="setPromoScope('all_item')">Semua Item</button>
        </div>
        <input type="hidden" id="promo_scope" value="branch">
      </div>
      <div id="branchScopeSection">
        <div class="form-group">
          <label class="form-label">Alokasi Cabang (total harus 100%)</label>
          <div id="branchAllocs" class="space-y-2">
            <div class="flex gap-2 items-center">
              <input class="input flex-1" placeholder="Nama cabang" id="branch_name_0">
              <input class="input w-24" type="number" placeholder="%" id="branch_pct_0" value="100">
            </div>
          </div>
          <button type="button" class="text-label-sm text-accent hover:underline mt-1" onclick="addBranchAlloc()">+ Tambah Cabang</button>
        </div>
      </div>
    </form>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="createPromo()">Buat</button>
  `);
}

function setPromoScope(scope) {
  document.getElementById('promo_scope').value = scope;
  document.querySelectorAll('.scope-btn').forEach(b => {
    const isActive = b.dataset.scope === scope;
    b.className = `scope-btn px-4 py-1.5 text-label-sm transition-all ${isActive ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`;
  });
  document.getElementById('branchScopeSection').style.display = scope === 'branch' ? '' : 'none';
}

let branchCount = 1;
function addBranchAlloc() {
  const container = document.getElementById('branchAllocs');
  const div = document.createElement('div');
  div.className = 'flex gap-2 items-center';
  div.innerHTML = `<input class="input flex-1" placeholder="Branch name" id="branch_name_${branchCount}"><input class="input w-24" type="number" placeholder="%" id="branch_pct_${branchCount}" value="0">`;
  container.appendChild(div);
  branchCount++;
}

async function createPromo() {
  const name = document.getElementById('promo_name').value;
  if (!name) { toast('Nama promo wajib diisi', 'error'); return; }
  const scope = document.getElementById('promo_scope').value;
  let allocation;
  if (scope === 'all_item') {
    allocation = [{ branch: 'Semua Item', pct: 100 }];
  } else {
    allocation = [];
    for (let i = 0; i < branchCount; i++) {
      const el = document.getElementById(`branch_name_${i}`);
      const pct = document.getElementById(`branch_pct_${i}`);
      if (el && el.value) allocation.push({ branch: el.value, pct: parseInt(pct.value) || 0 });
    }
    if (!allocation.length) { toast('Isi minimal satu cabang', 'error'); return; }
  }
  try {
    await api('/api/promos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        subsidy_type: document.getElementById('promo_type').value,
        subsidy_value: parseFloat(document.getElementById('promo_value').value) || 0,
        base_price: parseFloat(document.getElementById('promo_base').value) || 0,
        allocation,
        promo_type: scope
      })
    });
    toast('Promo berhasil dibuat!');
    closeModal();
    navigate('promo');
  } catch(e) { toast(e.message, 'error'); }
}

/* ========================================================================
   ====== TREND TRACKER ===================================================
   ======================================================================== */
const PLATFORM_CONFIG = {
  tiktok:    { label: 'TikTok',    color: '#111111',   icon: 'music_note' },
  instagram: { label: 'Instagram', color: '#e4405f',   icon: 'photo_camera' },
  threads:   { label: 'Threads',   color: '#101010',   icon: 'chat' },
  youtube:   { label: 'YouTube',   color: '#ff0000',   icon: 'play_circle' }
};

async function renderTrends(el) {
  el.innerHTML = `<div class="space-y-4"><div class="skeleton h-12"></div><div class="grid grid-cols-2 gap-4"><div class="skeleton h-48"></div><div class="skeleton h-48"></div></div></div>`;
  try {
    const data = await api('/api/trends');
    const trends = data.trends || [];
    const lastRefresh = trends.length > 0 ? trends[0].discovered_at : null;

    el.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 class="font-display text-display-sm text-text-primary tracking-tight">Pantau Tren</h2>
          ${lastRefresh ? `<p class="text-caption text-text-secondary mt-0.5">Terakhir diperbarui: ${formatDateTime(lastRefresh)} • Diperbarui tiap 2 jam oleh AI</p>` : ''}
        </div>
        <button class="btn btn-primary btn-sm flex items-center gap-1.5" onclick="fetchTrends()" id="refreshBtn">
          <span class="material-symbols-outlined text-lg">refresh</span> Refresh Sekarang
        </button>
      </div>
      ${trends.length ? `
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        ${Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
          const count = trends.filter(t => (t.platform||'').toLowerCase() === key).length;
          return count > 0 ? `<span class="inline-flex items-center gap-1 text-caption px-2.5 py-1 rounded-full font-medium" style="background:${cfg.color}18;color:${cfg.color}">${cfg.label} (${count})</span>` : '';
        }).join('')}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${trends.map(t => {
          const pf = PLATFORM_CONFIG[(t.platform||'').toLowerCase()] || PLATFORM_CONFIG.instagram;
          return `<div class="card p-4 trend-card hover:border-white/20 transition-all">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-full font-semibold" style="background:${pf.color}18;color:${pf.color}">
                    <span class="material-symbols-outlined text-sm">${pf.icon}</span>${pf.label}
                  </span>
                  ${t.volume ? `<span class="text-caption text-text-secondary">${t.volume}</span>` : ''}
                  ${t.category ? `<span class="text-caption px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary">${t.category}</span>` : ''}
                </div>
                <h3 class="text-body-md font-semibold text-text-primary leading-snug">${t.trend_name}</h3>
                ${t.notes ? `<p class="text-caption text-text-secondary mt-1.5 line-clamp-3 leading-relaxed">${t.notes}</p>` : ''}
              </div>
              <div class="flex flex-col gap-1 shrink-0">
                <button class="btn btn-ghost btn-sm !px-1 ${t.relevance === 'relevant' ? 'text-success' : 'text-text-muted'}" onclick="markTrend('${t.id}','relevant')" title="Relevan">
                  <span class="material-symbols-outlined text-lg">thumb_up</span>
                </button>
                <button class="btn btn-ghost btn-sm !px-1 ${t.relevance === 'potential' ? 'text-warning' : 'text-text-muted'}" onclick="markTrend('${t.id}','potential')" title="Potensial">
                  <span class="material-symbols-outlined text-lg">trending_up</span>
                </button>
                <button class="btn btn-ghost btn-sm !px-1 ${t.relevance === 'not_relevant' ? 'text-error' : 'text-text-muted'}" onclick="markTrend('${t.id}','not_relevant')" title="Gak Relevan">
                  <span class="material-symbols-outlined text-lg">thumb_down</span>
                </button>
              </div>
            </div>
            <div class="mt-2 text-caption text-text-muted">${formatDateTime(t.discovered_at)}</div>
          </div>`;
        }).join('')}
      </div>` : `<div class="card p-12"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">trending_up</span></div><div class="empty-state-title">Belum ada tren</div><div class="empty-state-desc">Klik "Refresh Sekarang" buat AI mencari tren terbaru dari berbagai platform</div></div></div>`}
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

async function fetchTrends() {
  const btn = document.getElementById('refreshBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">refresh</span> Mencari...'; }
  try {
    const data = await api('/api/trends/refresh', { method: 'POST' });
    toast(`${data.count} tren baru ditemukan AI!`, 'success');
    navigate('trends');
  } catch(e) {
    toast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-lg">refresh</span> Refresh Sekarang'; }
  }
}

async function markTrend(id, relevance) {
  try {
    await api(`/api/trends/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ relevance })
    });
    navigate('trends');
  } catch(e) { toast(e.message, 'error'); }
}

/* ========================================================================
   ====== ASSET GENERATOR =================================================
   ======================================================================== */
async function renderAssetGen(el) {
  el.innerHTML = `<div class="space-y-4"><div class="grid grid-cols-3 gap-4"><div class="skeleton h-64"></div><div class="skeleton h-64"></div><div class="skeleton h-64"></div></div></div>`;
  try {
    const [tplData, canvaData] = await Promise.all([
      api('/api/templates'),
      api('/api/canva-templates')
    ]);
    const templates = tplData.templates || [];
    const canvaTemplates = canvaData.templates || [];
    const canManage = currentUser && (currentUser.role === 'admin' || currentUser.role === 'creator');

    el.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="font-display text-display-sm text-text-primary tracking-tight">Buat Desain</h2>
          <p class="text-caption text-text-secondary mt-0.5">Pilih template, edit, dan download desain konten kamu</p>
        </div>
        ${canManage ? `<button class="btn btn-primary btn-sm" onclick="openAddCanvaTemplate()">
          <span class="material-symbols-outlined text-lg">add</span> Tambah Desain
        </button>` : ''}
      </div>
      <div class="card p-5 mb-6">
        <h3 class="text-title-md text-text-primary mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-accent">auto_stories</span> Cara Pakai</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0">1</div>
            <div><p class="text-body-md font-medium text-text-primary">Pilih Template Canva</p><p class="text-caption text-text-secondary">Klik template Canva brand yang mau lo pake</p></div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0">2</div>
            <div><p class="text-body-md font-medium text-text-primary">Edit di Canva</p><p class="text-caption text-text-secondary">Sesuaikan teks, foto, dan warna langsung di Canva.com</p></div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0">3</div>
            <div><p class="text-body-md font-medium text-text-primary">Download Hasil</p><p class="text-caption text-text-secondary">Download desain yang udah siap dalam format yang diinginkan</p></div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0">4</div>
            <div><p class="text-body-md font-medium text-text-primary">Upload ke Pusat Konten</p><p class="text-caption text-text-secondary">Simpan hasil desain ke Pusat Konten biar bisa dipakai konten</p></div>
          </div>
        </div>
      </div>
      ${canvaTemplates.length ? `
      <h3 class="font-display text-title-lg text-text-primary mt-8 mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-accent text-2xl">view_quilt</span> Desain Canva
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${canvaTemplates.map(t => `
          <div class="card p-5">
            ${t.thumbnail_url ? `<img src="${t.thumbnail_url}" alt="${t.name}" class="w-full h-40 object-cover rounded-lg mb-4">` : `<div class="w-full h-40 rounded-lg bg-surface-hover flex items-center justify-center mb-4"><span class="material-symbols-outlined text-4xl text-text-muted">view_quilt</span></div>`}
            <h3 class="text-title-md text-text-primary">${t.name}</h3>
            <p class="text-caption text-text-secondary mt-0.5">${t.description || 'Template Canva siap edit'}</p>
            <div class="flex items-center gap-2 mt-4">
              <a href="${canvaUrl(t.template_id)}" target="_blank" class="btn btn-primary btn-sm flex-1">
                <span class="material-symbols-outlined text-lg">open_in_new</span> Buka Canva
              </a>
              ${canManage ? `
                <button class="btn btn-ghost btn-sm" onclick="openEditCanvaTemplate('${t.id}')" title="Edit">
                  <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button class="btn btn-ghost btn-sm text-error" onclick="deleteCanvaTemplate('${t.id}')" title="Hapus">
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>` : ''}
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

async function openTemplateEditor(id) {
  try {
    const data = await api('/api/templates');
    const template = data.templates.find(t => t.id === id);
    if (!template) { toast('Template gak ditemukan', 'error'); return; }
    openModal(template.name, `
      <div class="space-y-4">
        <div class="w-full h-64 rounded-lg bg-surface-hover flex items-center justify-center">
          <span class="material-symbols-outlined text-6xl text-text-muted">auto_awesome</span>
        </div>
        <p class="text-body-md text-text-secondary">${template.description || 'Sesuaiin template ini'}</p>
        <div class="form-group">
          <label class="form-label">Teks Kustom</label>
          <input class="input" id="asset_text" placeholder="Tulis teks lo di sini">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">Warna Background</label>
            <input class="input" id="asset_bg" type="color" value="#FF1695">
          </div>
          <div class="form-group">
            <label class="form-label">Warna Teks</label>
            <input class="input" id="asset_text_color" type="color" value="#ffffff">
          </div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="exportAsset('${id}')">Export PNG</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function exportAsset(id) {
  toast('Fitur export menyusul', 'info');
  closeModal();
}

/* ========================================================================
   ====== REPORT & ANALYTICS ==============================================
   ======================================================================== */
async function renderReport(el) {
  el.innerHTML = `<div class="space-y-4"><div class="grid grid-cols-4 gap-4"><div class="skeleton h-28"></div><div class="skeleton h-28"></div><div class="skeleton h-28"></div><div class="skeleton h-28"></div></div><div class="skeleton h-96 rounded-card"></div></div>`;
  try {
    const [dash, contents] = await Promise.all([
      api('/api/dashboard'),
      api('/api/contents?limit=100')
    ]);

    const allContents = contents.contents || [];
    allContents.sort((a, b) => {
      const va = a.posting_date || '';
      const vb = b.posting_date || '';
      return reportDateOrder === 'ASC' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    const filtered = reportStatus ? allContents.filter(c => c.status === reportStatus) : allContents;
    const posted = filtered.filter(c => c.status === 'posted' || c.status === 'done');
    const scheduled = filtered.filter(c => c.status === 'scheduled');

    el.innerHTML = `
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 class="font-display text-display-sm text-text-primary tracking-tight">Laporan</h2>
      </div>
      <div class="card p-3 mb-6 flex items-center gap-2 flex-wrap">
        <select class="input py-1.5 text-sm !w-auto min-w-[130px]" onchange="filterReportStatus(this.value)">
          <option value="">Semua Status</option>
          ${['draft','pending_review','pending_approval','scheduled','posted'].map(s => `<option value="${s}" ${reportStatus === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}
        </select>
        <div class="flex-1"></div>
        <button class="btn btn-secondary btn-sm flex items-center gap-1.5" onclick="aiAnalyze()" id="aiAnalyzeBtn">
          <span class="material-symbols-outlined text-lg">psychology</span> Analisis AI
        </button>
        <button class="btn btn-secondary btn-sm" onclick="exportReport()">
          <span class="material-symbols-outlined text-lg">download</span> Export CSV
        </button>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card p-4"><div class="text-label-sm text-text-secondary mb-1">Total Postingan</div><div class="font-display text-display-sm text-text-primary font-bold">${filtered.length}</div></div>
        <div class="card p-4"><div class="text-label-sm text-text-secondary mb-1">Terposting</div><div class="font-display text-display-sm text-success font-bold">${posted.length}</div></div>
        <div class="card p-4"><div class="text-label-sm text-text-secondary mb-1">Terjadwal</div><div class="font-display text-display-sm text-text-primary font-bold">${scheduled.length}</div></div>
        <div class="card p-4"><div class="text-label-sm text-text-secondary mb-1">Pending</div><div class="font-display text-display-sm text-warning font-bold">${filtered.filter(c => c.status === 'pending_approval' || c.status === 'pending_review').length}</div></div>
      </div>
      <div id="aiAnalysisResult"></div>
      <div class="card overflow-hidden">
        <div class="px-5 py-4 border-b border-border-light flex items-center justify-between">
          <h3 class="text-title-md text-text-primary">Detail Konten</h3>
          <div id="reportBulkBar" class="bulk-bar" style="display:none;position:static;margin:0;padding:4px 10px;gap:6px;">
            <span class="bulk-count" style="font-size:12px;"></span>
            <button class="btn btn-sm bulk-delete" onclick="bulkDeleteContents()" style="font-size:11px;padding:3px 10px;">
              <span class="material-symbols-outlined text-sm">delete</span> Hapus
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
            <tr><th style="width:32px"><input type="checkbox" class="row-checkbox" onchange="toggleSelectAll(this, 'reportTable')"></th><th>Tanggal</th><th>Judul</th><th>Platform</th><th>Status</th><th>Pembuat</th></tr>
            </thead>
            <tbody id="reportTable">
              ${filtered.length ? filtered.map(c => `
                <tr>
                  <td><input type="checkbox" class="row-checkbox" value="${c.id}" onchange="updateBulkBar('reportTable')"></td>
                  <td class="text-text-secondary text-caption">${formatDate(c.posting_date)}</td>
                  <td class="font-medium">${c.title}</td>
                  <td>${platformIcon(c.platform)}</td>
                  <td>${statusBadge(c.status)}</td>
                  <td class="text-text-secondary text-caption">${c.creator_name || '-'}</td>
                </tr>
              `).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">analytics</span></div><div class="empty-state-title">Belum ada data</div><div class="empty-state-desc">Buat konten dulu buat liat laporan</div></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

function filterReportStatus(status) {
  reportStatus = status;
  navigate('report');
}

function statusLabel(s) {
  const labels = { draft:'Draf', pending_review:'Review', pending_approval:'Approval', scheduled:'Terjadwal', posted:'Terbit' };
  return labels[s] || s;
}

async function exportReport() {
  try {
    const data = await api('/api/report');
    const contents = data.contents || [];
    let csv = 'Date,Title,Platform,Status,Creator\n';
    contents.forEach(c => {
      const platform = c.platform || 'ig';
      const status = c.status || 'draft';
      csv += `"${formatDate(c.posting_date)}","${c.title}","${platform}","${status}","${c.creator_name || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contentflow-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('Laporan berhasil diexport!');
  } catch(e) { toast(e.message, 'error'); }
}

async function aiAnalyze() {
  const btn = document.getElementById('aiAnalyzeBtn');
  const resultEl = document.getElementById('aiAnalysisResult');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">psychology</span> Menganalisis...'; }
  resultEl.innerHTML = `<div class="card p-8 mb-6 text-center"><div class="skeleton h-6 w-64 mx-auto mb-3"></div><div class="skeleton h-4 w-96 mx-auto mb-2"></div><div class="skeleton h-4 w-80 mx-auto"></div></div>`;
  
  try {
    const data = await api('/api/report/ai-analyze', { method: 'POST' });
    const a = data.analysis;
    
    if (typeof a === 'string') {
      resultEl.innerHTML = `<div class="card p-12 mb-6 text-center"><div class="empty-state-icon"><span class="material-symbols-outlined">analytics</span></div><div class="empty-state-title">Belum bisa analisis</div><div class="empty-state-desc">${a}</div></div>`;
    } else {
      resultEl.innerHTML = `
        <div class="space-y-4 mb-6" id="aiAnalysisSection">
          <div class="card p-5 border-l-4 border-accent">
            <h3 class="text-title-md text-text-primary font-semibold mb-2">Ringkasan AI</h3>
            <p class="text-body-md text-text-secondary leading-relaxed">${a.ringkasan || ''}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="card p-5 border-l-4 border-success">
              <h3 class="text-title-md text-success font-semibold mb-3 flex items-center gap-1.5"><span class="material-symbols-outlined text-lg">trending_up</span> Pola Sukses</h3>
              <ul class="space-y-2">${(a.pola_sukses || []).map(p => `<li class="text-body-md text-text-secondary flex items-start gap-2"><span class="text-success mt-1 shrink-0">•</span>${p}</li>`).join('')}</ul>
            </div>
            <div class="card p-5 border-l-4 border-error">
              <h3 class="text-title-md text-error font-semibold mb-3 flex items-center gap-1.5"><span class="material-symbols-outlined text-lg">warning</span> Pola Lemah</h3>
              <ul class="space-y-2">${(a.pola_lemah || []).map(p => `<li class="text-body-md text-text-secondary flex items-start gap-2"><span class="text-error mt-1 shrink-0">•</span>${p}</li>`).join('')}</ul>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${a.rekomendasi_pilar ? `<div class="card p-5"><h4 class="text-label-sm text-text-secondary mb-2">Rekomendasi Pilar</h4><p class="text-body-md text-text-primary">${a.rekomendasi_pilar}</p></div>` : ''}
            ${a.rekomendasi_platform ? `<div class="card p-5"><h4 class="text-label-sm text-text-secondary mb-2">Rekomendasi Platform</h4><p class="text-body-md text-text-primary">${a.rekomendasi_platform}</p></div>` : ''}
            ${a.rekomendasi_tipe ? `<div class="card p-5"><h4 class="text-label-sm text-text-secondary mb-2">Rekomendasi Tipe</h4><p class="text-body-md text-text-primary">${a.rekomendasi_tipe}</p></div>` : ''}
          </div>
          ${a.ide_konten && a.ide_konten.length ? `
          <div class="card p-5 border-l-4 border-warning">
            <h3 class="text-title-md text-warning font-semibold mb-3 flex items-center gap-1.5"><span class="material-symbols-outlined text-lg">lightbulb</span> Ide Konten Baru</h3>
            <div class="space-y-2">${a.ide_konten.map((ide, i) => `<div class="flex items-start gap-3 bg-surface-hover p-3 rounded-input"><span class="text-title-md text-warning font-bold shrink-0">${i+1}</span><p class="text-body-md text-text-primary">${ide}</p></div>`).join('')}</div>
          </div>` : ''}
          ${a.kesimpulan ? `
          <div class="card p-5">
            <h3 class="text-title-md text-text-primary font-semibold mb-2 flex items-center gap-1.5"><span class="material-symbols-outlined text-lg">summarize</span> Kesimpulan</h3>
            <p class="text-body-md text-text-secondary leading-relaxed">${a.kesimpulan}</p>
          </div>` : ''}
        </div>`;
    }
  } catch(e) {
    resultEl.innerHTML = `<div class="card p-8 mb-6 text-center border border-error/30"><span class="text-error text-body-md">${e.message}</span></div>`;
  }
  
  if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-lg">psychology</span> Analisis AI'; }
  setTimeout(() => {
    const sec = document.getElementById('aiAnalysisSection');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

/* ========================================================================
   ====== TEAM MANAGEMENT =================================================
   ======================================================================== */
async function renderUsers(el) {
  el.innerHTML = `<div class="space-y-4"><div class="skeleton h-12"></div><div class="skeleton h-96 rounded-card"></div></div>`;
  try {
    const data = await api('/api/users');
    const users = data.users || [];

    el.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-display text-display-sm text-text-primary tracking-tight">Kelola Tim</h2>
        <button class="btn btn-primary btn-sm" onclick="openAddUser()">
          <span class="material-symbols-outlined text-lg">person_add</span> Tambah User
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${users.length ? users.map(u => `
          <div class="card p-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-bold text-lg flex-shrink-0">
                ${(u.display_name || u.username).charAt(0).toUpperCase()}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-title-md text-text-primary">${u.display_name}</h3>
                <p class="text-caption text-text-secondary">@${u.username}</p>
                <span class="inline-block mt-1 text-caption px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-accent-subtle text-accent' : 'bg-surface-hover text-text-secondary'}">${u.role}</span>
              </div>
              ${currentUser.role === 'admin' && u.id !== currentUser.id ? `
                <div class="flex flex-col gap-1">
                  <button class="btn btn-ghost btn-sm" onclick="openPermModal('${u.id}','${u.display_name}')" title="Atur Akses">
                    <span class="material-symbols-outlined text-lg">manage_accounts</span>
                  </button>
                  <button class="btn btn-ghost btn-sm text-error" onclick="deleteUser('${u.id}')">
                    <span class="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('') : `<div class="lg:col-span-3 card p-12"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">groups</span></div><div class="empty-state-title">Belum ada user</div><div class="empty-state-desc">Tambah anggota tim, yuk!</div></div></div>`}
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

async function openPermModal(userId, displayName) {
  try {
    const data = await api('/api/users/' + userId + '/permissions');
    const currentPerms = data.permissions || ['dashboard','contentplan','calendar','hub','report','assetgen','trends'];
    const allFeatures = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'contentplan', label: 'Rencana Konten' },
      { id: 'calendar', label: 'Kalender Konten' },
      { id: 'hub', label: 'Pusat Konten' },
      { id: 'report', label: 'Laporan' },
      { id: 'assetgen', label: 'Buat Desain' },
      { id: 'trends', label: 'Pantau Tren' }
    ];
    openModal('Atur Akses — ' + displayName, `
      <div class="space-y-1">
        <p class="text-caption text-text-secondary mb-3">Pilih fitur yang bisa diakses oleh <strong>${displayName}</strong></p>
        ${allFeatures.map(f => `
          <label class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-hover cursor-pointer">
            <input type="checkbox" class="row-checkbox perm-checkbox" value="${f.id}" ${currentPerms.includes(f.id) ? 'checked' : ''}>
            <span class="text-sm text-text-primary">${f.label}</span>
          </label>
        `).join('')}
      </div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePerms('${userId}')">Simpan</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}
async function savePerms(userId) {
  const checked = Array.from(document.querySelectorAll('.perm-checkbox:checked')).map(cb => cb.value);
  try {
    await api('/api/users/' + userId + '/permissions', { method: 'PUT', body: { permissions: checked } });
    toast('Akses berhasil diperbarui');
    closeModal();
  } catch(e) { toast(e.message, 'error'); }
}

function openAddUser() {
  openModal('Tambah User', `
    <form id="userForm" class="space-y-4" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">Username <span class="text-error">*</span></label>
        <input class="input" id="user_username" required placeholder="username">
      </div>
      <div class="form-group">
        <label class="form-label">Nama Tampilan <span class="text-error">*</span></label>
        <input class="input" id="user_display" required placeholder="Nama lengkap">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Password <span class="text-error">*</span></label>
          <input class="input" id="user_password" type="password" required placeholder="Password">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="input" id="user_role">
            <option value="creator">Creator</option><option value="admin">Admin</option>
          </select>
        </div>
      </div>
    </form>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="addUser()">Tambah</button>
  `);
}

async function addUser() {
  const username = document.getElementById('user_username').value;
  const display = document.getElementById('user_display').value;
  const password = document.getElementById('user_password').value;
  if (!username || !display || !password) { toast('Semua kolom wajib diisi', 'error'); return; }
  try {
    await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username, password,
        display_name: display,
        role: document.getElementById('user_role').value
      })
    });
    toast('User berhasil ditambah!');
    closeModal();
    navigate('users');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteUser(id) {
  if (!confirm('Yakin mau hapus user ini?')) return;
  try {
    await api(`/api/users/${id}`, { method: 'DELETE' });
    toast('User berhasil dihapus');
    navigate('users');
  } catch(e) { toast(e.message, 'error'); }
}

// ====== BRANDS ======
async function renderBrands(el) {
  el.innerHTML = `<div class="space-y-4"><div class="skeleton h-12"></div><div class="skeleton h-96 rounded-card"></div></div>`;
  try {
    const data = await api('/api/brands');
    const list = data.brands || [];

    el.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-display text-display-sm text-text-primary tracking-tight">Brand</h2>
        <button class="btn btn-primary btn-sm" onclick="openAddBrand()">
          <span class="material-symbols-outlined text-lg">add</span> Tambah Brand
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${list.length ? list.map(b => `
          <div class="card p-5">
            <div class="flex items-center gap-4">
              ${b.logo_url ? `
                <img src="${b.logo_url}" alt="${b.name}" class="w-12 h-12 rounded-xl object-cover flex-shrink-0">
              ` : `
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style="background:${b.color || '#f43f5e'}">
                  ${b.name.charAt(0).toUpperCase()}
                </div>
              `}
              <div class="flex-1 min-w-0">
                <h3 class="text-title-md text-text-primary">${b.name}</h3>
                <p class="text-caption text-text-secondary">${b.description || 'Tidak ada deskripsi'}</p>
                <p class="text-caption text-text-muted mt-0.5">${b.member_count || '0'} anggota</p>
              </div>
              <div class="flex gap-1">
                <button class="btn btn-ghost btn-sm" onclick="openBrandMembers('${b.id}')" title="Kelola Anggota">
                  <span class="material-symbols-outlined text-lg">group</span>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="openEditBrand('${b.id}')">
                  <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button class="btn btn-ghost btn-sm text-error" onclick="deleteBrand('${b.id}')">
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          </div>
        `).join('') : `<div class="lg:col-span-3 card p-12"><div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">dashboard_customize</span></div><div class="empty-state-title">Belum ada brand</div><div class="empty-state-desc">Buat brand pertama kamu, yuk!</div></div></div>`}
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-desc">${e.message}</div></div>`;
  }
}

function openAddBrand() {
  openModal('Tambah Brand', `
    <form id="brandForm" class="space-y-4" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">Nama Brand <span class="text-error">*</span></label>
        <input class="input" id="brand_name" required placeholder="Curabeauty">
      </div>
      <div class="form-group">
        <label class="form-label">Deskripsi</label>
        <input class="input" id="brand_desc" placeholder="Brand kecantikan">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Warna</label>
          <div class="flex items-center gap-3">
            <input class="input w-16" id="brand_color" type="color" value="#f43f5e">
            <span class="text-caption text-text-secondary" id="brandColorLabel">#f43f5e</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Logo (URL)</label>
          <input class="input" id="brand_logo_url" placeholder="https://...">
        </div>
      </div>
    </form>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="addBrand()">Simpan</button>
  `);
  document.getElementById('brand_color').addEventListener('input', function() {
    document.getElementById('brandColorLabel').textContent = this.value;
  });
}

async function addBrand() {
  const name = document.getElementById('brand_name').value;
  if (!name) { toast('Nama brand wajib diisi', 'error'); return; }
  try {
    await api('/api/brands', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: document.getElementById('brand_desc').value,
        color: document.getElementById('brand_color').value,
        logo_url: document.getElementById('brand_logo_url').value
      })
    });
    toast('Brand berhasil ditambah!');
    closeModal();
    await initBrandSwitcher();
    navigate('brands');
  } catch(e) { toast(e.message, 'error'); }
}

function openEditBrand(id) {
  const brand = brands.find(b => b.id === id);
  if (!brand) return;
  window._editBrandId = id;
  openModal('Edit Brand', `
    <form id="brandForm" class="space-y-4" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">Nama Brand <span class="text-error">*</span></label>
        <input class="input" id="brand_name" required value="${brand.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Deskripsi</label>
        <input class="input" id="brand_desc" value="${brand.description || ''}">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Warna</label>
          <div class="flex items-center gap-3">
            <input class="input w-16" id="brand_color" type="color" value="${brand.color || '#f43f5e'}">
            <span class="text-caption text-text-secondary" id="brandColorLabel">${brand.color || '#f43f5e'}</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Logo (URL)</label>
          <input class="input" id="brand_logo_url" value="${brand.logo_url || ''}" placeholder="https://...">
        </div>
      </div>
      <div class="border-t border-border-light/60 pt-4">
        <label class="form-label block mb-2">Upload Logo Baru</label>
        <div class="flex items-center gap-3">
          <input type="file" id="brand_logo_file" accept="image/*" class="input-file text-sm text-text-secondary file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:text-sm file:font-medium hover:file:bg-accent-hover">
          <button type="button" class="btn btn-secondary btn-sm" onclick="uploadBrandLogo()">Upload</button>
        </div>
      </div>
    </form>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="updateBrand()">Simpan</button>
  `);
  document.getElementById('brand_color').addEventListener('input', function() {
    document.getElementById('brandColorLabel').textContent = this.value;
  });
}

async function uploadBrandLogo() {
  const fileInput = document.getElementById('brand_logo_file');
  if (!fileInput.files.length) { toast('Pilih file dulu', 'error'); return; }
  const formData = new FormData();
  formData.append('logo', fileInput.files[0]);
  try {
    const res = await fetch(`/api/brands/${window._editBrandId}/logo`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.getElementById('brand_logo_url').value = data.logo_url;
    toast('Logo berhasil diupload!');
  } catch(e) { toast(e.message, 'error'); }
}

async function updateBrand() {
  const name = document.getElementById('brand_name').value;
  if (!name) { toast('Nama brand wajib diisi', 'error'); return; }
  try {
    await api(`/api/brands/${window._editBrandId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        description: document.getElementById('brand_desc').value,
        color: document.getElementById('brand_color').value,
        logo_url: document.getElementById('brand_logo_url').value
      })
    });
    toast('Brand berhasil diupdate!');
    closeModal();
    await initBrandSwitcher();
    navigate('brands');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteBrand(id) {
  if (!confirm('Yakin mau hapus brand ini? Data terkait brand ini tetap tersimpan, hanya brand yang dihapus.')) return;
  try {
    await api(`/api/brands/${id}`, { method: 'DELETE' });
    toast('Brand berhasil dihapus');
    await initBrandSwitcher();
    navigate('brands');
  } catch(e) { toast(e.message, 'error'); }
}

// ====== BRAND MEMBERS ======
async function openBrandMembers(brandId) {
  window._brandMembersId = brandId;
  openModal('Loading...', '<div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">group</span></div><div class="empty-state-desc">Memuat anggota...</div></div>', '');
  try {
    const data = await api(`/api/brands/${brandId}/members`);
    const members = data.members || [];
    const brand = brands.find(b => b.id === brandId);
    openModal(brand ? `Anggota — ${brand.name}` : 'Anggota Brand', `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-caption text-text-secondary">${members.length} anggota</span>
          <button class="btn btn-primary btn-sm" onclick="openAddBrandMember('${brandId}')">
            <span class="material-symbols-outlined text-lg">person_add</span> Tambah
          </button>
        </div>
        <div class="divide-y divide-border-light/60 max-h-[320px] overflow-y-auto">
          ${members.length ? members.map(m => `
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                  ${(m.display_name || m.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <span class="text-sm text-text-primary font-medium">${m.display_name}</span>
                  <span class="block text-caption text-text-secondary">@${m.username}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-caption px-2 py-0.5 rounded-full ${m.role_in_brand === 'admin' ? 'bg-accent-subtle text-accent' : 'bg-surface-hover text-text-secondary'}">${m.role_in_brand}</span>
                ${currentUser.role === 'admin' && m.user_id !== currentUser.id ? `
                  <button class="btn btn-ghost btn-sm text-error" onclick="removeBrandMember('${brandId}','${m.user_id}')">
                    <span class="material-symbols-outlined text-lg">remove_circle</span>
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('') : `<div class="py-6 text-center text-caption text-text-muted">Belum ada anggota</div>`}
        </div>
      </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>`);
  } catch(e) { toast(e.message, 'error'); closeModal(); }
}

async function openAddBrandMember(brandId) {
  try {
    const data = await api('/api/users');
    const users = data.users || [];
    openModal('Tambah Anggota', `
      <form id="memberForm" class="space-y-4" onsubmit="return false">
        <div class="form-group">
          <label class="form-label">Pilih User</label>
          <select class="input" id="member_user_id">
            <option value="">— Pilih user —</option>
            ${users.map(u => `<option value="${u.id}">${u.display_name} (@${u.username})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Role di Brand</label>
          <select class="input" id="member_role">
            <option value="creator">Creator</option>
            <option value="editor">Editor</option>
          </select>
        </div>
      </form>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="addBrandMember('${brandId}')">Tambah</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function addBrandMember(brandId) {
  const userId = document.getElementById('member_user_id').value;
  const role = document.getElementById('member_role').value;
  if (!userId) { toast('Pilih user', 'error'); return; }
  try {
    await api(`/api/brands/${brandId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role_in_brand: role })
    });
    toast('Anggota berhasil ditambah!');
    closeModal();
    openBrandMembers(brandId);
  } catch(e) { toast(e.message, 'error'); }
}

async function removeBrandMember(brandId, userId) {
  if (!confirm('Yakin mau hapus anggota ini dari brand?')) return;
  try {
    await api(`/api/brands/${brandId}/members/${userId}`, { method: 'DELETE' });
    toast('Anggota berhasil dihapus');
    openBrandMembers(brandId);
  } catch(e) { toast(e.message, 'error'); }
}

// ====== CANVA TEMPLATES ======
function openAddCanvaTemplate() {
  openModal('Tambah Template Canva', `
    <form id="canvaForm" class="space-y-4" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">Nama Template <span class="text-error">*</span></label>
        <input class="input" id="ct_name" required placeholder="Pricetag Lagi Diskon">
      </div>
      <div class="form-group">
        <label class="form-label">Deskripsi</label>
        <input class="input" id="ct_desc" placeholder="pricetag untuk promosi harga coret">
      </div>
      <div class="form-group">
        <label class="form-label">Link Desain Canva <span class="text-error">*</span></label>
        <input class="input" id="ct_tmpl" placeholder="https://www.canva.com/design/...">
        <p class="text-caption text-text-muted mt-1">Dari tombol Share → Copy Link di Canva</p>
      </div>
      <div class="form-group">
        <label class="form-label">Thumbnail</label>
        <input type="file" id="ct_thumb_file" accept="image/*" class="input-file text-sm text-text-secondary file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:text-sm file:font-medium hover:file:bg-accent-hover">
        <p class="text-caption text-text-muted mt-1">Upload gambar preview template (opsional)</p>
      </div>
    </form>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="addCanvaTemplate()">Simpan</button>
  `);
}

async function addCanvaTemplate() {
  const name = document.getElementById('ct_name').value;
  const tmpl = document.getElementById('ct_tmpl').value;
  if (!name || !tmpl) { toast('Nama dan Link Canva wajib diisi', 'error'); return; }
  try {
    const result = await api('/api/canva-templates', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: document.getElementById('ct_desc').value,
        template_id: tmpl
      })
    });
    const fileInput = document.getElementById('ct_thumb_file');
    if (fileInput && fileInput.files.length) {
      const fd = new FormData();
      fd.append('thumbnail', fileInput.files[0]);
      await fetch(`/api/canva-templates/${result.id}/thumbnail`, { method: 'POST', body: fd });
    }
    toast('Template Canva berhasil ditambah!');
    closeModal();
    renderAssetGen(document.getElementById('pageContent'));
  } catch(e) { toast(e.message, 'error'); }
}

function openEditCanvaTemplate(id) {
  api('/api/canva-templates').then(data => {
    const t = data.templates.find(x => x.id === id);
    if (!t) { toast('Template gak ditemukan', 'error'); return; }
    window._editCtId = id;
    openModal('Edit Template Canva', `
      <form id="canvaForm" class="space-y-4" onsubmit="return false">
        <div class="form-group">
          <label class="form-label">Nama Template <span class="text-error">*</span></label>
          <input class="input" id="ct_name" required value="${t.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Deskripsi</label>
          <input class="input" id="ct_desc" value="${t.description || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Link Desain Canva <span class="text-error">*</span></label>
          <input class="input" id="ct_tmpl" required value="${t.template_id}">
        </div>
        <div class="form-group">
          <label class="form-label">Thumbnail</label>
          ${t.thumbnail_url ? `<div class="mb-2"><img src="${t.thumbnail_url}" class="w-32 h-20 object-cover rounded-lg border border-border-light"></div>` : ''}
          <input type="file" id="ct_thumb_file" accept="image/*" class="input-file text-sm text-text-secondary file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:text-sm file:font-medium hover:file:bg-accent-hover">
          <p class="text-caption text-text-muted mt-1">Upload gambar baru (kosongkan jika tidak ingin ganti)</p>
        </div>
      </form>
    `, `
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="updateCanvaTemplate()">Simpan</button>
    `);
  }).catch(e => toast(e.message, 'error'));
}

async function updateCanvaTemplate() {
  const id = window._editCtId;
  const name = document.getElementById('ct_name').value;
  const tmpl = document.getElementById('ct_tmpl').value;
  if (!name || !tmpl) { toast('Nama dan Link Canva wajib diisi', 'error'); return; }
  try {
    await api(`/api/canva-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        description: document.getElementById('ct_desc').value,
        template_id: tmpl
      })
    });
    const fileInput = document.getElementById('ct_thumb_file');
    if (fileInput && fileInput.files.length) {
      const fd = new FormData();
      fd.append('thumbnail', fileInput.files[0]);
      await fetch(`/api/canva-templates/${id}/thumbnail`, { method: 'POST', body: fd });
    }
    toast('Template Canva berhasil diupdate!');
    closeModal();
    renderAssetGen(document.getElementById('pageContent'));
  } catch(e) { toast(e.message, 'error'); }
}

function deleteTemplateDesign(id, name) {
  openModal('Hapus Template', `
    <div class="text-center py-4">
      <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
        <span class="material-symbols-outlined text-3xl text-error">delete_forever</span>
      </div>
      <p class="text-body-md text-text-primary mb-1">Yakin mau hapus template ini?</p>
      <p class="text-title-md font-semibold text-text-primary mb-3">"${name}"</p>
      <p class="text-caption text-text-secondary">Template yang sudah terpakai di konten tetap tersimpan.</p>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn !bg-error !text-white hover:!bg-[#b91c1c]" onclick="confirmDeleteDesign('${id}')">Yakin, Hapus</button>
  `);
}

async function confirmDeleteDesign(id) {
  closeModal();
  try {
    await api(`/api/templates/${id}`, { method: 'DELETE' });
    toast('Template berhasil dihapus');
    renderAssetGen(document.getElementById('pageContent'));
  } catch(e) { toast(e.message, 'error'); }
}

function deleteCanvaTemplate(id) {
  openModal('Hapus Template Canva', `
    <div class="text-center py-4">
      <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
        <span class="material-symbols-outlined text-3xl text-error">delete_forever</span>
      </div>
      <p class="text-body-md text-text-primary mb-1">Yakin mau hapus template Canva ini?</p>
      <p class="text-caption text-text-secondary">Tautan template Canva ini akan dihapus dari daftar.</p>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    <button class="btn !bg-error !text-white hover:!bg-[#b91c1c]" onclick="confirmDeleteCanvaTemplate('${id}')">Yakin, Hapus</button>
  `);
}

async function confirmDeleteCanvaTemplate(id) {
  closeModal();
  try {
    await api(`/api/canva-templates/${id}`, { method: 'DELETE' });
    toast('Template Canva berhasil dihapus');
    renderAssetGen(document.getElementById('pageContent'));
  } catch(e) { toast(e.message, 'error'); }
}

// Close brand dropdown on outside click
document.addEventListener('click', (e) => {
  const dd = document.getElementById('brandDropdown');
  const btn = document.getElementById('brandSwitcherBtn');
  if (dd && !dd.classList.contains('hidden') && !dd.contains(e.target) && !btn.contains(e.target)) {
    dd.classList.add('hidden');
    document.getElementById('brandChevron').style.transform = 'rotate(0deg)';
  }
});

// ====== KEYBOARD SHORTCUTS ======
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modalOverlay');
    if (modal.classList.contains('active')) closeModal();
    if (notifOpen) {
      notifOpen = false;
      document.getElementById('notifDropdown').classList.add('hidden');
    }
  }
});
