# Canva Template Link Generator — Design Spec

## Overview
Replace the existing manual `canva_link` text field approach with a structured **Canva Template Link Generator**. Admin registers Canva templates per brand, users open them directly from "Buat Desain" with one click.

## Database

New table `canva_templates`:

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | UUID |
| brand_id | TEXT | FK → brands |
| name | TEXT | Nama template |
| description | TEXT | Deskripsi singkat |
| template_id | TEXT | ID template Canva (dari URL `canva.com/design/create?template=xxx`) |
| thumbnail_url | TEXT | Preview image URL (opsional) |
| created_at | TEXT | `datetime('now')` |

## API Endpoints

- `GET /api/canva-templates` — returns templates filtered by `brand_id` from session (admin sees all brands)
- `POST /api/canva-templates` — admin/creator only, body: `{ name, description, template_id, thumbnail_url }`
- `PUT /api/canva-templates/:id` — admin/creator only
- `DELETE /api/canva-templates/:id` — admin/creator only

The `template_id` is the value from the Canva template URL (e.g., from `https://www.canva.com/design/create?template=EAEvGf0CZHo` → `EAEvGf0CZHo`). The full URL is constructed on the frontend: `https://www.canva.com/design/create?template=${template_id}`

## Frontend

### "Buat Desain" Page Update
- Existing 4-step instruction card stays unchanged at top
- Below it: template grid filtered by active brand
- Each card: thumbnail or fallback icon, name, description, and `Buka di Canva` button
- Click → `window.open(canvaUrl, '_blank')`
- After editing, user copies the design link from Canva and pastes into content plan's `canva_link` field (existing flow unchanged)

### Admin Panel — "Template Canva"
- New sidebar menu item (below "Brand")
- CRUD modal: name, description, template_id, thumbnail_url
- Grid card layout, same style as brand management
- Visible only to admin/creator roles

## No External Dependencies
No npm packages needed. No OAuth. Just URL construction and window.open.
