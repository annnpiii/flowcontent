# Status & Workflow Overhaul Design

## Background

Simplifikasi status label dan workflow approval flow untuk Flowcontent. Status sebelumnya punya 8+ variasi (draft, pending_review, pending_approval, revision_requested, scheduled, posted, failed, done) yang membingungkan dan inkonsisten antar halaman.

## Tujuan

- 5 status label seragam di seluruh halaman: **Draf, Review, Approval, Revisi, Terposting**
- Workflow creator → admin → posting yang jelas
- Laporan, Dashboard, Kalender, Approval page sync dengan data yang sama
- Hapus fitur delete dari Laporan

## Status Mapping

| Label | DB Status | Siapa Ubah | Warna (CSS) |
|-------|-----------|------------|-------------|
| Draf | `draft` | Creator | `bg-[#b0a6a0]/30 text-text-secondary` |
| Review | `pending_review` | Creator→Admin | `bg-warning-bg text-warning` |
| Approval | `approved` | Admin | `bg-accent-subtle text-accent` |
| Revisi | `revision_requested` | Admin→Creator | `bg-error/10 text-error` |
| Terposting | `posted` atau punya `content_url` | Admin only | `bg-success-bg text-success` |

Backward compatibility: `pending_approval` → Approval, `scheduled`/`done` → Terposting.

## Workflow Flow

```
Creator            Admin
  │                  │
  Draf ──minta review──▶ Review ────▶ Approve ──isi link──▶ Terposting
  ▲                       │             │
  └──── revisi ───────────┘             │
       (creator perbaiki)               │
       (kirim ulang review)             │
                                    Approval
```

## Perubahan per File

### `public/js/app.js`

**1. Fungsi global baru (line ~489)**
```js
function getContentDisplayStatus(c) {
  if (c.content_url && c.content_url.trim()) return 'terposting'
  const map = {
    draft: 'draf',
    pending_review: 'review',
    pending_approval: 'approval',
    approved: 'approval',
    revision_requested: 'revisi',
    scheduled: 'terposting',
    posted: 'terposting',
    done: 'terposting'
  }
  return map[c.status] || 'draf'
}
```

**2. `statusBadge()` refactor**
- Panggil `getContentDisplayStatus()` dulu
- Hapus parameter `forcePosted` (sekarang pake logic content_url internally)
- Labels: draf→'Draf', review→'Review', approval→'Approval', revisi→'Revisi', terposting→'Terposting'
- CSS class: badge-draf, badge-review, badge-approval, badge-revisi, badge-terposting
- Tambah CSS baru: `.badge-approval`, `.badge-revisi`, `.badge-terposting`

**3. `statusLabel()` refactor (line 2672)**
- Map sesuai 5 label baru: draf→'Draf', review→'Review', approval→'Approval', revisi→'Revisi', terposting→'Terposting'

**4. Calendar `statusColors` (line 1430 & 1516)**
- Map: draf→color draft, review→color warning, approval→color accent, revisi→color error, terposting→color success

**5. Dashboard `renderDashboard()` (line 636)**
- Fix stat cards:
  - Draf: `dash.drafts`
  - Review: dari `/api/dashboard` (tambah field baru `pendingReview`)
  - Approval: dari `/api/dashboard` (tambah field baru `approved`)
  - Terposting: dari `/api/dashboard` (tambah field baru `posted`)
- "Selesai" card: ganti jadi "Terposting" atau dihapus

**6. Dashboard konten terbaru table**
- `statusBadge(c.status, c.content_url)` → `statusBadge(c)` (hapus forcePosted param)

**7. Approval page `renderApproval()` (line 1741)**
- Admin stat cards jadi 5:
  - Draf (count draft)
  - Review (count pending_review)
  - Approval (count approved)
  - Revisi (count revision_requested)
  - Terposting (count posted + content_url != '')
- Kanban kolom: hanya Review (pending_review) — admin approve atau minta revisi
- Creator table: tetap 5 kolom label, bisa filter

**8. Laporan `renderReport()` (line 2589)**
- Filter: Semua, Draf, Review, Approval, Revisi, Terposting
- Stat cards: Total, Terposting, Review, Approval, Draf
- Hapus checkbox column (th & td checkbox)
- Hapus bulk bar (#reportBulkBar)
- Hapus tombol delete per baris

**9. Laporan: filter function (line 2667)**
- `filterReportStatus()` filter pake display status key (draf, review, approval, revisi, terposting)
- Logic filter: cocokin `getContentDisplayStatus(c)` dengan nilai filter

**10. Admin approval → modal isi link IG**
- Ganti `approveContent('${c.id}','schedule')` jadi `approveContent('${c.id}')`
- Modal akan muncul dengan field input link IG + tombol "Approve & Tandai Selesai"
- Simpan status `approved` di DB

**11. Modal setelah approve**
- Admin bisa masukkan link postingan IG
- Pilihan: "Approve (isi link nanti)" atau "Approve & Posting"

### `server.js`

**1. `/api/dashboard` (line 419)**
- Tambah field: `pendingReview`, `approved`, `posted`
```sql
pendingReview = get('SELECT COUNT(*) as c FROM contents WHERE status=?', ['pending_review', ...bf.params])
approved = get('SELECT COUNT(*) as c FROM contents WHERE status=?', ['approved', ...bf.params])
posted = get('SELECT COUNT(*) as c FROM contents WHERE status=? OR status=? OR status=?', ['posted', 'scheduled', 'done', ...bf.params])
```

**2. `/api/contents/:id/status` (line 229)**
- Approve → status `approved` (bukan `pending_approval`)
- Hapus `pending_approval` dari workflow
- Notifikasi: approve → notifikasi ke creator

**3. `/api/contents/:id` PUT (line ~210)**
- Tambah: admin bisa update `content_url` + status jadi `posted`
- Endpoint atau modify existing

### `public/css/style.css`
- Tambah class badge: `.badge-approval`, `.badge-revisi`, `.badge-terposting`
- Warna sesuai palet: approval→accent, revisi→error, terposting→success

## Data Sync
- Dashboard, Kalender, Laporan → semua baca dari `contents` table → **sync**
- Rencana Konten → baca dari `content_plans` table → **data terpisah**
- Satu-satunya inkonsistensi dulu: display logic (forcePosted) — resolved dengan `getContentDisplayStatus()`

## Non-Changes
- Rencana Konten (`content_plans`) tetap pake status sendiri (Draft, Published) — tidak disentuh
- Notification logic tetap
- Activity logs tetap
