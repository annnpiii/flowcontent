# Multi Brand Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Brand Switcher sidebar + brand-scoped data isolation + brand management

**Architecture:** brands table + brand_members table. All content tables get `brand_id` column. Express middleware auto-filters by `req.session.brand_id`. Frontend brand switcher dropdown sets active brand via API. All existing pages filter automatically.

**Tech Stack:** Express, SQLite (sql.js), vanilla JS SPA, Tailwind CSS

## Global Constraints

- All visible UI text must use Indonesian Gen Z casual tone
- Brand switcher placed in sidebar above nav items (replaces logo area layout slightly)
- API auto-filters via middleware — no per-endpoint brand_id changes needed
- All Brands mode = skip brand_id filter in queries
- Brand management page accessible by admin only

---

### Task 1: Database Schema — brands + brand_members + alter tables

**Files:**
- Modify: `database.js`

**Interfaces:**
- Produces: `brands`, `brand_members` tables; `brand_id` column on `contents`, `content_plans`, `promos`, `content_items`, `trends`, `templates`, `activity_logs`

- [x] **Step 1: Add brands table**

```js
db.run(`CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
)`);
```

- [x] **Step 2: Add brand_members table**

```js
db.run(`CREATE TABLE IF NOT EXISTS brand_members (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_brand TEXT DEFAULT 'creator' CHECK(role_in_brand IN ('admin','editor','creator')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(brand_id, user_id)
)`);
```

- [x] **Step 3: Add brand_id to content tables (with try/catch for idempotency)**

Add to initSchema after table creation:
```js
try { db.run(`ALTER TABLE contents ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
try { db.run(`ALTER TABLE content_plans ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
try { db.run(`ALTER TABLE promos ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
try { db.run(`ALTER TABLE content_items ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
try { db.run(`ALTER TABLE trends ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
try { db.run(`ALTER TABLE templates ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
try { db.run(`ALTER TABLE activity_logs ADD COLUMN brand_id TEXT REFERENCES brands(id)`); } catch(e) {}
```

- [x] **Step 4: Seed default brand + assign all existing data to it**

In seedData, after users:
```js
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
  const admin = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (admin) run('INSERT INTO brand_members (id, brand_id, user_id, role_in_brand) VALUES (?,?,?,?)', [uuidv4(), defaultBrandId, admin.id, 'admin']);
}
```

### Task 2: Backend — Brand API endpoints

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `brands`, `brand_members` tables from Task 1
- Produces: `/api/brands`, `/api/brands/:id/members`, `/api/brand/switch` endpoints

- [ ] **Step 1: Add brand middleware — `requireBrand()` + session brand_id**

```js
function requireBrand() {
  return (req, res, next) => {
    if (!req.session) return res.status(401).json({ error: 'Unauthorized' });
    next();
  };
}
```

Plus modify checkAuth/me endpoint to return user's accessible brands.

- [ ] **Step 2: Add brand CRUD endpoints**

- `POST /api/brands` — create brand (admin only)
- `PUT /api/brands/:id` — update brand (admin only)
- `DELETE /api/brands/:id` — delete brand (admin only)
- `GET /api/brands` — list brands user has access to

- [ ] **Step 3: Add brand members endpoints**

- `GET /api/brands/:id/members` — list members
- `POST /api/brands/:id/members` — add member
- `DELETE /api/brands/:id/members/:userId` — remove member

- [ ] **Step 4: Add brand switch endpoint**

- `POST /api/brand/switch` — body: `{ brand_id }` → set req.session.brand_id

- [ ] **Step 5: Update all existing endpoints to filter by brand_id**

Modify GET/POST/PUT query builders to append `WHERE brand_id = ?` based on session.
For "All Brands" (brand_id is null or empty), skip filter.
This affects: /api/contents, /api/content-plans, /api/promos, /api/items, /api/trends, /api/templates, /api/activities, /api/dashboard

### Task 3: Frontend — Brand Switcher UI + Brand Management Page

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: brand API from Task 2

- [ ] **Step 1: Update index.html — add brand nav item, update sidebar layout**

- Add "Brand" nav item in admin section
- Modify logo area to become brand switcher button
- Add brand management page placeholder

- [ ] **Step 2: Add brand API wrapper functions in app.js**

- `loadBrands()` — fetch brands, populate switcher
- `switchBrand(id)` — call API, reload
- `renderBrands()` — brand management page

- [ ] **Step 3: Update showApp() to load brands and set initial brand**

- After login, load user brands
- Set first brand as active or keep current

- [ ] **Step 4: Add branding page — admin CRUD table (modal-based)**

- List brands with edit/delete
- Create brand via modal
- Manage members per brand

- [ ] **Step 5: Update all page renderers to show brand context**

- All brands mode: add brand label/badge to items in calendar, content plan, etc.
- Dashboard: aggregate stats header when in All Brands mode

- [ ] **Step 6: Add brand switcher dropdown styles**

Add to style.css:
- `.brand-switcher` — sidebar switcher button
- `.brand-dropdown` — dropdown menu
- Transition/active states

### Task 4: Polish & Verify

- [ ] **Step 1: Restart server, test login**
- [ ] **Step 2: Test brand switching**
- [ ] **Step 3: Test All Brands mode**
- [ ] **Step 4: Test brand member management**
- [ ] **Step 5: Verify data isolation between brands**
