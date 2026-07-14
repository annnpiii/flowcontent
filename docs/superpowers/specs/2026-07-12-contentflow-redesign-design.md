# ContentFlow Redesign — Pink Beauty + Delete User

## Overview
Redesign ContentFlow webapp dengan tema pink beauty, menambahkan fitur hapus user oleh admin, dan meningkatkan UX dengan animasi JavaScript, smooth scroll, dan transisi halus.

## Changes

### 1. Backend — Delete User
- Tambah endpoint `DELETE /api/users/:id` (admin only)
- Endpoint: `app.delete('/api/users/:id', requireAuth(['admin']), handler)`

### 2. CSS — Pink Beauty Theme
- **Palette:**
  - `--pink-50: #fdf6f8` — background body
  - `--pink-100: #fce4ec` — card highlight, light accent
  - `--pink-300: #e8a0b4` — primary button
  - `--pink-400: #d47a94` — primary hover
  - `--pink-500: #c48ba0` — secondary / borders
  - `--pink-900: #2d1b21` — sidebar background
  - `--pink-text: #3d2a30` — body text
- **Font:** Outfit (UI), DM Serif Display (headline)
- **Login:** Background bersih, card minimalis
- **Sidebar:** Rosewood bg, active indicator bar (garis vertikal) bukan background penuh
- **Card:** Border 1px solid pink lembut + subtle shadow, bukan shadow standar
- **Badge/Status:** Warna pink di seluruh status badge
- **Animasi:** Page fade-in, hover underline slide, modal backdrop blur + slide-up, content card hover (border glows), smooth scroll JavaScript

### 3. Frontend — Delete User
- Tombol hapus di tabel Team Management
- Konfirmasi modal sebelum hapus
- Toast notifikasi sukses/gagal

### 4. Animasi JavaScript
- Page transition fade saat navigasi
- Smooth scroll ke top saat pindah halaman
- Card staggered reveal subtle
