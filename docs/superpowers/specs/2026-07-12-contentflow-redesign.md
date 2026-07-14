# ContentFlow Redesign — Fresh Frontend

**Date:** 2026-07-12
**Status:** Approved

## Design Read
Dashboard SPA for marketing/content teams. Editorial-warm base with a bold hot-pink accent. Professional, premium, productive — a tool that feels intentional without being distracting.

## Three Dials
- DESIGN_VARIANCE: 6
- MOTION_INTENSITY: 4
- VISUAL_DENSITY: 5

## Palette
| Role | Color | Hex |
|------|-------|-----|
| Page background | Warm ivory | `#f6f3ef` |
| Card/surface | White | `#ffffff` |
| Sidebar | Deep warm charcoal | `#1c1816` |
| Body text | Warm near-black | `#1a1714` |
| Accent — bold hot pink | Vibrant hot pink | `#FF1695` |
| Accent hover | Deeper pink | `#d80d7a` |
| Subtle pink bg | Pale blush | `#ffeef4` |
| Muted / secondary text | Warm gray | `#8a7e7a` |
| Borders / dividers | Soft stone | `#e6dfd7` |

## Typography
- Display / Headings: Cabinet Grotesk
- Body / UI: Geist
- Mono / Data: JetBrains Mono

## File Structure
- `public/index.html` — HTML structure (login + app shell)
- `public/css/style.css` — All styles + Tailwind config
- `public/js/app.js` — SPA logic extracted from inline

## Architecture
1. Login page — centered card on ivory bg
2. App shell — dark sidebar (260px) + frosted topbar + content area (max 1400px)
3. Sidebar — Cabinet Grotesk logo, nav with pink active indicator, user section
4. All sub-pages (dashboard, content plan, calendar, approval, hub, promo, trends, assetgen, report, users) — consistent card language, tables, buttons

## Key Design Decisions
- Hot pink used sparingly but memorably — CTAs, active nav, stat card borders, notification dots
- Warm stone base keeps the pink from overwhelming
- Cards float on white with subtle shadow, no heavy glass
- Page transitions: subtle fade+slide
- Reduced motion respected
