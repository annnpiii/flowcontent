# Product Requirements Document: Flowcontent

## 1. Overview

Flowcontent is a marketing studio CMS platform for managing social media content workflows across multiple brands. It enables content creators and admins to plan, create, review, approve, and post social media content in a structured pipeline.

## 2. Tech Stack

| Category | Technology |
|----------|-----------|
| Backend | Node.js, Express.js |
| Database | SQLite (via sql.js) |
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Auth | Session-based (express-session) |
| Templating | Server-side rendered HTML + client-side SPA |

## 3. User Roles

### 3.1 Admin
- Full access to all features
- Review and approve content
- Request revisions
- Mark content as posted
- Manage brands, users, templates, promos
- View reports and analytics

### 3.2 Creator
- Create and edit content (draft)
- Submit content for review
- View own content status
- Fix revision requests
- View posted content status

## 4. Core Features

### 4.1 Dashboard
- 5 stat cards: Draf, Review, Approval, Revisi, Terposting
- Recent content table (last 10) with status badges
- Activity feed showing user actions

### 4.2 Content Plan (Rencana Konten)
- CRUD operations for content plans
- Status: Draft, Published
- Fields: title, PIC, upload_date, pillar, content_type, brand, publisher, canva_link
- Bulk status change
- CSV import/export
- Filter by month and status

### 4.3 Calendar (Kalender Konten)
- Month, week, and list views
- Drag-and-drop to change posting date
- Click event to open content detail modal
- Filter by 5 display statuses
- Color-coded events per status
- Create new content from calendar

### 4.4 Content Workflow

```
Creator:  Draf --(minta review)--> Review --(revisi)--> Revisi --(perbaiki)--> Review (loop)
                                    |
Admin:                           Approve --(isi link)--> Terposting
```

**Statuses:**
- `draft` (Draf) - Creator only, default
- `pending_review` (Review) - Sent by creator for admin review
- `approved` (Approval) - Approved by admin, ready to post
- `revision_requested` (Revisi) - Admin requested changes
- `posted` (Terposting) - Admin marked as posted with media link

**Workflow Rules:**
- Creator can only set: draft → pending_review → draft (if rejected)
- Admin can set: pending_review → approved | revision_requested
- Admin can set approved → posted (by adding content_url)
- Admin can set: posted (directly with content_url)
- Creator cannot set "posted" or "approved"

### 4.5 Approval Page
- Admin view: 5 stat cards + kanban column (Review only)
- Admin actions: Approve, Request Revision, Delete
- Creator view: 5 stat cards + table of own submissions
- Creator actions: View detail, Fix revision, Delete

### 4.6 Content CRUD
- Create: title, platform (ig/tiktok/both), posting_date, caption, notes, media URL, canva link, assign creator
- Edit: all fields + content_plan_id
- Detail modal: caption, date, creator, notes, media link, canva link, revision feedback

### 4.7 Report & Analytics
- Filter by 5 display statuses
- Stat cards: Total, Terposting, Review, Approval, Draf
- Export CSV
- AI analysis of content plans
- No delete functionality in report

### 4.8 Brand Management
- Multi-brand support
- Brand filter scopes all data by brand
- CRUD for brands

### 4.9 User Management
- CRUD for users
- Roles: admin, creator, editor
- Brand membership

### 4.10 Notifications
- Types: pending_review, approved, revision, deadline_h1
- Click navigates to relevant page
- Badge count in sidebar

### 4.11 Additional Features
- Promo management
- Content Hub (asset library with folders)
- Template management
- Trend analysis
- Asset generation
- Dark mode toggle

## 5. API Endpoints

### 5.1 Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/login | Login (rate limited: 5/min/IP+UA) |
| POST | /api/logout | Logout |
| GET | /api/auth | Check auth status |

### 5.2 Contents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contents | List contents (paginated, filterable) |
| GET | /api/contents/:id | Get single content |
| POST | /api/contents | Create content |
| PUT | /api/contents/:id | Update content (supports status + content_url) |
| DELETE | /api/contents/:id | Delete content (admin only) |
| PUT | /api/contents/:id/status | Update status (draft→pending_review→approved→posted/revision_requested) |
| PUT | /api/contents/:id/date | Change posting date |
| DELETE | /api/contents/bulk | Bulk delete |
| PATCH | /api/contents/bulk/status | Bulk status change |

