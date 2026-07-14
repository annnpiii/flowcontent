const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'data', 'contentflow.db');

let db = null;
let SQL = null;

async function getDb() {
  if (db) return db;
  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
  // Drop stale triggers from previous versions
  try { db.run('DROP TRIGGER IF EXISTS trg_notifications_created_at'); } catch(e) {}
  try { db.run('DROP TRIGGER IF EXISTS trg_activity_logs_created_at'); } catch(e) {}
  initSchema();
  seedData();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function query(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  // Replace SQLite datetime() with JavaScript-generated Makassar timestamp
  // ONLY for INSERT/UPDATE, not CREATE (which uses DEFAULT)
  if (!/^\s*CREATE/i.test(sql)) {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    sql = sql.replace(/datetime\('now', 'localtime'\)/g, "'" + ts + "'");
  }
  db.run(sql, params);
  var changes = db.getRowsModified();
  saveDb();
  return { changes: changes };
}

function get(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Auto-save every 5 seconds
setInterval(() => { if (db) saveDb(); }, 5000);

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','creator')),
      avatar_color TEXT DEFAULT '#6366f1',
      permissions TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      caption TEXT DEFAULT '',
      media TEXT DEFAULT '[]',
      platform TEXT DEFAULT 'ig',
      posting_date TEXT,
      posting_time TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'draft',
      creator_id TEXT,
      editor_id TEXT,
      approver_id TEXT,
      tags TEXT DEFAULT '[]',
      promo_id TEXT,
      feedback TEXT DEFAULT '',
      content_url TEXT DEFAULT '',
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS content_versions (
      id TEXT PRIMARY KEY,
      content_id TEXT,
      caption TEXT,
      media TEXT,
      version INTEGER,
      edited_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      content_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS content_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      folder_id TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      file_path TEXT,
      file_type TEXT DEFAULT 'text',
      tags TEXT DEFAULT '',
      visibility TEXT DEFAULT 'shared',
      category TEXT DEFAULT '',
      version INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS promos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_price REAL NOT NULL,
      subsidy_type TEXT NOT NULL,
      subsidy_value REAL NOT NULL,
      allocation TEXT DEFAULT '[]',
      promo_type TEXT DEFAULT 'branch',
      brand TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  try { db.run(`ALTER TABLE promos ADD COLUMN promo_type TEXT DEFAULT 'branch'`); } catch(e) {}
  try { db.run(`ALTER TABLE promos ADD COLUMN brand TEXT DEFAULT ''`); } catch(e) {}
  try { db.run(`ALTER TABLE contents ADD COLUMN content_url TEXT DEFAULT ''`); } catch(e) {}
  // brands + brand_members tables
  db.run(`CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    logo_url TEXT DEFAULT '', description TEXT DEFAULT '',
    color TEXT DEFAULT '#f43f5e', created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS brand_members (
    id TEXT PRIMARY KEY, brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_brand TEXT DEFAULT 'creator' CHECK(role_in_brand IN ('admin','editor','creator')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')), UNIQUE(brand_id, user_id)
  )`);
  try { db.run(`ALTER TABLE contents ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE content_plans ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE brands ADD COLUMN description TEXT DEFAULT ''`); } catch(e) {}
  try { db.run(`ALTER TABLE brands ADD COLUMN color TEXT DEFAULT '#f43f5e'`); } catch(e) {}
  try { db.run(`ALTER TABLE contents ADD COLUMN content_plan_id TEXT REFERENCES content_plans(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE promos ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE content_plans ADD COLUMN page_notes TEXT DEFAULT ''`); } catch(e) {}
  try { db.run(`ALTER TABLE contents ADD COLUMN canva_link TEXT DEFAULT ''`); } catch(e) {}
  try { db.run(`ALTER TABLE content_items ADD COLUMN canva_link TEXT DEFAULT ''`); } catch(e) {}
  try { db.run(`ALTER TABLE content_items ADD COLUMN page_notes TEXT DEFAULT ''`); } catch(e) {}
  try { db.run(`ALTER TABLE content_items ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE trends ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE templates ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE activity_logs ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE canva_templates ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  try { db.run(`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL`); } catch(e) {}
  try { db.run(`ALTER TABLE notifications ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
  // Canva templates
  db.run(`CREATE TABLE IF NOT EXISTS canva_templates (
    id TEXT PRIMARY KEY, brand_id TEXT REFERENCES brands(id),
    name TEXT NOT NULL, description TEXT DEFAULT '', template_id TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`);
  // Migration: create default brand + assign existing data if needed
  const existingBrands = query('SELECT COUNT(*) as c FROM brands');
  if (existingBrands[0].c === 0) {
    const defaultBrandId = uuidv4();
    run('INSERT INTO brands (id, name, slug) VALUES (?,?,?)', [defaultBrandId, 'Curabeauty', 'curabeauty']);
    // Assign existing data to default brand
    run('UPDATE contents SET brand_id = ? WHERE brand_id IS NULL', [defaultBrandId]);
    run('UPDATE content_plans SET brand_id = ? WHERE brand_id IS NULL', [defaultBrandId]);
    run('UPDATE promos SET brand_id = ? WHERE brand_id IS NULL', [defaultBrandId]);
    run('UPDATE content_items SET brand_id = ? WHERE brand_id IS NULL', [defaultBrandId]);
    run('UPDATE trends SET brand_id = ? WHERE brand_id IS NULL', [defaultBrandId]);
    run('UPDATE templates SET brand_id = ? WHERE brand_id IS NULL', [defaultBrandId]);
    run('UPDATE activity_logs SET brand_id = ? WHERE brand_id IS NULL', [defaultBrandId]);
    // Grant admin access to default brand
    const adminUser = get('SELECT id FROM users WHERE username = ?', ['admin']);
    if (adminUser) {
      run('INSERT INTO brand_members (id, brand_id, user_id, role_in_brand) VALUES (?,?,?,?)', [uuidv4(), defaultBrandId, adminUser.id, 'admin']);
    }
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      brand_id TEXT REFERENCES brands(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS trends (
      id TEXT PRIMARY KEY,
      trend_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      volume TEXT DEFAULT '',
      category TEXT DEFAULT '',
      relevance TEXT DEFAULT 'potential',
      notes TEXT DEFAULT '',
      source_url TEXT DEFAULT '',
      discovered_at TEXT DEFAULT (datetime('now', 'localtime')),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      thumbnail TEXT DEFAULT '',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS content_plans (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'Draft',
      pic TEXT DEFAULT '',
      upload_date TEXT,
      pillar TEXT DEFAULT '',
      content_type TEXT DEFAULT '',
      title TEXT NOT NULL,
      copywriting TEXT DEFAULT '',
      concept TEXT DEFAULT '',
      design_ref TEXT DEFAULT '',
      publisher TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      design_result TEXT DEFAULT '',
      canva_link TEXT DEFAULT '',
      upload_link TEXT DEFAULT '',
      insight TEXT DEFAULT '',
      evaluation TEXT DEFAULT '',
      month_group TEXT DEFAULT '',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date_from TEXT,
      date_to TEXT,
      metrics TEXT DEFAULT '{}',
      exported INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  // Seed templates if empty
  const tmplCount = query('SELECT COUNT(*) as c FROM templates');
  if (tmplCount.length > 0 && tmplCount[0].c === 0) {
    const tmpls = [
      { name:'Beauty Glow', cat:'feed', config:'{"bg":"linear-gradient(135deg,#fce4ec,#f8bbd0)","textColor":"#6b3546","width":1080,"height":1080}' },
      { name:'Product Spotlight', cat:'feed', config:'{"bg":"linear-gradient(135deg,#fff3e0,#ffe0b2)","textColor":"#4e342e","width":1080,"height":1080}' },
      { name:'Minimal Chic', cat:'feed', config:'{"bg":"linear-gradient(135deg,#f3e5f5,#e1bee7)","textColor":"#4a148c","width":1080,"height":1080}' },
      { name:'Bold promo', cat:'feed', config:'{"bg":"linear-gradient(135deg,#d81b60,#f06292)","textColor":"#ffffff","width":1080,"height":1080}' },
      { name:'Reels Cover Rose', cat:'reels_thumbnail', config:'{"bg":"linear-gradient(135deg,#6b3546,#e8a0b4)","textColor":"#ffffff","width":1920,"height":1080}' },
      { name:'Reels Cover Dark', cat:'reels_thumbnail', config:'{"bg":"linear-gradient(135deg,#1a1114,#3e2b31)","textColor":"#fcb2c6","width":1920,"height":1080}' },
      { name:'Reels Cover Bright', cat:'reels_thumbnail', config:'{"bg":"linear-gradient(135deg,#fdf6f8,#fce4ec)","textColor":"#6b3546","width":1920,"height":1080}' },
      { name:'Price Tag Pink', cat:'pricetag', config:'{"bg":"linear-gradient(135deg,#fce4ec,#f8bbd0)","textColor":"#6b3546","width":800,"height":800}' },
      { name:'Price Tag Bold', cat:'pricetag', config:'{"bg":"linear-gradient(135deg,#d81b60,#c77a8e)","textColor":"#ffffff","width":800,"height":800}' },
      { name:'Price Tag Gold', cat:'pricetag', config:'{"bg":"linear-gradient(135deg,#fff8e1,#ffecb3)","textColor":"#4e342e","width":800,"height":800}' },
    ];
    for (const t of tmpls) {
      run('INSERT INTO templates (id, name, category, config) VALUES (?,?,?,?)', [uuidv4(), t.name, t.cat, t.config]);
    }
    saveDb();
  }
  saveDb();
}

function seedData() {
  const count = query('SELECT COUNT(*) as c FROM users');
  if (count.length > 0 && count[0].c > 0) return;

  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const users = [
    { id: uuidv4(), username: 'admin', password: hashedPassword, display_name: 'keke (Admin)', role: 'admin', avatar_color: '#e8a0b4' },
    { id: uuidv4(), username: 'creator', password: hashedPassword, display_name: 'keren (Creator)', role: 'creator', avatar_color: '#d47a94' },
  ];
  for (const u of users) {
    run('INSERT INTO users (id, username, password, display_name, role, avatar_color) VALUES (?,?,?,?,?,?)',
      [u.id, u.username, u.password, u.display_name, u.role, u.avatar_color]);
  }

  const defaultBrandId = uuidv4();
  run('INSERT INTO brands (id, name, slug) VALUES (?,?,?)', [defaultBrandId, 'Curabeauty', 'curabeauty']);
  for (const u of users) {
    run('INSERT INTO brand_members (id, brand_id, user_id, role_in_brand) VALUES (?,?,?,?)', [uuidv4(), defaultBrandId, u.id, u.role === 'admin' ? 'admin' : 'creator']);
  }

  const folderNames = ['Caption Templates', 'Hooks & Headlines', 'Reels Draft', 'Design Templates', 'Brand Guidelines'];
  for (const name of folderNames) {
    run('INSERT INTO content_folders (id, name, is_default) VALUES (?,?,1)', [uuidv4(), name]);
  }

  const adminUser = query('SELECT id FROM users WHERE username = ?', ['admin'])[0];
  const creatorUser = query('SELECT id FROM users WHERE username = ?', ['creator'])[0];
  if (adminUser) {
    const plans = [
      { status:'Published', pic:'Kerenh', date:'01/01/2026', pillar:'Entertainment', type:'Instagram Single Feed', title:'Happy New Year', concept:'Background gradasi biru navy ke royal blue seperti langit malam. Balon-balon biru metalik dan silver melayang', brand:'Curabeauty', publisher:'Kekew', copy:'', link:'https://www.instagram.com/p/DS7vGr1kxg3/', month:'Januari 2026' },
      { status:'Published', pic:'Keke', date:'03/01/2026', pillar:'Hard Selling', type:'Instagram Reels', title:'Review produk Skintific', concept:'JOIN THE TREND', brand:'Curabeauty', publisher:'Kekew', copy:'', link:'https://www.instagram.com/reel/DTt6hyCE71A/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'21/01/2026', pillar:'Soft Selling', type:'Instagram Reels', title:'Join The trend AT LEAST', concept:'Follow trend yang lagi viral', brand:'Curabeauty', publisher:'Kekew', copy:'', link:'https://www.instagram.com/reel/DTxLSaHE2H9/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'21/01/2026', pillar:'Interaksi', type:'Instagram Carousel Feed', title:'Hati-hati, slide untuk lihat', concept:'Konten ini mengemas ulasan jujur dari hasil belanja di Shopee', brand:'Curabeauty', publisher:'Kekew', copy:'', link:'https://www.instagram.com/p/DTxMwFeE9jz/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'22/01/2026', pillar:'Edukasi', type:'Instagram Carousel Feed', title:'STOP mulai sekarang jangan nimbun makeup lagi', concept:'Mengajak audiens untuk berhenti menjadi hoarder makeup', brand:'Curabeauty', publisher:'Kekew', copy:'', link:'https://www.instagram.com/p/DTzQU0TE2zu/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'22/01/2026', pillar:'Hard Selling', type:'Instagram Single Feed', title:'Miranda Corner', brand:'Curabeauty', publisher:'Kekew', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'23/01/2026', pillar:'Soft Selling', type:'Instagram Single Feed', title:'Glad2glow new Crush', concept:'New Arrival glad2glow available di seluruh curabeauty store', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DT2Jy15k2YP/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'24/01/2026', pillar:'Soft Selling', type:'Instagram Carousel Feed', title:'Muka cepat berminyak jangan sampe nyesel belakangan!', concept:'Menyentuh sisi emosional audiens melalui validasi atas keresahan wajah yang cepat berminyak', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DT4jz35E0Mk/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'26/01/2026', pillar:'Interaksi', type:'Instagram Carousel Feed', title:'Menu MBG kulit Glowing', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DT9i_JYk0K6/', month:'Januari 2026' },
      { status:'Published', pic:'Keke', date:'26/01/2026', pillar:'Interaksi', type:'Instagram Reels', title:'Jabatannya di Curabeauty Cukup Serem', concept:'JOIN THE TREND', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/reel/DT-UT_zE9Xz/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'27/01/2026', pillar:'Soft Selling', type:'Instagram Single Feed', title:'Rencananya beli satu tapi realitanya', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DT_-lSJE9Pn/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'27/01/2026', pillar:'Hard Selling', type:'Instagram Carousel Feed', title:'Belanja dapat Freebies', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUAmWquk1mI/', month:'Januari 2026' },
      { status:'Published', pic:'Keke', date:'27/01/2026', pillar:'Hard Selling', type:'Instagram Reels', title:'Freebies', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/reel/DUA7IeiEzKD/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'28/01/2026', pillar:'Interaksi', type:'Instagram Carousel Feed', title:'2026 baru 1 bulan..', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUDIuemE1xh/', month:'Januari 2026' },
      { status:'Published', pic:'Anak Toko', date:'29/01/2026', pillar:'Soft Selling', type:'Instagram Reels', title:'Customer lagi bingung cari promo', concept:'Curabeauty Paniki', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/reel/DUFeMHYE9TB/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'30/01/2026', pillar:'Soft Selling', type:'Instagram Single Feed', title:'Personal Color', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUHmsy1k1eC/', month:'Januari 2026' },
      { status:'Published', pic:'Keke', date:'30/01/2026', pillar:'Soft Selling', type:'Instagram Reels', title:'Personal Color Recap', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/reel/DUIczOok34t/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'31/01/2026', pillar:'Edukasi', type:'Instagram Carousel Feed', title:'Tricky but look at that glow', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUKWRXOkwJD/', month:'Januari 2026' },
      { status:'Published', pic:'Kerenh', date:'01/02/2026', pillar:'Hard Selling', type:'Instagram Single Feed', title:'Secret Bag 2.2', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUNOQAeE1QG/', month:'Februari 2026' },
      { status:'Published', pic:'Kerenh', date:'01/02/2026', pillar:'Hard Selling', type:'Instagram Reels', title:'2.2 Double Date Double Untung', concept:'Motion 2.2', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/reel/DUNX_VYk_fW/', month:'Februari 2026' },
      { status:'Published', pic:'Kerenh', date:'02/02/2026', pillar:'Hard Selling', type:'Instagram Single Feed', title:'Gebyar Tahun Baru Promo Skintific', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUNwb0AE8SH/', month:'Februari 2026' },
      { status:'Published', pic:'Keke', date:'02/02/2026', pillar:'Hard Selling', type:'Instagram Reels', title:'Skintific Powder Foundation 22k aja?', concept:'Vid Promosi 2.2 Secret Bag', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/reel/DUPYlAWE7cW/', month:'Februari 2026' },
      { status:'Published', pic:'Keke', date:'03/02/2026', pillar:'Hard Selling', type:'Instagram Single Feed', title:'Emina Promo', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUR3ZLlE7fb/', month:'Februari 2026' },
      { status:'Published', pic:'Keke', date:'04/02/2026', pillar:'Soft Selling', type:'Instagram Reels', title:'Bestie don\'t copy the match', concept:'Memberikan Rekomendasi Produk', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/reel/DUSxKERkylz/', month:'Februari 2026' },
      { status:'Published', pic:'Kerenh', date:'04/02/2026', pillar:'Hard Selling', type:'Instagram Single Feed', title:'Elise Diskon 15%', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUUS_6yE-DP/', month:'Februari 2026' },
      { status:'Published', pic:'Kerenh', date:'05/02/2026', pillar:'Hard Selling', type:'Instagram Single Feed', title:'The originote Promo', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUXtv85k7-A/', month:'Februari 2026' },
      { status:'Published', pic:'Kerenh', date:'06/02/2026', pillar:'Soft Selling', type:'Instagram Single Feed', title:'Valentine bingung mau kasih apa', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUaPLf9k0PX/', month:'Februari 2026' },
      { status:'Published', pic:'Keke', date:'06/02/2026', pillar:'Interaksi', type:'Instagram Reels', title:'POV: belanja di Curabeauty', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/reel/DUag46yEwEW/', month:'Februari 2026' },
      { status:'Published', pic:'Kerenh', date:'13/02/2026', pillar:'Hard Selling', type:'Instagram Single Feed', title:'Dear Curabestiee secret bag apresiasi', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DUh1kc2E8lr/', month:'Februari 2026' },
      { status:'Published', pic:'Kerenh', date:'01/03/2026', pillar:'Soft Selling', type:'Instagram Single Feed', title:'Review Google', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DVVNp_jE5O8/', month:'Maret 2026' },
      { status:'Published', pic:'Kerenh', date:'02/03/2026', pillar:'Hard Selling', type:'Instagram Single Feed', title:'Promo Xi XIu', brand:'Curabeauty', publisher:'Kekew', link:'https://www.instagram.com/p/DVYNovYkw3n/', month:'Maret 2026' },
    ];
    for (const p of plans) {
      run(`INSERT INTO content_plans (id, brand_id, status, pic, upload_date, pillar, content_type, title, copywriting, concept, publisher, brand, upload_link, month_group, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), defaultBrandId, p.status, p.pic, p.date, p.pillar, p.type, p.title, p.copy || '', p.concept || '', p.publisher, p.brand, p.link || '', p.month, adminUser.id]);
    }
  }

  saveDb();
}

module.exports = { getDb, query, run, get };
