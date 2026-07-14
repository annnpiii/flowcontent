# ContentFlow — All-in-One Content Management Platform

ContentFlow adalah platform web all-in-one untuk content marketing, social media management, dan asset creation dalam satu dashboard. Dibangun untuk tim marketing yang ingin workflow lebih rapi tanpa harus switch antar tools.

## Fitur

### 1. Dashboard
Overview KPI: jumlah konten pending review, pending approval, scheduled, dan draft. Dilengkapi activity feed terbaru.

### 2. Content Calendar
- View: **Month**, **Week**, dan **List**
- Drag-and-drop konten antar hari
- Filter by platform (IG/TikTok) dan status
- Create, edit, detail konten (modal dengan caption, media, activity log, schedule info)
- Content card dengan status badge warna dan platform icon

### 3. Approval Workflow
- Creator **submit draft** → Editor **review** → **forward ke approver** → Approver **schedule**
- Action: Request Revision (dengan feedback), Approve & Forward, Bulk Approve
- Role-based access:
  - **Creator**: create & submit draft
  - **Editor**: review, edit, request revision
  - **Approver**: approve, schedule, bulk action
  - **Admin**: all permissions + team management

### 4. Content Hub
- Folder: Caption Templates, Hooks & Headlines, Reels Draft, Design Templates, Brand Guidelines
- Upload item (image, video, doc, text) + search & filter
- "Use as Draft" — copy item ke calendar sebagai draft baru

### 5. Promo Manager
- Buat promo dengan base price + subsidi (fixed atau percentage)
- Branch allocation per cabang (total harus 100%)
- Auto-calculate harga final per cabang
- Aktif/nonaktifkan promo

### 6. Trend Tracker
- Monitor trending topics dari TikTok & Instagram
- Mark relevance: Relevant / Not Relevant / Potential
- Batch create drafts dari trends terpilih

### 7. Asset Generator
- Template library: Feed Design, Reels Thumbnail, Pricetag
- Preview & customize template (text, color, background)
- Export PNG dan save ke Content Hub *(coming soon)*

### 8. Report & Analytics
- Statistik total posts, posted/scheduled, draft, pending approval
- Tabel detail konten per periode
- Export CSV untuk laporan

### 9. Team Management (Admin only)
- Tambah user dengan role: admin, approver, editor, creator

---

## Cara Instalasi & Menjalankan

### Prasyarat
- [Node.js](https://nodejs.org/) v18 atau lebih baru

### Langkah

```bash
# 1. Masuk ke folder project
cd contentflow

# 2. Install dependencies
npm install

# 3. Jalankan server
npm start
```

Akses aplikasi di **http://localhost:3000**

### Akun Default

| Username   | Password  | Role     | Deskripsi           |
|------------|-----------|----------|---------------------|
| admin      | admin123  | Admin    | Maya (Admin)        |
| approver   | admin123  | Approver | Ahmad (Approver)    |
| editor     | admin123  | Editor   | Siti (Editor)       |
| creator    | admin123  | Creator  | Budi (Creator)      |

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (sql.js — pure JavaScript, tanpa native dependency)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (responsive, mobile-friendly)
- **Session**: express-session (cookie-based)

## Struktur Project

```
contentflow/
├── server.js          # Express server & API routes
├── database.js        # Database schema, seed, & helper functions
├── package.json       # Dependencies
├── README.md
├── data/              # SQLite database file (auto-generated)
├── uploads/           # Uploaded files
└── public/
    ├── index.html     # Single-page application
    └── css/
        └── style.css  # Styles
```

---

**Dibuat berdasarkan PRD: ContentFlow — All-in-One Content Management Platform untuk Marketing & Content Creators**
