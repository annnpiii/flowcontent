# Multi Brand Workspace — ContentFlow

## Overview
Tambahkan Brand Switcher di sidebar sehingga satu akun dapat mengelola banyak brand dalam satu platform. Setiap brand memiliki data sendiri (content plans, contents, promos, items, trends, templates) yang terisolasi secara logis via `brand_id`. Tersedia opsi "All Brands" untuk melihat gabungan seluruh brand.

## Data Model

### Tabel Baru

```sql
brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
)

brand_members (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_brand TEXT DEFAULT 'creator' CHECK(role_in_brand IN ('admin','editor','creator')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(brand_id, user_id)
)
```

### Tabel Existing + Kolom `brand_id`

| Tabel | Aksi |
|-------|------|
| `contents` | + `brand_id TEXT REFERENCES brands(id)` |
| `content_plans` | + `brand_id TEXT REFERENCES brands(id)` (ganti kolom `brand` TEXT lama) |
| `promos` | + `brand_id TEXT REFERENCES brands(id)` (ganti kolom `brand` TEXT lama) |
| `content_items` (hub) | + `brand_id TEXT REFERENCES brands(id)` |
| `trends` | + `brand_id TEXT REFERENCES brands(id)` |
| `templates` | + `brand_id TEXT REFERENCES brands(id)` |
| `activity_logs` | + `brand_id TEXT REFERENCES brands(id)` |

## Brand Switcher UI (Sidebar)

Dropdown di sidebar atas — menggantikan area logo saat ini:

```
┌──────────────────────┐
│  [▼] Curabeauty      │  ← tombol brand switcher
│  ┌──────────────────┐│
│  │ ○ Curabeauty     ││  ← dropdown
│  │ ○ Skintific      ││
│  │ ○ The Originote  ││
│  │ ──────────────── ││
│  │ ○ All Brands     ││
│  └──────────────────┘│
├──────────────────────┤
│  Dashboard           │
│  Rencana Konten      │
│  ...                 │
```

**Behavior:**
- Tombol menampilkan nama brand aktif + icon chevron/arrow
- Klik → dropdown muncul. Pilih brand → API `/api/brand/switch/:id` → reload halaman
- Pilihan "All Brands" → set `brand_id = null` di session
- Sidebar nav items tetap sama — konten di dalamnya menyesuaikan

## Access Control

- **Admin:** bisa melihat & mengelola semua brand. Bisa grant/revoke akses creator ke brand tertentu.
- **Creator:** hanya melihat brand yang diassign oleh admin (via `brand_members`).
  - Jika tidak punya akses brand manapun → landing page: "Kamu belum punya akses ke brand manapun."
- **Brand Switcher** hanya menampilkan brand yang user punya akses.
- Halaman **Kelola Brand** (admin only) di sidebar untuk manage brand + anggotanya.

## Session

```js
req.session.brand_id = 'uuid-bra-123' | null  // null = All Brands
req.session.brand_name = 'Curabeauty' | 'All Brands'
```

## API Endpoints

### Brand Management (admin only)
- `POST /api/brands` — create brand
- `PUT /api/brands/:id` — update brand
- `DELETE /api/brands/:id` — delete brand (cascade)
- `GET /api/brands` — list brands yang bisa diakses user

### Brand Members (admin only)
- `GET /api/brands/:id/members` — list member + role
- `POST /api/brands/:id/members` — grant akses (body: `{ user_id, role_in_brand }`)
- `DELETE /api/brands/:id/members/:userId` — revoke akses

### Brand Switching
- `POST /api/brand/switch` — body: `{ brand_id }` (null = All Brands)

### Existing Endpoints (auto-filtered by brand_id in session)

Semua endpoint GET/POST/PUT yang sudah ada otomatis difilter dengan `WHERE brand_id = ?` dari session. Middleware `requireBrand()` menambahkan filter ke query.

Untuk All Brands (`brand_id = null`), filter di-skip.

## Per-Page Behavior

| Halaman | Brand Scope | All Brands Behavior |
|---------|------------|-------------------|
| Dashboard | Stat + konten brand aktif | Aggregate semua brand |
| Rencana Konten | Plans brand aktif | Semua plans + kolom Brand |
| Kalender Konten | Contents brand aktif | Semua contents + label brand |
| Approval | Pending items brand aktif | Semua pending items |
| Pusat Konten | Items brand aktif | Semua items |
| Promo | Promo brand aktif | Semua promo |
| Pantau Tren | Trends brand aktif | Semua trends |
| Buat Desain | Templates brand aktif | Semua templates |
| Laporan | Data brand aktif | Union semua brand |
| Kelola Tim | Global (selalu) | Sama — manajemen user |

## Halaman Baru: Kelola Brand

Hanya admin. Letak: di bawah Admin section di sidebar.
- Tabel daftar brand dengan tombol edit/delete
- Form create brand (name, slug)
- Klik brand → lihat daftar anggota + role
- Admin bisa add/remove user dari brand

## Mitigasi Data Existing

Data yang sudah ada sebelum migrasi akan di-assign ke brand default pertama yang dibuat.
