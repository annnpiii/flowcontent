
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Composio } = require('@composio/core');
const { query, run, get } = require('./database');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');

// Timestamp helper
function now() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + 'T' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '+08:00';
}

const app = express();
const PORT = process.env.PORT || 80;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|mp4|mov|pdf|doc|docx|txt/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ext);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => { if (req.path.endsWith('.html') || req.path === '/' || req.path === '/sw.js' || req.path === '/manifest.json' || req.path.includes('/js/')) res.set('Cache-Control', 'no-cache, no-store, must-revalidate'); next(); });
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), { maxAge: 0, etag: false, lastModified: false }));
app.use('/js', express.static(path.join(__dirname, 'public', 'js'), { maxAge: 0, etag: false, lastModified: false }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT) || 30,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi 1 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'contentflow-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAuth(allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      if (!allowedRoles.includes(req.session.user.role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
      }
    }
    next();
  };
}

// --- Auth ---
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Username atau password salah!' });
  }
  let perms = user.permissions;
  try { if (typeof perms === 'string') perms = JSON.parse(perms); } catch(e) { perms = null; }
  req.session.user = { id: user.id, username: user.username, display_name: user.display_name, role: user.role, avatar_color: user.avatar_color, permissions: perms };
  const memberBrand = get('SELECT brand_id FROM brand_members WHERE user_id = ? ORDER BY brand_id LIMIT 1', [user.id]);
  if (user.role === 'admin') {
    const firstBrand = get('SELECT id FROM brands ORDER BY name LIMIT 1');
    req.session.brand_id = firstBrand ? firstBrand.id : null;
  } else {
    req.session.brand_id = memberBrand ? memberBrand.brand_id : null;
  }
  const brands = query(
    `SELECT b.* FROM brands b INNER JOIN brand_members bm ON b.id = bm.brand_id WHERE bm.user_id = ? ORDER BY b.name`, [user.id]);
  res.json({ user: req.session.user, brands, activeBrandId: req.session.brand_id });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No session' });
  let brands;
  if (req.session.user.role === 'admin') {
    brands = query('SELECT b.* FROM brands b ORDER BY b.name');
  } else {
    brands = query(
      `SELECT b.* FROM brands b INNER JOIN brand_members bm ON b.id = bm.brand_id WHERE bm.user_id = ? ORDER BY b.name`, [req.session.user.id]);
  }
  res.json({ user: req.session.user, brands, activeBrandId: req.session.brand_id });
});

// --- Global Search ---
app.get('/api/search', requireAuth(), (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ results: [] });
  const like = `%${q}%`;
  const bf = brandFilter(req);
  const sql = `
    SELECT id, title as name, 'plan' as type, upload_date as date FROM content_plans WHERE title LIKE ?${bf.sql} AND brand_id IS NOT NULL
    UNION ALL
    SELECT id, title, 'content' as type, posting_date as date FROM contents WHERE title LIKE ?${bf.sql}
    UNION ALL
    SELECT id, title, 'hub' as type, created_at as date FROM content_items WHERE title LIKE ?${bf.sql}
    UNION ALL
    SELECT id, name, 'promo' as type, created_at as date FROM promos WHERE name LIKE ?${bf.sql}
    ORDER BY date DESC LIMIT 15
  `;
  const params = [like, ...bf.params, like, ...bf.params, like, ...bf.params, like, ...bf.params];
  const results = query(sql, params);
  res.json({ results });
});

// --- Users ---
app.get('/api/users', requireAuth(['admin']), (req, res) => {
  const users = query('SELECT id, username, display_name, role, avatar_color, permissions, created_at FROM users');
  res.json({ users });
});

