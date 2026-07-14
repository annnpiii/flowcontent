# ContentFlow — Website Description Prompt

ContentFlow adalah platform manajemen konten visual untuk tim marketing/social media dengan **tema pink elegan** sebagai ciri khas utama. Berikut detail seluruh halaman dan sistem:

---

## Brand Identity (Warna Pink Signature)

- **Primary palette:** pink lembut hingga dusty rose — `#fdf6f8` (Pink-50), `#fce4ec` (Pink-100), `#f0d4de` (Pink-200), `#e8a0b4` (Pink-300/aksen utama), `#d47a94` (Pink-400/hover), `#c48ba0` (Pink-500), `#9e6b7e` (Pink-600), `#7a4f5f` (Pink-700), `#4a2e38` (Pink-800), `#2d1b21` (Pink-900/sidebar gelap)
- **Text color:** `#3d2a30` (pink-text) — cokelat muda pinkish, bukan hitam pekat
- **Fonts:** Outfit (UI/sans-serif) + DM Serif Display (heading/serif)
- **Border style:** Semua card, table, modal, dropdown menggunakan `1px solid var(--pink-200)`
- **Hover effect:** Hover memunculkan `var(--pink-300)` pada border dan `var(--pink-100)` pada background
- **Shadow:** `0 8px 24px rgba(45, 27, 33, 0.08)` — warna shadow ikut tone pink (rgba dengan base #2d1b21)
- **Animasi:** `fadeIn` (0.3s, translateY 8px) untuk page content, `slideUp` (0.3s, cubic-bezier) untuk modal
- **Background halaman:** `var(--pink-50)` — putih pinkish lembut
- **Tombol utama (btn-primary):** `var(--pink-300)` background, white text, hover ke `var(--pink-400)` + translateY(-1px)
- **Sidebar:** `var(--pink-900)` background solid gelap, nav item berwarna `var(--pink-500)` hover ke putih dengan left border `var(--pink-300)` saat active
- **Status badge colors:** Draft (gray), Pending (krem), Scheduled (hijau mint), Posted (pink-100), Done (hijau daun), Failed (merah muda)

---

## 1. Login Page

- Card putih bersih dengan border pink-200, shadow-lg
- Input form: username & password
- Tombol login: pink-300 solid
- Login info tips di bawah (cream background pink-50)
- Background: pink-50 full screen
- Header: "ContentFlow" (DM Serif Display) + subtitle "Content Management Platform"

## 2. Sidebar Navigation

Sidebar kiri pink-900 gelap dengan menu:
Dashboard | Content Calendar | Approval (admin only) | Content Hub | Trend Tracker | Asset Generator | Report & Analytics (admin only) | Promo Manager (admin only) | Team Management (admin only)

Footer sidebar: avatar bulat + nama user + role + tombol Keluar

## 3. Dashboard Page

- **Stats cards** (grid 4 kolom): Pending Approval, Scheduled, Drafts — angka besar font DM Serif Display warna pink-300
- **Recent Content table:** Tanggal, Judul, Platform (badge IG/TT/IG+TT), Status (badge warna), Creator — klik baris buka detail modal
- **Quick actions:** tombol New Content

## 4. Content Calendar Page

- **Toolbar:** nav bulan (prev/next/today), view toggle (Month/Week/List), filter status + platform, tombol New Content
- **Month view:** Grid 7 kolom, day cells dengan content cards per tanggal. Today di-highlight pink-100
- **Week view:** Sama, 7 hari dalam seminggu
- **List view:** Table dengan kolom Tanggal, Judul, Link (&#128279;), Platform, Creator, Status, Aksi (Detail)
- **Content card:** Border-left 3px warna sesuai status, title + platform icon + status badge
- **Status filter:** Semua Status, Draft, Pending Review, Pending Approval, Scheduled, Posted, Done

## 5. Approval Page (Admin Only)

- Queue list: tiap item menampilkan judul konten, creator, tanggal pengajuan
- Tombol: Approve (scheduled), Schedule (buka modal scheduling), Reject (buka modal feedback)
- Quick approve checkbox + "Approve Selected" button

## 6. Content Hub Page

- **Layout:** 2 kolom — kiri folder list, kanan items grid
- **Folder list:** Default folders (Caption Templates, Hooks & Headlines, Reels Draft, Design Templates, Brand Guidelines). Masing-masing punya item count badge
- **Items grid:** Cards dengan icon type + title + meta info
- **Search bar** + filter category/file_type
- **Upload button:** upload file ke folder

## 7. Promo Manager Page (Admin Only)

- **Promo cards:** grid promo — nama promo (DM Serif Display), base price (angka besar pink-300), tipe promo (Per Cabang / All Items)
- **Per Cabang:** daftar alokasi branch + prosentase + allocation bar horizontal
- **All Items:** diskon per brand, allocation bar 100%
- **Create/Edit modal:** form nama, base price, tipe subsidi (% / fixed), nilai subsidi, alokasi per branch atau brand, status active/inactive

## 8. Trend Tracker Page

- **Trend cards:** grid — trend name, platform badge, volume, category, relevance (potential/used/trending)
- **Filters:** platform, relevance, category
- **Actions per card:** Mark as Used, Create Draft (batch-draft from trend)
- **Create trend modal:** form trend_name, platform, volume, category, relevance, notes, source_url

## 9. Asset Generator Page

- **Template cards:** grid — preview box (aspect-ratio 1:1, gray placeholder), template name
- **Kategori:** caption, design, video, story
- **Generate button:** buka modal untuk generate konten dari template
- **Filter:** kategori template

## 10. Report & Analytics Page (Admin Only)

- **Date range filter:** Dari/Ke input date + Refresh button
- **Stats cards:** Total Posts, Posted/Scheduled, Draft, Pending Approval
- **Content detail table:** Tanggal, Judul, Platform, Status, Creator
- **Export button:** Export to CSV

## 11. Team Management Page (Admin Only)

- **User table:** Username, Display Name, Role, Avatar Color, Created At
- **Tambah User modal:** form username, password, display_name, role (admin/creator)
- **Delete user:** confirmation modal — hapus user dari sistem

## 12. Content Create/Edit Modal

- Form: Judul, Caption, Platform (IG/TT/Both), Promo Terkait, Tanggal Posting, Waktu Posting, Link/URL, Due Date Approval, Tags
- Tombol: Batal, Save as Draft, Submit for Approval
- Saat edit: pre-filled dari data existing

## 13. Content Detail Modal

- **Tabs:** Content, Activity Log, Schedule
- **Content tab:** Caption, Platform, Status badge, Posting Date/Time, Creator/Editor, Link (&#128279; Buka Link), Feedback
- **Activity tab:** Timeline log — user avatar dot, action text, timestamp
- **Schedule tab:** Tanggal Posting, Waktu Posting, Timezone (WIB)
- **Footer actions:** Edit (creator), Submit for Approval, &#10003; Tandai Selesai (creator), Approve (admin), Schedule (admin)

## 14. Notifikasi System

- **Bell icon** di topbar dengan badge merah jumlah unread
- **Dropdown notifikasi:** daftar notifikasi — icon &#10003; (approved) atau &#9200; (deadline)
- **Unread items:** background pink-50 + left border pink-300
- **Klik item:** mark as read
- **Tombol "Tandai Dibaca":** mark all read
- **Trigger notifikasi:**
  - Approval: saat admin approve konten → "Konten 'X' sudah di approve. Silahkan dikerjakan!"
  - Deadline H-1: otomatis saat fetch → "Deadline H-1: Konten 'X' akan tayang besok!"

---

## Database Schema

| Table | Key Columns |
|-------|------------|
| **users** | id, username, password (bcrypt), display_name, role (admin/creator), avatar_color |
| **contents** | id, title, caption, media (JSON), platform, posting_date/time, due_date, status (draft/pending_review/pending_approval/revision_requested/scheduled/posted/failed/done), creator_id, editor_id, approver_id, tags (JSON), promo_id, feedback, content_url, version |
| **promos** | id, name, base_price, subsidy_type, subsidy_value, allocation (JSON), promo_type (branch/all_item), brand, status, created_by |
| **trends** | id, trend_name, platform, volume, category, relevance, notes, source_url |
| **templates** | id, name, category, config (JSON), thumbnail, created_by |
| **content_folders** | id, name, parent_id, is_default |
| **content_items** | id, folder_id, title, description, file_path, file_type, tags, visibility, category, version, created_by |
| **content_versions** | id, content_id, caption, media, version, edited_by, notes |
| **activity_logs** | id, content_id, user_id, action, details |
| **reports** | id, name, date_from, date_to, metrics (JSON), exported, created_by |
| **notifications** | id, user_id, content_id, type (approved/deadline_h1), message, is_read |

---

## User Flow

1. **Creator:** Login → Buat konten (draft) → Submit for Approval (pending_approval) → Dapat notifikasi saat di-approve → Tandai Selesai (done)
2. **Admin:** Login → Cek Approval Queue → Approve (scheduled) atau Reject + feedback → Lihat Report
3. **Notifikasi:** Bell icon → dropdown → klik baca, otomatis deadline H-1

---

## Roles & Access

- **Admin:** Full access — Dashboard, Calendar, Approval, Hub, Trends, Asset Gen, Report, Promo Manager, Team Management
- **Creator:** Dashboard (data sendiri), Calendar (konten sendiri), Hub, Trends, Asset Gen — tidak bisa akses Approval, Promo, Team Management, Report