### 5.3 Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Returns counts: drafts, pendingReview, approved, revisionRequested, scheduled, posted |

### 5.4 Content Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/content-plans | List plans (paginated, filterable) |
| POST | /api/content-plans | Create plan |
| PUT | /api/content-plans/:id | Update plan |
| DELETE | /api/content-plans/:id | Delete plan |
| PATCH | /api/content-plans/bulk/status | Bulk status change |
| GET | /api/content-plans/months | List available months |
| POST | /api/content-plans/import | CSV import |

### 5.5 Users & Brands
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List users |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |
| GET | /api/brands | List brands |
| POST | /api/brands | Create brand |
| PUT | /api/brands/:id | Update brand |
| DELETE | /api/brands/:id | Delete brand |

### 5.6 Report
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/report | Full content report |
| POST | /api/report/ai-analyze | AI analysis |

## 6. Database Schema

### 6.1 Users
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID PK |
| username | TEXT | UNIQUE |
| password | TEXT | Hashed |
| display_name | TEXT | |
| role | TEXT | admin/creator/editor |
| brand_id | TEXT | FK |

### 6.2 Contents
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID PK |
| title | TEXT | |
| caption | TEXT | |
| platform | TEXT | ig/tiktok/both |
| status | TEXT | draft/pending_review/approved/revision_requested/posted |
| content_url | TEXT | Media/IG link |
| canva_link | TEXT | Canva design link |
| posting_date | TEXT | Date YYYY-MM-DD |
| creator_id | TEXT | FK users |
| brand_id | TEXT | FK brands |
| feedback | TEXT | Revision feedback |
| notes | TEXT | Internal notes |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |

### 6.3 Content Plans
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID PK |
| title | TEXT | |
| status | TEXT | Draft/Published |
| pic | TEXT | Person in charge |
| pillar | TEXT | Content pillar |
| content_type | TEXT | |
| brand | TEXT | |
| publisher | TEXT | |
| canva_link | TEXT | |
| upload_date | TEXT | |
| month_group | TEXT | YYYY-MM |
| brand_id | TEXT | FK brands |

### 6.4 Other Tables
- notifications (id, user_id, content_id, type, message, created_at, read)
- activity_logs (id, user_id, action, details, created_at)
- brands (id, name, slug, color)
- content_folders (id, name, parent_id) - for content hub
- content_items (id, folder_id, title, file_path, file_type) - assets
- promos (id, name, base_price, allocation)

## 7. Status Display Logic

### 7.1 Badge Mapping
```javascript
// Central function: getContentDisplayStatus(content)
// If content.content_url is truthy → 'terposting'
// Else map: draft→draf, pending_review→review, approved→approval,
//           revision_requested→revisi, posted→terposting, scheduled→terposting, done→terposting
```

### 7.2 Color Coding (Calendar)
- Draf: gray (#b0a6a0)
- Review: warning/amber (#f59e0b)
- Approval: accent (#6366f1)
- Revisi: error/red (#dc2626)
- Terposting: success/green (#16a34a)

## Test Configuration

### Test Scope
- **Frontend**: login page, dashboard rendering, calendar navigation, approval workflow, content CRUD modals, report page, dark mode toggle, responsive layout
- **Backend**: auth endpoints, content CRUD API, status transition workflow, brand filtering, rate limiting, dashboard stats endpoint
- **Auth Flows**: login/logout, session persistence, role-based access (admin vs creator), rate limiting per IP+User-Agent
- **Key Workflows**: draft→review→approve→posted, revision loop (review→revision→review), content creation from calendar

### Test Data Requirements
- Minimum 2 brands
- 1 admin user + 1 creator user
- At least 5 content items across different statuses
- 2 content plans (one Draft, one Published)
- Contents with and without content_url to verify status display logic