app.post('/api/users', requireAuth(['admin']), (req, res) => {
  const { username, password, display_name, role } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  try {
    run('INSERT INTO users (id, username, password, display_name, role) VALUES (?,?,?,?,?)', [uuidv4(), username, hashed, display_name, role]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// --- User Permissions ---
app.get('/api/users/:id/permissions', requireAuth(['admin']), (req, res) => {
  const user = get('SELECT permissions FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ permissions: user.permissions ? JSON.parse(user.permissions) : null });
});

app.put('/api/users/:id/permissions', requireAuth(['admin']), (req, res) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions must be an array' });
  run('UPDATE users SET permissions = ? WHERE id = ?', [JSON.stringify(permissions), req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/users/:id', requireAuth(['admin']), (req, res) => {
  const existing = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/team', requireAuth(), (req, res) => {
  const users = query('SELECT id, display_name, role, avatar_color FROM users');
  res.json({ users });
});

// --- Contents / Calendar ---
app.get('/api/contents', requireAuth(), (req, res) => {
  const { start, end, status, platform, creator_id, sort, order } = req.query;
  let sql = `SELECT c.*, cr.display_name as creator_name
    FROM contents c
    LEFT JOIN users cr ON c.creator_id = cr.id WHERE 1=1`;
  const params = [];
  if (start) { sql += ' AND c.posting_date >= ?'; params.push(start); }
  if (end) { sql += ' AND c.posting_date <= ?'; params.push(end); }
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  if (platform && platform !== 'all') { sql += ' AND (c.platform = ? OR c.platform = \'both\')'; params.push(platform); }
  if (creator_id) { sql += ' AND c.creator_id = ?'; params.push(creator_id); }
  const bf = brandFilter(req); sql += bf.sql; params.push(...bf.params);
  const sortCol = sort || 'c.posting_date';
  const sortOrder = (order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${sortCol} ${sortOrder}`;
  const contents = query(sql, params);
  res.json({ contents });
});

app.get('/api/contents/:id', requireAuth(), (req, res) => {
  const content = get(`SELECT c.*, cr.display_name as creator_name
    FROM contents c
    LEFT JOIN users cr ON c.creator_id = cr.id WHERE c.id = ?`, [req.params.id]);
  if (!content) return res.status(404).json({ error: 'Not found' });
  const logs = query('SELECT al.*, u.display_name as user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.content_id = ? ORDER BY al.created_at DESC', [req.params.id]);
  const versions = query('SELECT * FROM content_versions WHERE content_id = ? ORDER BY version DESC', [req.params.id]);
  res.json({ content, logs, versions });
});

app.post('/api/contents', requireAuth(), (req, res) => {
  const { title, caption, media, platform, posting_date, posting_time, due_date, tags, promo_id, content_url, canva_link, notes, creator_id } = req.body;
  const id = uuidv4();
  const user = req.session.user;
  const assignedCreator = (user.role === 'admin' && creator_id) ? creator_id : user.id;
  run(`INSERT INTO contents (id, title, caption, media, platform, posting_date, posting_time, due_date, status, creator_id, tags, promo_id, content_url, canva_link, brand_id, notes)
    VALUES (?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?)`,
    [id, title, caption || '', JSON.stringify(media || []), platform || 'ig', posting_date || '', posting_time || '10:00', due_date || null, assignedCreator, JSON.stringify(tags || []), promo_id || null, content_url || '', canva_link || '', req.session.brand_id, notes || '']);
  run('INSERT INTO activity_logs (id, content_id, user_id, action, details, created_at) VALUES (?,?,?,?,?,datetime(\'now\', \'localtime\'))', [uuidv4(), id, user.id, 'created', 'Content draft created']);
  res.json({ id, ok: true });
});

app.put('/api/contents/:id', requireAuth(), (req, res) => {
  const existing = get('SELECT * FROM contents WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const user = req.session.user;
  const { title, caption, media, platform, posting_date, posting_time, due_date, tags, promo_id, status, content_url, canva_link, reach, views, likes, comments, shares, saves, impressions, watch_time, followers_growth } = req.body;
  run(`UPDATE contents SET title=?, caption=?, media=?, platform=?, posting_date=?, posting_time=?, due_date=?, tags=?, promo_id=?, content_url=?, canva_link=?, status=?, reach=?, views=?, likes=?, comments=?, shares=?, saves=?, impressions=?, watch_time=?, followers_growth=?, updated_at=datetime('now', 'localtime'), version=version+1 WHERE id=?`,
    [title || existing.title, caption !== undefined ? caption : existing.caption, media ? JSON.stringify(media) : existing.media, platform || existing.platform, posting_date || existing.posting_date, posting_time || existing.posting_time, due_date !== undefined ? due_date : existing.due_date, tags ? JSON.stringify(tags) : existing.tags, promo_id || existing.promo_id, content_url !== undefined ? content_url : existing.content_url, canva_link !== undefined ? canva_link : (existing.canva_link || ''), status || existing.status, reach !== undefined ? reach : existing.reach, views !== undefined ? views : existing.views, likes !== undefined ? likes : existing.likes, comments !== undefined ? comments : existing.comments, shares !== undefined ? shares : existing.shares, saves !== undefined ? saves : existing.saves, impressions !== undefined ? impressions : existing.impressions, watch_time !== undefined ? watch_time : existing.watch_time, followers_growth !== undefined ? followers_growth : existing.followers_growth, req.params.id]);
  run('INSERT INTO content_versions (id, content_id, caption, media, version, edited_by, notes) VALUES (?,?,?,?,?,?,?)',
    [uuidv4(), req.params.id, existing.caption, existing.media, existing.version, user.id, 'Edited by ' + user.display_name]);
  run('INSERT INTO activity_logs (id, content_id, user_id, action, details, created_at) VALUES (?,?,?,?,?,datetime(\'now\', \'localtime\'))', [uuidv4(), req.params.id, user.id, 'edited', 'Content updated']);
  res.json({ ok: true });
});

app.put('/api/contents/:id/status', requireAuth(), (req, res) => {
  try {
    const { status, feedback } = req.body;
    const existing = get('SELECT * FROM contents WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const user = req.session.user;
    run("UPDATE contents SET status=?, feedback=?, updated_at=datetime('now', 'localtime') WHERE id=?",
      [status, feedback || '', req.params.id]);
    run('INSERT INTO activity_logs (id, content_id, user_id, action, details, created_at) VALUES (?,?,?,?,?,datetime(\'now\', \'localtime\'))', [uuidv4(), req.params.id, user.id, status, feedback ? 'Feedback: ' + feedback : '']);
    if (status === 'pending_review') {
      const admins = query('SELECT id FROM users WHERE role = ?', ['admin']);
      admins.forEach(a => {
        run('INSERT OR IGNORE INTO notifications (id, user_id, content_id, type, message, created_at, brand_id) VALUES (?,?,?,?,?,?,?)',
          [uuidv4(), a.id, req.params.id, 'pending_review',
           `"${existing.title}" minta direview`, now(), existing.brand_id || null]);
      });
    }
    if (status === 'approved' && existing.creator_id !== user.id) {
      run('INSERT INTO notifications (id, user_id, content_id, type, message, created_at, brand_id) VALUES (?,?,?,?,?,?,?)',
        [uuidv4(), existing.creator_id, req.params.id, 'approved',
         `Konten "${existing.title}" udah di-approve!`, now(), existing.brand_id || null]);
      run('DELETE FROM notifications WHERE content_id = ? AND user_id = ?', [req.params.id, user.id]);
    }
    if (status === 'scheduled' && existing.creator_id !== user.id) {
      const notifId = uuidv4();
      run('INSERT INTO notifications (id, user_id, content_id, type, message, created_at, brand_id) VALUES (?,?,?,?,?,?,?)',
        [notifId, existing.creator_id, req.params.id, 'approved',
         `Konten "${existing.title}" sudah di approve. Silahkan dikerjakan!`, now(), existing.brand_id || null]);
      // Remove previous notifications for this content from the acting user
      run('DELETE FROM notifications WHERE content_id = ? AND user_id = ?', [req.params.id, user.id]);
    }
    if (status === 'revision_requested') {
      run('INSERT OR IGNORE INTO notifications (id, user_id, content_id, type, message, created_at, brand_id) VALUES (?,?,?,?,?,?,?)',
        [uuidv4(), existing.creator_id, req.params.id, 'revision',
         `"${existing.title}" butuh revisi: ${feedback || ''}`, now(), existing.brand_id || null]);
      // Remove previous notifications for this content from the acting user
      run('DELETE FROM notifications WHERE content_id = ? AND user_id = ?', [req.params.id, user.id]);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/contents/:id/schedule', requireAuth(['admin']), (req, res) => {
  const { posting_date, posting_time, caption } = req.body;
  const user = req.session.user;
  const existing = get('SELECT * FROM contents WHERE id = ?', [req.params.id]);
  const newCaption = caption !== undefined && caption !== null && caption !== '' ? caption : (existing ? existing.caption : '');
  run("UPDATE contents SET status='scheduled', posting_date=?, posting_time=?, caption=?, approver_id=?, updated_at=datetime('now', 'localtime') WHERE id=?",
    [posting_date, posting_time, newCaption, user.id, req.params.id]);
  run('INSERT INTO activity_logs (id, content_id, user_id, action, details, created_at) VALUES (?,?,?,?,?,datetime(\'now\', \'localtime\'))',
    [uuidv4(), req.params.id, user.id, 'scheduled', 'Scheduled on ' + posting_date + ' at ' + posting_time]);
  res.json({ ok: true });
});

app.put('/api/contents/:id/date', requireAuth(), (req, res) => {
  const { posting_date } = req.body;
  const existing = get('SELECT * FROM contents WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status === 'scheduled' || existing.status === 'posted') {
    return res.status(403).json({ error: 'Cannot move scheduled/posted' });
  }
  run("UPDATE contents SET posting_date=?, updated_at=datetime('now', 'localtime') WHERE id=?", [posting_date, req.params.id]);
  run('INSERT INTO activity_logs (id, content_id, user_id, action, details, created_at) VALUES (?,?,?,?,?,datetime(\'now\', \'localtime\'))',
    [uuidv4(), req.params.id, req.session.user.id, 'rescheduled', 'Moved to ' + posting_date]);
  res.json({ ok: true });
});

// --- Bulk Content Actions ---
app.delete('/api/contents/bulk', requireAuth(['admin']), (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'ids required' });
    const placeholders = ids.map(() => '?').join(',');
    run(`DELETE FROM contents WHERE id IN (${placeholders})`, ids);
    run(`INSERT INTO activity_logs (id, user_id, action, details, brand_id, created_at) VALUES (?,?,?,?,?,datetime('now', 'localtime'))`,
      [uuidv4(), req.session.user.id, 'bulk_delete', `Menghapus ${ids.length} konten`, req.session.brand_id]);
    res.json({ success: true, deleted: ids.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/contents/bulk/status', requireAuth(['admin']), (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !ids.length || !status) return res.status(400).json({ error: 'ids and status required' });
    const placeholders = ids.map(() => '?').join(',');
    run(`UPDATE contents SET status=?, updated_at=datetime('now', 'localtime') WHERE id IN (${placeholders})`, [status, ...ids]);
    res.json({ success: true, updated: ids.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/contents/:id', requireAuth(['admin']), (req, res) => {
  run('DELETE FROM contents WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// --- Brand helper ---
function brandFilter(req) {
  const brandId = req.session.brand_id;
  if (!brandId) return { sql: '', params: [] };
  return { sql: ' AND brand_id = ?', params: [brandId] };
}

// --- Brands ---
app.get('/api/brands', requireAuth(), (req, res) => {
  const user = req.session.user;
  let brands;
  if (user.role === 'admin') {
    brands = query('SELECT b.*, (SELECT COUNT(*) FROM brand_members WHERE brand_id = b.id) as member_count FROM brands b ORDER BY b.name');
  } else {
    brands = query(
      `SELECT b.*, bm.role_in_brand FROM brands b INNER JOIN brand_members bm ON b.id = bm.brand_id WHERE bm.user_id = ? ORDER BY b.name`, [user.id]);
  }
  res.json({ brands });
});

app.post('/api/brands', requireAuth(['admin']), (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const id = uuidv4();
  try {
    run('INSERT INTO brands (id, name, slug, description, color) VALUES (?,?,?,?,?)', [id, name, slug, description || '', color || '#f43f5e']);
    run('INSERT INTO brand_members (id, brand_id, user_id, role_in_brand) VALUES (?,?,?,?)', [uuidv4(), id, req.session.user.id, 'admin']);
    res.json({ id, ok: true });
  } catch(e) {
    res.status(400).json({ error: 'Brand with this slug already exists' });
  }
});

app.put('/api/brands/:id', requireAuth(['admin']), (req, res) => {
  const { name, description, color, logo_url } = req.body;
  const existing = get('SELECT * FROM brands WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Brand not found' });
  run('UPDATE brands SET name=?, description=?, color=?, logo_url=? WHERE id=?',
    [name || existing.name, description !== undefined ? description : existing.description, color || existing.color, logo_url !== undefined ? logo_url : existing.logo_url, req.params.id]);
  res.json({ ok: true });
});

app.post('/api/brands/:id/logo', requireAuth(['admin']), upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const logoUrl = '/uploads/' + req.file.filename;
  run('UPDATE brands SET logo_url=? WHERE id=?', [logoUrl, req.params.id]);
  res.json({ ok: true, logo_url: logoUrl });
});

app.delete('/api/brands/:id', requireAuth(['admin']), (req, res) => {
  const existing = get('SELECT * FROM brands WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Brand not found' });
  run('DELETE FROM brand_members WHERE brand_id = ?', [req.params.id]);
  run('DELETE FROM brands WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/brand/switch', requireAuth(), (req, res) => {
  const { brand_id } = req.body;
  if (!brand_id) return res.status(400).json({ error: 'brand_id required' });
  const member = get('SELECT * FROM brand_members WHERE brand_id = ? AND user_id = ?', [brand_id, req.session.user.id]);
  if (!member && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'No access to this brand' });
  }
  req.session.brand_id = brand_id;
  res.json({ ok: true, activeBrandId: req.session.brand_id });
});

app.get('/api/brands/:id/members', requireAuth(['admin']), (req, res) => {
  const members = query(
    `SELECT bm.*, u.display_name, u.username, u.role as user_role FROM brand_members bm INNER JOIN users u ON bm.user_id = u.id WHERE bm.brand_id = ?`, [req.params.id]);
  res.json({ members });
});

app.post('/api/brands/:id/members', requireAuth(['admin']), (req, res) => {
  const { user_id, role_in_brand } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    run('INSERT INTO brand_members (id, brand_id, user_id, role_in_brand) VALUES (?,?,?,?)',
      [uuidv4(), req.params.id, user_id, role_in_brand || 'creator']);
    res.json({ ok: true });
  } catch(e) {
    res.status(400).json({ error: 'User already member of this brand' });
  }
});

app.delete('/api/brands/:id/members/:userId', requireAuth(['admin']), (req, res) => {
  run('DELETE FROM brand_members WHERE brand_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
  res.json({ ok: true });
});

// --- Dashboard KPIs ---
app.get('/api/dashboard', requireAuth(), (req, res) => {
  const user = req.session.user;
  const bf = brandFilter(req);
  let drafts = get(`SELECT COUNT(*) as c FROM contents WHERE status=?${bf.sql}`, ['draft', ...bf.params]);
  let pendingReview = get(`SELECT COUNT(*) as c FROM contents WHERE status=?${bf.sql}`, ['pending_review', ...bf.params]);
  let approved = get(`SELECT COUNT(*) as c FROM contents WHERE status=?${bf.sql}`, ['approved', ...bf.params]);
  let revisionRequested = get(`SELECT COUNT(*) as c FROM contents WHERE status=?${bf.sql}`, ['revision_requested', ...bf.params]);
  let scheduled = get(`SELECT COUNT(*) as c FROM contents WHERE status=?${bf.sql}`, ['scheduled', ...bf.params]);
  let posted = get(`SELECT COUNT(*) as c FROM contents WHERE (status=? OR status=? OR status=?)${bf.sql}`, ['posted', 'done', 'failed', ...bf.params]);
  res.json({
    drafts: drafts.c, pendingReview: pendingReview.c, approved: approved.c,
    revisionRequested: revisionRequested.c, scheduled: scheduled.c, posted: posted.c
  });
});

// --- Content Hub ---
app.get('/api/folders', requireAuth(), (req, res) => {
  const folders = query('SELECT f.*, (SELECT COUNT(*) FROM content_items WHERE folder_id = f.id) as item_count FROM content_folders f ORDER BY f.is_default DESC, f.name ASC');
  res.json({ folders });
});

app.post('/api/folders', requireAuth(), (req, res) => {
  const { name, parent_id } = req.body;
  const id = uuidv4();
  run('INSERT INTO content_folders (id, name, parent_id) VALUES (?,?,?)', [id, name, parent_id || null]);
  res.json({ id, ok: true });
});

app.delete('/api/folders/:id', requireAuth(['admin']), (req, res) => {
  run('DELETE FROM content_folders WHERE id = ? AND is_default = 0', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/items', requireAuth(), (req, res) => {
  const { folder_id, search, category, file_type, page = 1, limit = 20 } = req.query;
  let sql = 'SELECT ci.*, u.display_name as created_by_name FROM content_items ci LEFT JOIN users u ON ci.created_by = u.id WHERE 1=1';
  const params = [];
  const bf = brandFilter(req); sql += bf.sql; params.push(...bf.params);
  if (folder_id) { sql += ' AND ci.folder_id = ?'; params.push(folder_id); }
  if (search) { sql += ' AND (ci.title LIKE ? OR ci.description LIKE ? OR ci.tags LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (category) { sql += ' AND ci.category = ?'; params.push(category); }
  if (file_type) { sql += ' AND ci.file_type = ?'; params.push(file_type); }
  sql += ' ORDER BY ci.updated_at DESC';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  sql += ' LIMIT ? OFFSET ?'; params.push(parseInt(limit), offset);
  const items = query(sql, params);
  const countSql = 'SELECT COUNT(*) as c FROM content_items ci WHERE 1=1' + bf.sql + (folder_id ? ' AND ci.folder_id = ?' : '') + (search ? ' AND (ci.title LIKE ? OR ci.description LIKE ? OR ci.tags LIKE ?)' : '');
  const countParams = [...bf.params];
  if (folder_id) countParams.push(folder_id);
  if (search) countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  const total = countParams.length > bf.params.length ? get(countSql, countParams) : get('SELECT COUNT(*) as c FROM content_items WHERE 1=1' + bf.sql, bf.params);
  res.json({ items, total: total ? total.c : 0, page: parseInt(page) });
});

app.post('/api/items', requireAuth(), upload.single('file'), (req, res) => {
  const { folder_id, title, description, tags, visibility, category, canva_link, page_notes } = req.body;
  const id = uuidv4();
  const fileType = req.file ? (req.file.mimetype.startsWith('image') ? 'image' : req.file.mimetype.startsWith('video') ? 'video' : 'doc') : 'text';
  run('INSERT INTO content_items (id, folder_id, title, description, file_path, file_type, tags, visibility, category, canva_link, page_notes, created_by, brand_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, folder_id, title, description || '', req.file ? '/uploads/' + req.file.filename : '', fileType, tags || '', visibility || 'shared', category || '', canva_link || '', page_notes || '', req.session.user.id, req.session.brand_id]);
  res.json({ id, ok: true });
});

app.delete('/api/items/:id', requireAuth(['admin']), (req, res) => {
  run('DELETE FROM content_items WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// --- Promos ---
app.get('/api/promos', requireAuth(), (req, res) => {
  const bf = brandFilter(req);
  const promos = query(`SELECT p.*, u.display_name as created_by_name FROM promos p LEFT JOIN users u ON p.created_by = u.id WHERE 1=1${bf.sql} ORDER BY p.created_at DESC`, bf.params);
  const result = promos.map(p => ({ ...p, allocation: JSON.parse(p.allocation) }));
  res.json({ promos: result });
});

app.post('/api/promos', requireAuth(['admin']), (req, res) => {
  const { name, base_price, subsidy_type, subsidy_value, allocation, promo_type, brand } = req.body;
  const type = promo_type || 'branch';
  if (type === 'branch') {
    const totalPct = allocation.reduce((s, a) => s + parseFloat(a.pct), 0);
    if (Math.abs(totalPct - 100) > 0.01) return res.status(400).json({ error: 'Allocation must total 100%' });
  }
  const id = uuidv4();
  const alloc = type === 'all_item' ? JSON.stringify([{ branch: brand || 'All Items', pct: 100 }]) : JSON.stringify(allocation);
  run('INSERT INTO promos (id, name, base_price, subsidy_type, subsidy_value, allocation, promo_type, brand, created_by, brand_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, name, base_price, subsidy_type, subsidy_value, alloc, type, brand || '', req.session.user.id, req.session.brand_id]);
  res.json({ id, ok: true });
});

app.put('/api/promos/:id', requireAuth(['admin']), (req, res) => {
  const { name, base_price, subsidy_type, subsidy_value, allocation, status, promo_type, brand } = req.body;
  const type = promo_type || 'branch';
  if (allocation && type === 'branch') {
    const totalPct = allocation.reduce((s, a) => s + parseFloat(a.pct), 0);
    if (Math.abs(totalPct - 100) > 0.01) return res.status(400).json({ error: 'Allocation must total 100%' });
  }
  const existing = get('SELECT * FROM promos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const alloc = allocation ? (type === 'all_item' ? JSON.stringify([{ branch: brand || 'All Items', pct: 100 }]) : JSON.stringify(allocation)) : existing.allocation;
  run('UPDATE promos SET name=?, base_price=?, subsidy_type=?, subsidy_value=?, allocation=?, promo_type=?, brand=?, status=?, updated_at=datetime(\'now\', \'localtime\') WHERE id=?',
    [name || existing.name, base_price || existing.base_price, subsidy_type || existing.subsidy_type, subsidy_value || existing.subsidy_value, alloc, type, brand !== undefined ? brand : existing.brand, status || existing.status, req.params.id]);
  res.json({ ok: true });
});

// --- DeepSeek Trend Generator ---
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

if (!DEEPSEEK_KEY) {
  console.warn('WARNING: DEEPSEEK_KEY not set in environment. Trend generator & AI analysis will fail.');
}

async function callDeepSeek(prompt) {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: 'Kamu adalah trend hunter digital. Hasilkan tren konten sosial media yang sedang viral dalam format JSON. Gunakan bahasa Indonesia. Realistis dan spesifik.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 4096
    })
  });
  if (!res.ok) { const e = await res.text(); throw new Error('DeepSeek error: ' + e); }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function refreshTrends(brandId) {
  try {
    const brand = get('SELECT name, slug FROM brands WHERE id = ?', [brandId]);
    const brandName = brand ? brand.name : '';
    const brandSlug = brand ? brand.slug : '';

    const beautyBrands = ['curabeauty'];
    const foodBrands = ['martabak-kenangan', 'martabak kenangan'];
    const isBeauty = beautyBrands.includes(brandSlug.toLowerCase());
    const isFood = foodBrands.includes(brandSlug.toLowerCase());

    let promptCategory, promptExample;
    if (isBeauty) {
      promptCategory = 'beauty, skincare, makeup, haircare, bodycare, fragrance, nail art';
      promptExample = 'contoh: "Glass Skin Routine ala Korea", "Ombre Lips Tutorial", "Pimple Patch Hack", "Hair Oiling Trend", "Layering Skincare yang Benar"';
    } else if (isFood) {
      promptCategory = 'kuliner, street food, dessert, martabak, jajanan viral, food challenge, food review';
      promptExample = 'contoh: "Martabak Rainbow Challenge", "Mukbang Martabak Jumbo", "Review Martabak 24 Jam", "ASMR Masak Martabak", "Martabak Mini Bites Viral"';
    } else {
      promptCategory = 'beauty, skincare, kuliner, fashion, lifestyle';
      promptExample = 'contoh: "Viral TikTok Challenge", "Trending Recipe", "Beauty Hack 2026"';
    }

    const brandContext = brandName ? `untuk brand "${brandName}"` : 'umum';

    const prompt = `Hasilkan 20 tren konten sosial media yang sedang viral/populer SAAT INI (bulan Juli 2026) ${brandContext} untuk pasar Indonesia. 
    Sebar merata ke 4 platform: TikTok, Instagram, Threads, YouTube (masing-masing 5 tren).
    WAJIB fokus pada kategori: ${promptCategory}.
    Berikan ide konten yang bisa langsung dipakai untuk konten kreator.
    ${promptExample}
    
    Format JSON:
    {
      "trends": [{
        "trend_name": "nama tren",
        "platform": "tiktok" | "instagram" | "threads" | "youtube",
        "volume": "estimasi jumlah postingan (contoh: 2.5M posts / 500rb postingan/ 1.2M views)",
        "category": "${isBeauty ? 'beauty' : isFood ? 'kuliner' : 'general'}",
        "notes": "penjelasan singkat kenapa tren ini viral, bagaimana cara membuat kontennya, angle yang bisa dipakai"
      }]
    }
    
    Pastikan tren terdengar real, spesifik, bisa langsung dieksekusi, dan relate dengan budaya Indonesia 2026.`;

    const result = await callDeepSeek(prompt);
    const trends = result.trends || [];
    
    // Clear old trends for this brand (keep only last 50)
    const existing = query('SELECT id FROM trends WHERE brand_id = ? ORDER BY discovered_at DESC', [brandId]);
    if (existing.length >= 50) {
      const ids = existing.slice(49).map(t => t.id);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        run(`DELETE FROM trends WHERE id IN (${placeholders})`, ids);
      }
    }
    
    // Insert new trends
    for (const t of trends) {
      run(
        'INSERT INTO trends (id, trend_name, platform, volume, category, relevance, notes, source_url, brand_id, discovered_at) VALUES (?,?,?,?,?,?,?,?,?,datetime(\'now\', \'localtime\'))',
        [uuidv4(), t.trend_name, t.platform, t.volume || '', t.category || '', 'potential', t.notes || '', '', brandId]
      );
    }
    
    // Log activity
    run(
      `INSERT INTO activity_logs (id, user_id, action, details, created_at) VALUES (?,?,?,?,datetime('now', 'localtime'))`,
      [uuidv4(), '00000000-0000-0000-0000-000000000000', 'trends_refresh', `AI menghasilkan ${trends.length} tren baru`]
    );
    
    return { count: trends.length };
  } catch(e) {
    console.error('Trend refresh error:', e.message);
    throw e;
  }
}

app.post('/api/trends/refresh', requireAuth(['admin']), async (req, res) => {
  try {
    const brandId = req.session.brand_id;
    if (!brandId) return res.status(400).json({ error: 'Pilih brand dulu' });
    const result = await refreshTrends(brandId);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: 'Gagal refresh tren: ' + e.message });
  }
});

// --- Trends ---
app.get('/api/trends', requireAuth(), (req, res) => {
  const { platform, relevance, category } = req.query;
  const bf = brandFilter(req);
  let sql = `SELECT * FROM trends WHERE 1=1${bf.sql}`;
  const params = [...bf.params];
  if (platform) { sql += ' AND platform = ?'; params.push(platform); }
  if (relevance) { sql += ' AND relevance = ?'; params.push(relevance); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY discovered_at DESC';
  const trends = query(sql, params);
  res.json({ trends });
});

app.post('/api/trends', requireAuth(), (req, res) => {
  const { trend_name, platform, volume, category, relevance, notes, source_url } = req.body;
  const id = uuidv4();
  run('INSERT INTO trends (id, trend_name, platform, volume, category, relevance, notes, source_url, brand_id) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, trend_name, platform, volume || '', category || '', relevance || 'potential', notes || '', source_url || '', req.session.brand_id]);
  res.json({ id, ok: true });
});

app.put('/api/trends/:id', requireAuth(), (req, res) => {
  const { relevance, notes } = req.body;
  run('UPDATE trends SET relevance=COALESCE(?,relevance), notes=COALESCE(?,notes) WHERE id=?', [relevance, notes, req.params.id]);
  res.json({ ok: true });
});

app.post('/api/trends/batch-draft', requireAuth(), (req, res) => {
  const { trend_ids } = req.body;
  const user = req.session.user;
  const placeholders = trend_ids.map(() => '?').join(',');
  const trends = query(`SELECT * FROM trends WHERE id IN (${placeholders})`, trend_ids);
  const results = [];
  for (const trend of trends) {
    const id = uuidv4();
    const today = new Date(); today.setDate(today.getDate() + 3);
    run("INSERT INTO contents (id, title, caption, platform, posting_date, status, creator_id, tags) VALUES (?,?,?,?,?,'draft',?,?)",
      [id, 'Content: ' + trend.trend_name, 'Trend reference: ' + trend.trend_name + '\n\n[Caption here]', trend.platform === 'tiktok' ? 'tiktok' : 'ig', today.toISOString().split('T')[0], user.id, JSON.stringify(['trend', trend.category])]);
    run('UPDATE trends SET relevance=? WHERE id=?', ['used', trend.id]);
    results.push(id);
  }
  res.json({ ids: results, ok: true });
});

// --- Templates / Asset Generator ---
app.get('/api/templates', requireAuth(), (req, res) => {
  const { category } = req.query;
  const bf = brandFilter(req);
  let sql = 'SELECT t.*, u.display_name as created_by_name FROM templates t LEFT JOIN users u ON t.created_by = u.id WHERE 1=1';
  const params = [];
  sql += bf.sql; params.push(...bf.params);
  if (category) { sql += ' AND t.category = ?'; params.push(category); }
  sql += ' ORDER BY t.name ASC';
  const templates = query(sql, params);
  res.json({ templates });
});

app.delete('/api/templates/:id', requireAuth(), (req, res) => {
  try {
    run('DELETE FROM templates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Reports / Analytics ---
app.get('/api/report', requireAuth(['admin']), (req, res) => {
  const { date_from, date_to } = req.query;
  const bf = brandFilter(req);
  let sql = `SELECT c.*, cr.display_name as creator_name FROM contents c LEFT JOIN users cr ON c.creator_id = cr.id WHERE 1=1${bf.sql}`;
  const params = [...bf.params];
  if (date_from && date_to) { sql += ' AND c.posting_date >= ? AND c.posting_date <= ?'; params.push(date_from, date_to); }
  sql += ' ORDER BY c.posting_date DESC';
  const contents = query(sql, params);
  const totalPosts = contents.length;
  const posted = contents.filter(c => c.status === 'posted' || c.status === 'scheduled' || c.status === 'done').length;
  res.json({
    totalPosts,
    posted,
    draft: contents.filter(c => c.status === 'draft').length,
    pendingReview: contents.filter(c => c.status === 'pending_review').length,
    pendingApproval: contents.filter(c => c.status === 'pending_approval').length,
    scheduled: contents.filter(c => c.status === 'scheduled').length,
    contents: contents.slice(0, 50),
    avgApprovalTime: 'N/A',
    topContent: contents.slice(0, 5)
  });
});

// --- Analytics Dashboard ---
app.get('/api/analytics', requireAuth(), (req, res) => {
  try {
    const { date_from, date_to, platform, status, campaign, sort, order } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const bf = brandFilter(req);

    let where = `WHERE 1=1${bf.sql}`;
    const params = [...bf.params];

    if (date_from && date_to) { where += ' AND c.posting_date >= ? AND c.posting_date <= ?'; params.push(date_from, date_to); }
    if (platform) { const plats = platform.split(','); where += ` AND c.platform IN (${plats.map(()=>'?').join(',')})`; params.push(...plats); }
    if (status) { where += ' AND c.status = ?'; params.push(status); }
    if (campaign) { where += ' AND c.campaign = ?'; params.push(campaign); }

    const baseFrom = 'FROM contents c LEFT JOIN users cr ON c.creator_id = cr.id';

    // KPI
    const kpiRow = get(`SELECT COUNT(*) as totalContent, COALESCE(SUM(c.reach),0) as totalReach, COALESCE(SUM(c.views),0) as totalViews, COALESCE(SUM(c.impressions),0) as totalImpressions, COALESCE(SUM(c.likes+c.comments+c.shares+c.saves),0) as totalEngagement, COALESCE(SUM(c.followers_growth),0) as followersGrowth, COUNT(DISTINCT CASE WHEN c.campaign != '' THEN c.campaign END) as totalCampaign, CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(c.reach),0) ELSE 0 END as avgReachPerContent, CASE WHEN SUM(c.reach) > 0 THEN ROUND(CAST(SUM(c.likes+c.comments+c.shares+c.saves) AS REAL) / SUM(c.reach) * 100, 2) ELSE 0 END as engagementRate ${baseFrom} ${where}`, params);

    // Platform breakdown
    const platforms = query(`SELECT c.platform, COUNT(*) as totalPost, COALESCE(SUM(c.reach),0) as reach, COALESCE(SUM(c.views),0) as views, COALESCE(SUM(c.likes),0) as likes, COALESCE(SUM(c.comments),0) as comments, COALESCE(SUM(c.shares),0) as shares, COALESCE(SUM(c.saves),0) as saves, COALESCE(SUM(c.impressions),0) as impressions, CASE WHEN SUM(c.reach) > 0 THEN ROUND(CAST(SUM(c.likes+c.comments+c.shares+c.saves) AS REAL) / SUM(c.reach) * 100, 2) ELSE 0 END as engagementRate ${baseFrom} ${where} GROUP BY c.platform ORDER BY reach DESC`, params);

    // Daily views/reach
    const dailyViews = query(`SELECT c.posting_date as date, COALESCE(SUM(c.views),0) as views, COALESCE(SUM(c.reach),0) as reach ${baseFrom} ${where} AND c.posting_date IS NOT NULL AND c.posting_date != '' GROUP BY c.posting_date ORDER BY c.posting_date ASC`, params);

    // Engagement per platform
    const engagementPerPlatform = query(`SELECT c.platform, COALESCE(SUM(c.likes+c.comments+c.shares+c.saves),0) as engagement ${baseFrom} ${where} GROUP BY c.platform ORDER BY engagement DESC`, params);

    // Content distribution by platform
    const contentByPlatform = query(`SELECT c.platform, COUNT(*) as count ${baseFrom} ${where} GROUP BY c.platform ORDER BY count DESC`, params);

    // Campaign breakdown
    const contentPerCampaign = query(`SELECT CASE WHEN c.campaign = '' THEN 'No Campaign' ELSE c.campaign END as campaign, COUNT(*) as count ${baseFrom} ${where} GROUP BY c.campaign ORDER BY count DESC`, params);

    // Followers growth daily
    const followersGrowthDaily = query(`SELECT c.posting_date as date, COALESCE(SUM(c.followers_growth),0) as growth ${baseFrom} ${where} AND c.posting_date IS NOT NULL AND c.posting_date != '' GROUP BY c.posting_date ORDER BY c.posting_date ASC`, params);

    // Top content by engagement
    const topSql = `SELECT c.*, cr.display_name as creator_name ${baseFrom} ${where} ORDER BY (c.likes+c.comments+c.shares+c.saves) DESC LIMIT 10`;
    const topContent = query(topSql, params);

    // Bottom content by engagement
    const bottomSql = `SELECT c.*, cr.display_name as creator_name ${baseFrom} ${where} AND (c.likes+c.comments+c.shares+c.saves) > 0 ORDER BY (c.likes+c.comments+c.shares+c.saves) ASC LIMIT 10`;
    const bottomContent = query(bottomSql, params);

    // Total count for all matching content
    const totalRow = get(`SELECT COUNT(*) as c ${baseFrom} ${where}`, params);

    res.json({
      kpi: kpiRow,
      platforms,
      topContent,
      bottomContent,
      dailyViews,
      engagementPerPlatform,
      contentByPlatform,
      contentPerCampaign,
      followersGrowthDaily,
      total: totalRow.c,
      page,
      limit,
      totalPages: Math.ceil(totalRow.c / limit) || 1
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Settings API ---
app.get('/api/settings/:key', requireAuth(['admin']), (req, res) => {
  const row = get('SELECT value FROM settings WHERE key = ?', [req.params.key]);
  res.json({ key: req.params.key, value: row?.value || null });
});

app.put('/api/settings/:key', requireAuth(['admin']), (req, res) => {
  const { value } = req.body;
  if (value === undefined || value === null) {
    run('DELETE FROM settings WHERE key = ?', [req.params.key]);
  } else {
    run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')`, [req.params.key, String(value)]);
  }
  res.json({ ok: true });
});

app.get('/api/ig/status', requireAuth(['admin']), (req, res) => {
  const apiKey = process.env.COMPOSIO_API_KEY || (get('SELECT value FROM settings WHERE key = ?', ['COMPOSIO_API_KEY'])?.value);
  const connectedAccountId = process.env.IG_CONNECTED_ACCOUNT_ID || (get('SELECT value FROM settings WHERE key = ?', ['IG_CONNECTED_ACCOUNT_ID'])?.value);
  const entityId = process.env.COMPOSIO_ENTITY_ID || (get('SELECT value FROM settings WHERE key = ?', ['COMPOSIO_ENTITY_ID'])?.value);
  res.json({
    configured: !!(apiKey && connectedAccountId && entityId),
    hasApiKey: !!apiKey,
    hasConnectedAccount: !!connectedAccountId,
    hasEntityId: !!entityId
  });
});

// Helper function to get IG config
function getIgConfig() {
  return {
    apiKey: process.env.COMPOSIO_API_KEY || (get('SELECT value FROM settings WHERE key = ?', ['COMPOSIO_API_KEY'])?.value),
    connectedAccountId: process.env.IG_CONNECTED_ACCOUNT_ID || (get('SELECT value FROM settings WHERE key = ?', ['IG_CONNECTED_ACCOUNT_ID'])?.value),
    entityId: process.env.COMPOSIO_ENTITY_ID || (get('SELECT value FROM settings WHERE key = ?', ['COMPOSIO_ENTITY_ID'])?.value)
  };
}

// Modify sync-ig to use settings table as fallback
app.post('/api/analytics/sync-ig', requireAuth(), async (req, res) => {
  try {
    const igConfig = getIgConfig();
    const apiKey = igConfig.apiKey;
    const connectedAccountId = igConfig.connectedAccountId;
    const entityId = igConfig.entityId;
    if (!apiKey || !connectedAccountId || !entityId) {
      return res.status(400).json({ error: 'IG belum dikonfigurasi. Buka Analytics > Setup IG untuk konfigurasi.' });
    }
    const composio = new Composio({ apiKey });

    let userInfo;
    try {
      userInfo = await composio.tools.execute('INSTAGRAM_GET_USER_INFO', {
        userId: entityId, connectedAccountId, arguments: {},
        dangerouslySkipVersionCheck: true
      });
    } catch (e) {
      const cause = e.cause || e;
      console.error('[Sync IG] Error detail:', cause);
      return res.status(400).json({ error: 'Gagal connect ke Instagram via Composio. Detail: ' + (cause?.message || e.message || cause) });
    }
    const igUserId = userInfo?.id || userInfo?.data?.id || 'me';

    let mediaRes;
    try {
      mediaRes = await composio.tools.execute('INSTAGRAM_GET_IG_USER_MEDIA', {
        userId: entityId, connectedAccountId,
        arguments: { ig_user_id: igUserId },
        dangerouslySkipVersionCheck: true
      });
    } catch (e) {
      return res.status(400).json({ error: 'Gagal ambil media IG. Detail: ' + e.message });
    }
    const igMediaList = mediaRes?.data?.data || mediaRes?.data || [];

    const dbContents = query("SELECT id, title, posting_date, ig_media_id, reach, views, likes, comments, shares, saves, impressions, watch_time, followers_growth FROM contents WHERE platform = 'ig' AND brand_id = ?", [req.session.brand_id]);

    let synced = 0, failed = 0, unmatched = 0, details = [];

    const dateMap = {};
    for (const c of dbContents) {
      const d = c.posting_date || '';
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(c);
    }

    for (const igMedia of igMediaList) {
      try {
        const igId = igMedia.id;
        if (!igId) continue;

        let match = dbContents.find(c => c.ig_media_id === igId);

        if (!match) {
          const igTimestamp = igMedia.timestamp || igMedia.created_time || '';
          const igDate = igTimestamp.substring(0, 10);
          const candidates = dateMap[igDate] || [];
          match = candidates.find(c => !c.ig_media_id);
          if (!match && candidates.length > 0) match = candidates[0];
        }

        if (!match) { unmatched++; continue; }

        run('UPDATE contents SET ig_media_id = ? WHERE id = ?', [igId, match.id]);

        const insightsRes = await composio.tools.execute('INSTAGRAM_GET_IG_MEDIA_INSIGHTS', {
          userId: entityId, connectedAccountId,
          arguments: {
            ig_media_id: igId,
            metric: ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'impressions', 'total_interactions']
          },
          dangerouslySkipVersionCheck: true
        });

        const metrics = {};
        const insightData = insightsRes?.data?.data || insightsRes?.data || [];
        for (const m of insightData) {
          const val = m.values?.[0]?.value;
          if (val === undefined) continue;
          const name = m.name?.toLowerCase();
          if (name === 'reach') metrics.reach = val;
          else if (name === 'views') metrics.views = val;
          else if (name === 'likes') metrics.likes = val;
          else if (name === 'comments') metrics.comments = val;
          else if (name === 'shares') metrics.shares = val;
          else if (name === 'saved') metrics.saves = val;
          else if (name === 'impressions') metrics.impressions = val;
        }

        if (Object.keys(metrics).length > 0) {
          const setClauses = Object.keys(metrics).map(k => `${k} = ?`).join(', ');
          const values = Object.values(metrics);
          run(`UPDATE contents SET ${setClauses}, last_sync = datetime('now', 'localtime') WHERE id = ?`, [...values, match.id]);
        }

        synced++;
        details.push({ title: match.title, ig_media_id: igId, metrics });
      } catch (e) {
        failed++;
        details.push({ error: e.message });
      }
    }

    res.json({ ok: true, synced, failed, unmatched, details, total_ig_media: igMediaList.length, total_db_content: dbContents.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- TikTok Sync ---
app.get('/api/tiktok/status', requireAuth(['admin']), (req, res) => {
  const connectedAccountId = process.env.TIKTOK_CONNECTED_ACCOUNT_ID || (get('SELECT value FROM settings WHERE key = ?', ['TIKTOK_CONNECTED_ACCOUNT_ID'])?.value);
  res.json({
    configured: !!connectedAccountId,
    hasConnectedAccount: !!connectedAccountId
  });
});

app.post('/api/analytics/sync-tiktok', requireAuth(), async (req, res) => {
  try {
    const igConfig = getIgConfig();
    const connectedAccountId = process.env.TIKTOK_CONNECTED_ACCOUNT_ID || (get('SELECT value FROM settings WHERE key = ?', ['TIKTOK_CONNECTED_ACCOUNT_ID'])?.value);
    if (!igConfig.apiKey || !connectedAccountId || !igConfig.entityId) {
      return res.status(400).json({ error: 'TikTok belum dikonfigurasi. Setup lewat Analytics.' });
    }
    const composio = new Composio({ apiKey: igConfig.apiKey });

    const mediaRes = await composio.tools.execute('TIKTOK_LIST_VIDEOS', {
      userId: igConfig.entityId, connectedAccountId,
      arguments: { max_count: 100 },
      dangerouslySkipVersionCheck: true
    });
    const videoList = mediaRes?.data?.data || mediaRes?.data || [];

    const dbContents = query("SELECT id, title, posting_date, ig_media_id, reach, views, likes, comments, shares, saves, impressions, watch_time, followers_growth FROM contents WHERE platform = 'tiktok' AND brand_id = ?", [req.session.brand_id]);

    let synced = 0, failed = 0, unmatched = 0;

    const dateMap = {};
    for (const c of dbContents) {
      const d = c.posting_date || '';
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(c);
    }

    for (const video of videoList) {
      try {
        const vid = video.id;
        if (!vid) continue;

        let match = dbContents.find(c => c.ig_media_id === vid);
        if (!match) {
          const ts = video.create_time || video.timestamp || '';
          const d = ts.substring(0, 10);
          const candidates = dateMap[d] || [];
          match = candidates.find(c => !c.ig_media_id) || candidates[0];
        }

        if (!match) { unmatched++; continue; }

        run('UPDATE contents SET ig_media_id = ? WHERE id = ?', [vid, match.id]);

        const metrics = {};
        if (video.view_count !== undefined) metrics.views = video.view_count;
        if (video.like_count !== undefined) metrics.likes = video.like_count;
        if (video.comment_count !== undefined) metrics.comments = video.comment_count;
        if (video.share_count !== undefined) metrics.shares = video.share_count;

        if (Object.keys(metrics).length > 0) {
          const setClauses = Object.keys(metrics).map(k => `${k} = ?`).join(', ');
          const values = Object.values(metrics);
          run(`UPDATE contents SET ${setClauses}, last_sync = datetime('now', 'localtime') WHERE id = ?`, [...values, match.id]);
        }

        synced++;
      } catch (e) {
        failed++;
      }
    }

    res.json({ ok: true, synced, failed, unmatched, total_videos: videoList.length, total_db_content: dbContents.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- AI Report Analysis ---
app.get('/api/analytics/last-sync', requireAuth(), (req, res) => {
  const row = get("SELECT MAX(last_sync) as last_sync FROM contents WHERE brand_id = ? AND last_sync != '' AND last_sync IS NOT NULL", [req.session.brand_id]);
  res.json({ last_sync: row?.last_sync || null });
});

app.post('/api/report/ai-analyze', requireAuth(['admin']), async (req, res) => {
  try {
    const brandId = req.session.brand_id;
    if (!brandId) return res.status(400).json({ error: 'Pilih brand dulu' });
    const brand = get('SELECT name FROM brands WHERE id = ?', [brandId]);
    const brandName = brand ? brand.name : 'Brand';

    const plansWithInsight = query(
      `SELECT id, title, status, content_type, pillar, insight, evaluation, upload_date
       FROM content_plans
       WHERE brand_id = ? AND (insight IS NOT NULL AND insight != '' OR evaluation IS NOT NULL AND evaluation != '')
       ORDER BY upload_date DESC LIMIT 30`, [brandId]);

    if (!plansWithInsight.length) {
      return res.json({ analysis: 'Belum ada data insight. Isi insight di konten dulu biar AI bisa analisis.', rawData: [] });
    }

    const dataSummary = plansWithInsight.map(p => ({
      judul: p.title.substring(0, 60),
      tanggal: p.upload_date,
      tipe: p.content_type,
      pilar: p.pillar,
      status: p.status,
      insight: p.insight || '',
      evaluasi: p.evaluation || ''
    }));

    const prompt = `Kamu adalah content analyst profesional untuk brand "${brandName}".

Berikut data insight konten selama ini:
${JSON.stringify(dataSummary, null, 2)}

Analisis data diatas dan berikan LAPORAN ANALISIS dalam format JSON berikut:
{
  "ringkasan": "ringkasan performa konten secara keseluruhan (2-3 kalimat, bahasa Indonesia)",
  "pola_sukses": ["temuan pola konten yg sukses", "..."],
  "pola_lemah": ["temuan pola konten yg kurang berhasil", "..."],
  "rekomendasi_pilar": "rekomendasi pilar konten yg sebaiknya difokuskan",
  "rekomendasi_platform": "platform mana yg paling potensial berdasarkan data",
  "rekomendasi_tipe": "tipe konten (reels/feed/carousel) yg paling efektif",
  "ide_konten": ["3-5 ide konten baru spesifik berdasarkan data", "..."],
  "kesimpulan": "kesimpulan akhir dan langkah selanjutnya (2-3 kalimat)"
}

Gunakan bahasa Indonesia, tone profesional tapi santai. Jangan mengada-ada — analisis hanya berdasarkan data yang diberikan.`;

    const result = await callDeepSeek(prompt);
    res.json({ analysis: result, rawData: dataSummary });
  } catch(e) {
    res.status(500).json({ error: 'Gagal analisis AI: ' + e.message });
  }
});

// --- Notifications ---
app.get('/api/notifications', requireAuth(), (req, res) => {
  const user = req.session.user;
  const bf = brandFilter(req);
  const notifs = query('SELECT * FROM notifications WHERE user_id = ?' + bf.sql + ' ORDER BY created_at DESC LIMIT 50', [user.id, ...bf.params]);
  const unread = get('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0' + bf.sql, [user.id, ...bf.params]);
  res.json({ notifications: notifs, unread: unread.c });
});

app.put('/api/notifications/:id/read', requireAuth(), (req, res) => {
  const notif = get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
  if (!notif) return res.status(404).json({ error: 'Not found' });
  run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.put('/api/notifications/read-all', requireAuth(), (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.user.id]);
  res.json({ ok: true });
});

app.delete('/api/notifications/:id', requireAuth(), (req, res) => {
  const notif = get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
  if (!notif) return res.status(404).json({ error: 'Not found' });
  run('DELETE FROM notifications WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/notifications', requireAuth(), (req, res) => {
  const result = run('DELETE FROM notifications WHERE user_id = ?', [req.session.user.id]);
  res.json({ ok: true, deleted: result.changes });
});

function checkDeadlineNotifications(userId) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  const contents = query('SELECT c.id, c.title, c.status, c.brand_id FROM contents c WHERE c.creator_id = ? AND c.posting_date = ? AND c.status IN (\'scheduled\',\'approved\',\'pending_approval\')', [userId, dateStr]);
  for (const c of contents) {
    const existing = get('SELECT id FROM notifications WHERE user_id = ? AND content_id = ? AND type = ?', [userId, c.id, 'deadline_h1']);
    if (existing) continue;
    const id = uuidv4();
    run('INSERT INTO notifications (id, user_id, content_id, type, message, created_at, brand_id) VALUES (?,?,?,?,?,?,?)',
      [id, userId, c.id, 'deadline_h1', `Deadline H-1: Konten "${c.title}" akan tayang besok!`, now(), c.brand_id || null]);
  }
}

// --- Activity Log (all brands, paginated, filterable by date) ---
app.get('/api/activities', requireAuth(), (req, res) => {
  const { content_id, date, page } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
  const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

  let baseSql = 'FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id';
  const params = [];
  const conditions = [];

  if (content_id) { conditions.push('al.content_id = ?'); params.push(content_id); }
  if (date) { conditions.push("substr(al.created_at, 1, 10) = ?"); params.push(date); }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const total = get('SELECT COUNT(*) as c ' + baseSql + where, params).c;

  const sql = 'SELECT al.*, u.display_name as user_name ' + baseSql + where +
    ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const logs = query(sql, params);

  res.json({
    logs,
    total,
    page: parseInt(page) || 1,
    limit,
    totalPages: Math.ceil(total / limit) || 1
  });
});

// --- File Upload ---
app.post('/api/upload', requireAuth(), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/uploads/' + req.file.filename, name: req.file.originalname });
});

// ========== CONTENT PLANS ==========
app.get('/api/content-plans', requireAuth(), (req, res) => {
  try {
    const { month, page, limit, sort, order, status } = req.query;
    const bf = brandFilter(req);
    let sql = `SELECT * FROM content_plans WHERE 1=1${bf.sql}`;
    const params = [...bf.params];
    if (month) { sql += ' AND month_group = ?'; params.push(month); }
    if (status) { sql += ' AND LOWER(status) = LOWER(?)'; params.push(status); }
    const sortCol = sort || 'upload_date';
    const sortOrder = (order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortCol} ${sortOrder}`;
    const totalParams = [...bf.params];
    if (month) totalParams.push(month);
    if (status) totalParams.push(status);
    const total = get(`SELECT COUNT(*) as c FROM content_plans WHERE 1=1${bf.sql}${month ? ' AND month_group = ?' : ''}${status ? ' AND LOWER(status) = LOWER(?)' : ''}`, totalParams).c;
    const p = parseInt(page) || 1;
    const lmt = parseInt(limit) || 50;
    const offset = (p - 1) * lmt;
    sql += ' LIMIT ? OFFSET ?'; params.push(lmt, offset);
    const plans = query(sql, params);
    res.json({ plans, total, page: p, limit: lmt, sort: sortCol, order: sortOrder });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Content Plan ↔ Calendar Sync ---
const STATUS_MAP = { 'Published': 'posted', 'Draft': 'draft', 'Proses Writing': 'draft', 'Ready for review': 'pending_approval', 'Review': 'pending_review', 'Scheduled': 'scheduled' };
function mapPlatform(contentType) {
  if (!contentType) return 'ig';
  const t = contentType.toLowerCase();
  if (t.includes('reels')) return 'ig';
  if (t.includes('carousel')) return 'ig';
  if (t.includes('feed')) return 'ig';
  if (t.includes('story')) return 'ig';
  return 'ig';
}

function syncContentFromPlan(planId, data, userId) {
  const plan = get('SELECT brand_id FROM content_plans WHERE id = ?', [planId]);
  if (!plan) return;
  const brandId = plan.brand_id;
  const existing = get('SELECT id FROM contents WHERE content_plan_id = ?', [planId]);
  const title = data.title || '';
  const caption = data.copywriting || '';
  const rawDate = data.upload_date || '';
  // Normalize DD/MM/YYYY → YYYY-MM-DD
  const postingDate = rawDate.includes('/') ? rawDate.split('/').reverse().join('-') : rawDate;
  const platform = mapPlatform(data.content_type);
  const status = STATUS_MAP[data.status] || 'draft';

  if (existing) {
    run(`UPDATE contents SET title=?, caption=?, platform=?, posting_date=?, status=?, content_url=?, canva_link=?, brand_id=?, updated_at=datetime('now', 'localtime') WHERE content_plan_id=?`,
      [title, caption, platform, postingDate, status, data.upload_link || '', data.canva_link || '', brandId, planId]);
  } else if (postingDate) {
    const id = uuidv4();
    run(`INSERT INTO contents (id, title, caption, platform, posting_date, posting_time, status, creator_id, brand_id, content_plan_id, tags, content_url, canva_link, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now', 'localtime'),datetime('now', 'localtime'))`,
      [id, title, caption, platform, postingDate, '10:00', status, userId, brandId, planId, '[]', data.upload_link || '', data.canva_link || '']);
    if (status === 'draft') run(`UPDATE content_plans SET status=? WHERE id=?`, ['Draft', planId]);
  }
}

app.post('/api/content-plans', requireAuth(), (req, res) => {
  try {
    const { status, pic, upload_date, pillar, content_type, title, copywriting, concept, design_ref, publisher, brand, design_result, canva_link, upload_link, page_notes, insight, evaluation, month_group } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const id = uuidv4();
    run(`INSERT INTO content_plans (id, brand_id, status, pic, upload_date, pillar, content_type, title, copywriting, concept, design_ref, publisher, brand, design_result, canva_link, upload_link, page_notes, insight, evaluation, month_group, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now', 'localtime'),datetime('now', 'localtime'))`,
      [id, req.session.brand_id, status||'Draft', pic||'', upload_date||'', pillar||'', content_type||'', title, copywriting||'', concept||'', design_ref||'', publisher||'', brand||'', design_result||'', canva_link||'', upload_link||'', page_notes||'', insight||'', evaluation||'', month_group||'', req.session.user.id]);
    run(`INSERT INTO activity_logs (id, content_id, user_id, action, details, brand_id, created_at) VALUES (?,?,?,?,?,?,datetime('now', 'localtime'))`,
      [uuidv4(), id, req.session.user.id, 'plan_created', `Membuat rencana "${title}"`, req.session.brand_id]);
    syncContentFromPlan(id, req.body, req.session.user.id);
    res.json({ id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/content-plans/:id', requireAuth(), (req, res) => {
  try {
    const { status, pic, upload_date, pillar, content_type, title, copywriting, concept, design_ref, publisher, brand, design_result, canva_link, upload_link, page_notes, insight, evaluation, month_group } = req.body;
    run(`UPDATE content_plans SET status=?, pic=?, upload_date=?, pillar=?, content_type=?, title=?, copywriting=?, concept=?, design_ref=?, publisher=?, brand=?, design_result=?, canva_link=?, upload_link=?, page_notes=?, insight=?, evaluation=?, month_group=?, updated_at=datetime('now', 'localtime') WHERE id=?`,
      [status||'Draft', pic||'', upload_date||'', pillar||'', content_type||'', title, copywriting||'', concept||'', design_ref||'', publisher||'', brand||'', design_result||'', canva_link||'', upload_link||'', page_notes||'', insight||'', evaluation||'', month_group||'', req.params.id]);
    run(`INSERT INTO activity_logs (id, content_id, user_id, action, details, brand_id, created_at) VALUES (?,?,?,?,?,?,datetime('now', 'localtime'))`,
      [uuidv4(), req.params.id, req.session.user.id, 'plan_updated', `Mengupdate "${title}"`, req.session.brand_id]);
    syncContentFromPlan(req.params.id, req.body, req.session.user.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Bulk Plan Actions ---
app.delete('/api/content-plans/bulk', requireAuth(['admin']), (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'ids required' });
    const placeholders = ids.map(() => '?').join(',');
    run(`DELETE FROM contents WHERE content_plan_id IN (${placeholders})`, ids);
    run(`DELETE FROM content_plans WHERE id IN (${placeholders})`, ids);
    run(`INSERT INTO activity_logs (id, user_id, action, details, brand_id, created_at) VALUES (?,?,?,?,?,datetime('now', 'localtime'))`,
      [uuidv4(), req.session.user.id, 'bulk_plan_delete', `Menghapus ${ids.length} rencana`, req.session.brand_id]);
    res.json({ success: true, deleted: ids.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/content-plans/bulk/status', requireAuth(['admin']), (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !ids.length || !status) return res.status(400).json({ error: 'ids and status required' });
    const placeholders = ids.map(() => '?').join(',');
    run(`UPDATE content_plans SET status=?, updated_at=datetime('now', 'localtime') WHERE id IN (${placeholders})`, [status, ...ids]);
    res.json({ success: true, updated: ids.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/content-plans/:id', requireAuth(['admin']), (req, res) => {
  try {
    const plan = get('SELECT title FROM content_plans WHERE id = ?', [req.params.id]);
    run(`INSERT INTO activity_logs (id, content_id, user_id, action, details, brand_id, created_at) VALUES (?,?,?,?,?,?,datetime('now', 'localtime'))`,
      [uuidv4(), req.params.id, req.session.user.id, 'plan_deleted', `Menghapus "${plan ? plan.title : 'rencana'}"`, req.session.brand_id]);
    run('DELETE FROM contents WHERE content_plan_id = ?', [req.params.id]);
    run('DELETE FROM content_plans WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Bulk Export ---
app.get('/api/content-plans/export', requireAuth(), (req, res) => {
  try {
    const bf = brandFilter(req);
    const plans = query(`SELECT * FROM content_plans WHERE 1=1${bf.sql} ORDER BY upload_date ASC`, bf.params);
    const headers = 'Judul,Status,PIC,Tanggal,Pilar,Tipe,Konsep,Publisher,Brand,Upload Link,Canva Link,Keterangan Page,Insight,Evaluasi,Bulan\n';
    const rows = plans.map(p => 
      `"${(p.title||'').replace(/"/g,'""')}","${p.status||''}","${p.pic||''}","${p.upload_date||''}","${p.pillar||''}","${p.content_type||''}","${(p.concept||'').replace(/"/g,'""')}","${p.publisher||''}","${p.brand||''}","${p.upload_link||''}","${p.canva_link||''}","${(p.page_notes||'').replace(/"/g,'""')}","${(p.insight||'').replace(/"/g,'""')}","${(p.evaluation||'').replace(/"/g,'""')}","${p.month_group||''}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=content-plans.csv');
    res.send('\uFEFF' + headers + rows); // BOM for Excel UTF-8
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Bulk Import ---
app.post('/api/content-plans/import', requireAuth(['admin']), (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'CSV content required' });
    const lines = csv.trim().split('\n');
    const headerRow = lines[0].split(',').map(h => h.replace(/"/g,'').trim().toLowerCase());
    const idx = name => headerRow.indexOf(name);
    const created = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g).map(v => v.replace(/^"|"$/g,'').trim());
      const title = vals[idx('judul')] || '';
      if (!title) continue;
      const id = uuidv4();
      run(`INSERT INTO content_plans (id, brand_id, status, pic, upload_date, pillar, content_type, title, concept, publisher, brand, upload_link, canva_link, page_notes, insight, evaluation, month_group, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, req.session.brand_id,
         vals[idx('status')] || 'Draft',
         vals[idx('pic')] || '',
         vals[idx('tanggal')] || '',
         vals[idx('pilar')] || '',
         vals[idx('tipe')] || '',
         title,
         vals[idx('konsep')] || '',
         vals[idx('publisher')] || '',
         vals[idx('brand')] || '',
         vals[idx('upload link')] || '',
         vals[idx('canva link')] || '',
         vals[idx('keterangan page')] || '',
         vals[idx('insight')] || '',
         vals[idx('evaluasi')] || '',
         vals[idx('bulan')] || '',
         req.session.user.id]);
      syncContentFromPlan(id, { title, upload_date: vals[idx('tanggal')], status: vals[idx('status')], content_type: vals[idx('tipe')], copywriting: '', upload_link: vals[idx('upload link')] }, req.session.user.id);
      created.push(id);
    }
    run(`INSERT INTO activity_logs (id, content_id, user_id, action, details, brand_id, created_at) VALUES (?,?,?,?,?,?,datetime('now', 'localtime'))`,
      [uuidv4(), 'batch', req.session.user.id, 'batch_import', `Import ${created.length} rencana konten`, req.session.brand_id]);
    res.json({ count: created.length, ids: created });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Content Plan Months ---
app.get('/api/content-plans/months', requireAuth(), (req, res) => {
  try {
    const bf = brandFilter(req);
    const months = query(`SELECT DISTINCT month_group FROM content_plans WHERE month_group IS NOT NULL AND month_group != ''${bf.sql} ORDER BY month_group DESC`, bf.params);
    res.json({ months: months.map(m => m.month_group) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- Canva Templates ---
app.get('/api/canva-templates', requireAuth(), (req, res) => {
  try {
    const bf = brandFilter(req);
    const sql = `SELECT ct.* FROM canva_templates ct WHERE 1=1${bf.sql} ORDER BY ct.name ASC`;
    const templates = query(sql, bf.params);
    res.json({ templates });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/canva-templates', requireAuth(), (req, res) => {
  try {
    const { name, description, template_id, thumbnail_url } = req.body;
    if (!name || !template_id) return res.status(400).json({ error: 'Name and template_id required' });
    const id = uuidv4();
    run('INSERT INTO canva_templates (id, brand_id, name, description, template_id, thumbnail_url) VALUES (?,?,?,?,?,?)',
      [id, req.session.brand_id, name, description || '', template_id, thumbnail_url || '']);
    res.json({ id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/canva-templates/:id', requireAuth(), (req, res) => {
  try {
    const { name, description, template_id, thumbnail_url } = req.body;
    run('UPDATE canva_templates SET name=?, description=?, template_id=?, thumbnail_url=? WHERE id=?',
      [name, description || '', template_id, thumbnail_url || '', req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/canva-templates/:id', requireAuth(), (req, res) => {
  try {
    run('DELETE FROM canva_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/canva-templates/:id/thumbnail', requireAuth(), upload.single('thumbnail'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const thumbUrl = '/uploads/' + req.file.filename;
  run('UPDATE canva_templates SET thumbnail_url=? WHERE id=?', [thumbUrl, req.params.id]);
  res.json({ ok: true, thumbnail_url: thumbUrl });
});

// --- SPA fallback: serve index.html for all unmatched frontend routes ---
const indexPath = path.join(__dirname, 'public', 'index.html');
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/icons/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(indexPath);
});

// Init & Start
const { getDb } = require('./database');

getDb().then(() => {
  // Reset all activity logs — start fresh with clean data
  run('DELETE FROM activity_logs');
  console.log('[Startup] Activity logs cleared — starting fresh');

  // Check deadline notifications every hour
  cron.schedule('0 * * * *', () => {
    const users = query('SELECT id FROM users');
    users.forEach(u => checkDeadlineNotifications(u.id));
  });
  // Auto-sync IG setiap jam 2 pagi
  const igConfig = getIgConfig();
  if (igConfig.apiKey && igConfig.connectedAccountId) {
    cron.schedule('0 2 * * *', async () => {
      console.log('[Sync IG] Auto-sync dimulai...');
      try {
        const composio = new Composio({ apiKey: igConfig.apiKey });
        const ccId = igConfig.connectedAccountId;
        const userInfo = await composio.tools.execute('INSTAGRAM_GET_USER_INFO', {
          userId: igConfig.entityId, connectedAccountId: ccId, arguments: {},
          dangerouslySkipVersionCheck: true
        });
        const igUserId = userInfo?.id || userInfo?.data?.id || 'me';
        const mediaRes = await composio.tools.execute('INSTAGRAM_GET_IG_USER_MEDIA', {
          userId: igConfig.entityId, connectedAccountId: ccId, arguments: { ig_user_id: igUserId },
          dangerouslySkipVersionCheck: true
        });
        const igMediaList = mediaRes?.data?.data || mediaRes?.data || [];
        const dbContents = query("SELECT id, posting_date, ig_media_id FROM contents WHERE platform = 'ig'");
        const dateMap = {};
        for (const c of dbContents) { const d = c.posting_date || ''; if (!dateMap[d]) dateMap[d] = []; dateMap[d].push(c); }
        let count = 0;
        for (const igMedia of igMediaList) {
          const igId = igMedia.id; if (!igId) continue;
          let match = dbContents.find(c => c.ig_media_id === igId);
          if (!match) {
            const igDate = (igMedia.timestamp || igMedia.created_time || '').substring(0, 10);
            const candidates = dateMap[igDate] || [];
            match = candidates.find(c => !c.ig_media_id) || candidates[0];
            if (match) run('UPDATE contents SET ig_media_id = ? WHERE id = ?', [igId, match.id]);
          }
          if (!match) continue;
          try {
            const insightsRes = await composio.tools.execute('INSTAGRAM_GET_IG_MEDIA_INSIGHTS', {
              userId: igConfig.entityId, connectedAccountId: ccId,
              arguments: { ig_media_id: igId, metric: ['reach', 'views', 'likes', 'comments', 'shares', 'saved'] },
              dangerouslySkipVersionCheck: true
            });
            const metrics = {};
            for (const m of (insightsRes?.data?.data || insightsRes?.data || [])) {
              const val = m.values?.[0]?.value, name = m.name?.toLowerCase();
              if (val !== undefined) {
                if (name === 'reach') metrics.reach = val;
                else if (name === 'views') metrics.views = val;
                else if (name === 'likes') metrics.likes = val;
                else if (name === 'comments') metrics.comments = val;
                else if (name === 'shares') metrics.shares = val;
                else if (name === 'saved') metrics.saves = val;
              }
            }
            if (Object.keys(metrics).length > 0) {
              const setClauses = Object.keys(metrics).map(k => `${k} = ?`).join(', ');
              run(`UPDATE contents SET ${setClauses}, last_sync = datetime('now', 'localtime') WHERE id = ?`, [...Object.values(metrics), match.id]);
            }
            count++;
          } catch(e) { /* skip per-item error */ }
        }
        console.log(`[Sync IG] Auto-sync selesai: ${count} konten diupdate`);
      } catch(e) { console.error('[Sync IG] Auto-sync gagal:', e.message); }
    });
  }
  // Auto-cleanup activity logs older than 7 days (runs daily at 03:00)
  cron.schedule('0 3 * * *', () => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const deleted = run('DELETE FROM activity_logs WHERE substr(created_at, 1, 10) < ?', [cutoff]);
    if (deleted && deleted.changes) console.log(`[Cleanup] Deleted ${deleted.changes} old activity logs`);
  });
  // Also run once on startup
  const users = query('SELECT id FROM users');
  users.forEach(u => checkDeadlineNotifications(u.id));
  app.listen(PORT, () => {
    console.log('ContentFlow v1.1.0 running at http://localhost:' + PORT);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
