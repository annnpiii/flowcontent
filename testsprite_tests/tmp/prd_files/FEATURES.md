# ContentFlow Feature Specifications

## Authentication
- POST /api/login with valid username/password returns 200 with user, brands, activeBrandId
- POST /api/login with invalid credentials returns 401
- GET /api/me with session returns user profile and brands
- POST /api/logout destroys session
- Login rate limited to 5 attempts per minute

## User Management (Admin only)
- GET /api/users lists all users
- POST /api/users creates new user (username, password, display_name, role)
- DELETE /api/users/:id deletes user
- GET /api/users/:id/permissions returns user permissions
- PUT /api/users/:id/permissions updates permissions array

## Brand Management
- GET /api/brands lists brands accessible to user
- POST /api/brands creates brand (admin only)
- PUT /api/brands/:id updates brand
- POST /api/brands/:id/logo uploads logo
- DELETE /api/brands/:id deletes brand and members (admin only)
- POST /api/brand/switch switches active brand context
- GET /api/brands/:id/members lists brand members
- POST /api/brands/:id/members adds member
- DELETE /api/brands/:id/members/:userId removes member

## Content Calendar
- GET /api/contents lists with filters (start, end, status, platform, creator_id)
- GET /api/contents/:id returns content with logs and versions
- POST /api/contents creates draft
- PUT /api/contents/:id updates content and creates version
- PUT /api/contents/:id/status changes status with notifications (draft, pending_review, approved, scheduled, revision_requested, posted)
- PUT /api/contents/:id/schedule schedules content (admin only)
- PUT /api/contents/:id/date changes posting date (blocked for scheduled/posted)
- DELETE /api/contents/bulk bulk delete (admin only)
- PATCH /api/contents/bulk/status bulk update status (admin only)
- DELETE /api/contents/:id single delete (admin only)

## Content Plans
- GET /api/content-plans lists with pagination, month, status filters
- POST /api/content-plans creates plan and syncs to calendar
- PUT /api/content-plans/:id updates plan and syncs
- DELETE /api/content-plans/:id deletes plan and synced content (admin only)
- DELETE /api/content-plans/bulk bulk delete (admin only)
- PATCH /api/content-plans/bulk/status bulk update (admin only)
- GET /api/content-plans/export CSV export
- POST /api/content-plans/import CSV import (admin only)
- GET /api/content-plans/months returns distinct month groups

## Content Hub
- GET /api/folders lists folders with item counts
- POST /api/folders creates folder
- DELETE /api/folders/:id deletes folder (non-default, admin only)
- GET /api/items lists items with pagination, search, category, file_type
- POST /api/items creates item with file upload
- DELETE /api/items/:id deletes item (admin only)

## Promo Management
- GET /api/promos lists promos
- POST /api/promos creates promo with allocation validation (must total 100%) (admin only)
- PUT /api/promos/:id updates promo (admin only)

## Trending Topics & AI Generator
- POST /api/trends/refresh generates trends via DeepSeek AI (admin only)
- GET /api/trends lists trends with filters
- POST /api/trends creates manual trend
- PUT /api/trends/:id updates relevance/notes
- POST /api/trends/batch-draft creates content drafts from selected trends

## Notifications
- GET /api/notifications lists user notifications with unread count
- PUT /api/notifications/:id/read marks as read
- PUT /api/notifications/read-all marks all as read
- DELETE /api/notifications/:id deletes notification
- DELETE /api/notifications deletes all notifications

## Dashboard & Analytics
- GET /api/dashboard returns content status counts
- GET /api/report returns content report with date filter (admin only)
- POST /api/report/ai-analyze AI analysis (admin only)

## Canva Templates
- GET /api/canva-templates lists templates
- POST /api/canva-templates creates template
- PUT /api/canva-templates/:id updates template
- DELETE /api/canva-templates/:id deletes template
- POST /api/canva-templates/:id/thumbnail uploads thumbnail

## File Upload
- POST /api/upload uploads a file

## Activity & Search
- GET /api/search global search across plans, contents, items, promos
- GET /api/activities returns activity logs
- GET /api/team lists team members
- GET /api/templates lists design templates
- DELETE /api/templates/:id deletes template

## Role-Based Access
- Admin: all access, user management, brand management, bulk operations
- Creator: content creation, content plans, content hub, view brands
- Brand scoping: all data filtered by active brand_id
