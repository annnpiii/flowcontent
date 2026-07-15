# TestSprite AI Testing Report (MCP) — ContentFlow

---

## 1️⃣ Document Metadata
- **Project Name:** contentflow
- **Date:** 2026-07-15
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

### Requirement: Authentication

| Test | Status | Analysis |
|------|--------|----------|
| **TC001** — Login dengan kredensial valid | ✅ Passed | Login admin/admin123 return 200 dengan user, brands, activeBrandId sesuai skema |
| **TC002** — Login dengan password salah | ✅ Passed | Return 401 dengan pesan error, tidak ada info sensitif bocor |
| **TC003** — Get current user session | ✅ Passed | GET /api/me return profile + brands setelah login |
| **TC004** — Logout user | ✅ Passed | Session terdestroy, /api/me setelah logout return 401 |

### Requirement: Dashboard

| Test | Status | Analysis |
|------|--------|----------|
| **TC005** — Dashboard KPIs | ✅ Passed | Return drafts, pendingReview, approved, revisionRequested, scheduled, posted — semua integer ≥ 0 |

### Requirement: Team

| Test | Status | Analysis |
|------|--------|----------|
| **TC030** — Get team members | ✅ Passed | GET /api/team return array users dengan id, display_name, role, avatar_color |

### Requirement: Bulk Operations

| Test | Status | Analysis |
|------|--------|----------|
| **TC033** — Bulk delete contents | ✅ Passed | DELETE /api/contents/bulk dengan ids array return 200 |
| **TC034** — Bulk update content status | ✅ Passed | PATCH /api/contents/bulk/status return 200 |
| **TC035** — Delete content plan | ✅ Passed | DELETE /api/content-plans/:id return 200 |

### Requirement: Content Calendar, Brands, Users, Content Plans, Promos, Hub, Notifications, Trends, Search, Canva Templates

| Test | Status | Analysis |
|------|--------|----------|
| **TC006-TC029, TC031-TC032** | ❌ Failed | **Semua gagal karena rate limit login (429)** — lihat catatan di bawah |

---

## 3️⃣ Coverage & Matching Metrics

- **25.71%** of tests passed (9/35)

| Requirement | Total Tests | ✅ Passed | ❌ Failed |
|---|---|---|---|
| Authentication | 4 | 4 | 0 |
| Dashboard | 1 | 1 | 0 |
| Team | 1 | 1 | 0 |
| Bulk Operations | 3 | 3 | 0 |
| Content Calendar (CRUD) | 4 | 0 | 4 |
| Brands (list, create, switch, members) | 5 | 0 | 5 |
| Users (create, list, delete) | 3 | 0 | 3 |
| Content Plans (create, list, update) | 3 | 0 | 3 |
| Promos (create, list) | 2 | 0 | 2 |
| Content Hub (folders, items) | 2 | 0 | 2 |
| Notifications | 1 | 0 | 1 |
| Trends (list, create) | 2 | 0 | 2 |
| Search & Activity | 3 | 0 | 3 |
| Canva Templates | 1 | 0 | 1 |

---

## 4️⃣ Key Gaps / Risks

### 🔴 Critical Issues

#### 1. Rate Limiter Terlalu Agresif (Penyebab Utama 26 TC Gagal)
**File:** `server.js:44-51`

```js
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 menit
  max: 5,                // hanya 5 percobaan
  message: { error: 'Terlalu banyak percobaan login. Coba lagi 1 menit.' },
  keyGenerator: (req) => req.ip + '|' + (req.headers['user-agent'] || 'unknown'),
});
```

**Masalah:** Limit 5 login per menit terlalu ketat, apalagi untuk automated testing. Setelah TC001-TC005 (masing-masing login), rate limit habis dan 26 test berikutnya langsung gagal. Setiap test case login sendiri tanpa berbagi session.

**Fix:** 
- Naikkan `max` jadi 20-30 untuk development/testing
- Gunakan `defaultKeyGenerator` dari express-rate-limit (saat ini custom keyGenerator menyebabkan warning IPv6)
- Atau nonaktifkan rate limiter di mode development

---

### 🟡 Moderate Issues (harus diperbaiki)

#### 2. express-rate-limit keyGenerator Warning
**File:** `server.js:44`

Server error saat startup:
```
ValidationError: Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper function for IPv6 addresses.
```

**Fix:** Ganti keyGenerator menjadi:
```js
const { defaultKeyGenerator } = require('express-rate-limit');
// ...
keyGenerator: (req) => defaultKeyGenerator(req) + '|' + (req.headers['user-agent'] || 'unknown'),
```
Atau sederhanakan:
```js
keyGenerator: (req) => req.ip,
```

#### 3. Session Secret Hardcoded
**File:** `server.js:54`

```js
secret: process.env.SESSION_SECRET || 'contentflow-secret-key-2025',
```

**Risiko:** Fallback secret hardcoded — jika environment variable tidak diset, secret bisa ditebak.

#### 4. CORS Tidak Dikonfigurasi
**File:** `server.js`

Tidak ada middleware CORS. Aplikasi hanya bisa diakses dari origin yang sama. Jika frontend terpisah domainnya, request akan diblokir.

#### 5. Tidak Ada Validasi Input di Sebagian Besar Endpoint
**File:** `server.js`

Contoh: POST /api/contents, POST /api/content-plans, dll — tidak ada validasi tipe data, panjang string, atau field required. Field dikirim kosong tetap diterima.

#### 6. SQLite Concurrency
**File:** `database.js`

Database file-based (SQLite via sql.js) tidak handle concurrent writes dengan baik. Di production dengan multi-user, berpotensi data corruption.

#### 7. DeepSeek API Key Tidak Terkonfigurasi
**File:** `server.js:527-529`

```
WARNING: DEEPSEEK_KEY not set in environment. Trend generator & AI analysis will fail.
```

Fitur trend generator dan AI report analysis tidak akan berfungsi.

#### 8. Error Handling Tidak Konsisten
Beberapa endpoint punya try-catch yang return `error: e.message`, beberapa tidak. Response format error tidak seragam.

---

### 🟢 Minor Issues

#### 9. Brand Filter Cache / Session
Switch brand (POST /api/brand/switch) mengubah `req.session.brand_id` tapi client perlu me-refresh data — tidak ada notifikasi real-time.

#### 10. Test Coverage Tidak Optimal
Hanya 9/35 test yang benar-benar sampai ke endpoint target karena rate limiter blocking. Test case perlu menggunakan 1 session yang direuse untuk semua test dalam 1 batch.
