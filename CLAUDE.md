# WorldFantasy — Claude Context

ქართული Fantasy Football პლატფორმა World Cup 2026-ისთვის.
**Deadline: ივნისი 11, 2026**

---

## პროექტის მდგომარეობა

ყოველი ფაზის შემდეგ `ideas/phase{N}.md` ფაილი იქმნება.
მიმდინარე ფაზის სანახავად წაიკითხე ბოლო phase ფაილი `ideas/` ფოლდერში.

| ფაზა | სტატუსი | ფაილი |
|------|---------|-------|
| Phase 1 — Foundation | DONE | ideas/phase1.md |
| Phase 2 — Fantasy Core | DONE | ideas/phase2.md |
| Phase 3 — Tournament & Scoring | DONE | ideas/phase2.md |
| Phase 4 — Operations | DONE | ideas/phase2.md |
| Phase 5 — Promotions & Polish | DONE | ideas/phase2.md |
| Phase 6 — Beta Deploy (Railway) | DONE | — |
| Phase 6 — QA Bug Fixes (28 bugs) | DONE | ideas/bugs2.md + ideas/phase3.md |
| Phase 6 — Security Audit | DONE | ideas/security.md + ideas/qa-security.md |
| Phase 6 — Referral System | DONE | ideas/phase6_referral.md |
| Phase 6 — Frontend API Docs | DONE | ideas/api-docs.md |
| Phase 6 — Bug fix: marketplace open/close | DONE | commit 91457d8 |
| Phase 6 — Bug fix: buy/sell 500 (FOR UPDATE + LEFT JOIN) | DONE | commit 0c8810f |
| Phase 7 — save-team batch buy endpoint | DONE | commit 259cbe6 |
| Phase 7 — Coin economy (10M reg, 1M referral) | DONE | commit 259cbe6 |
| Phase 7 — Migration 006 (player detail fields) | DONE | migration 006 |
| Phase 7 — Player detail sync (99/1739) | IN PROGRESS | scripts/sync-player-details.js |

**მიმდინარე Deploy:** Railway — `https://auth-nest-production.up.railway.app`
**DB:** Railway PostgreSQL (6 migrations run: 001–006)
**Player Data:** 1,739 ფეხბ. / 82 ნაკრები (99 synced, 1,640 remaining)
**Test Admin:** test1@gmail.com / testtest1 (ID:9, role:admin)
**Marketplace:** production-ზე OPEN

სრული გეგმა: `ideas/plan.md`
პროექტის სპეციფიკაცია: `ideas/idea.md`

---

## Tech Stack

- **Framework:** NestJS v11
- **ORM:** TypeORM
- **DB:** PostgreSQL (Railway cloud) — `DATABASE_URL` env var
- **Auth:** JWT access (15min) + refresh (7d), bcryptjs
- **Docs:** Swagger at `/api` (dev only — production-ში გამორთული)
- **WebSocket:** Socket.IO (chat/news, Gemini AI)
- **AI:** Google Gemini 2.0 Flash — `GEMINI_API_KEY` env var
- **Rate Limiting:** `@nestjs/throttler` — global 10 req/sec, 100 req/min

---

## Agents (`.claude/agents/`)

| Agent | გამოყენება |
|-------|-----------|
| `backend-developer` | კოდის დაწერა — NestJS modules, services, controllers |
| `qa-engineer` | კოდის review, test cases, edge cases |
| `security-engineer` | Security audit — OWASP, IDOR, auth flaws |

**Workflow:** backend-developer → qa-engineer → security-engineer

backend-developer ყოველი ფაზის ბოლოს ქმნის `ideas/phase{N}.md`

---

## პროექტის სტრუქტურა

```
src/
├── auth/           — JWT auth (register, login, refresh, logout, profile) + referral
├── users/          — User entity (+coins, +role, +referralCode, +referredBy)
├── common/
│   ├── decorators/ — @Roles()
│   └── guards/     — RolesGuard
├── tiers/          — Player price tiers (Superstar/Strong/Average/Backup/Reserve)
├── teams/          — 48 WC 2026 national teams (groups A-L)
├── players/        — Players (position, tier, team, apiFootballId, age, number, rating...)
├── user-teams/     — User fantasy team (15 players, formation, captain, lineup)
├── marketplace/    — Buy/sell/save-team players (PESSIMISTIC_WRITE, open/close)
├── cards/          — Triple Captain / Wildcard / Limitless (one-time per tournament)
├── tournaments/    — Tournament stages (group/R32/R16/QF/SF/3rd/Final)
├── matches/        — Matches + stats + user scores
├── scoring/        — Scoring engine (position-based, auto-sub, captain multiplier)
├── leaderboard/    — Per-tournament + global leaderboard
├── transactions/   — Coin audit log
├── promotions/     — Promo codes + redemptions
├── admin/          — All admin operations
├── chat/           — AI chat (Gemini, WebSocket)
├── migrations/     — 001–006 TypeORM migrations
├── app.module.ts
└── main.ts

scripts/
├── seed-uefa.js            — UEFA teams + players seed (API-Football)
└── sync-player-details.js  — Player detail sync (daily batch, 100 req/day free plan)

ideas/
├── idea.md         — სრული სპეციფიკაცია
├── plan.md         — Build plan
├── phase1.md       — Phase 1 (Foundation)
├── phase2.md       — Phase 2-5 (Fantasy Core → Promotions)
├── phase3.md       — QA Bug Fix Round 2
├── phase6_referral.md — Referral System
├── bugs2.md        — QA Bug Report (28 bugs)
├── security.md     — Security Audit Report
├── qa-security.md  — Security QA Test Results
├── api-docs.md     — Frontend API Documentation
└── limit.md        — Player Data Sync Plan
```

---

## Business Rules (კრიტიკული)

- ახალი user → **10,000,000 Coins** (registration-ზე)
- რეფერალი → **1,000,000 Coins** ბონუსი (მომწვევს)
- ყველა Coin ოპერაცია → `transactions` ცხრილში
- Coin ბალანსი **ვერ წავა მინუსში** — 3 layer: DTO → Service (PESSIMISTIC_WRITE) → DB
- User team: **15 ფეხბ.** (11 starter + 4 sub), max ერთი ნაკრებიდან unlimited
- ფორმაციები: `3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-3-2, 5-4-1`
- კაპიტანი: **x2** ქულა, Triple Captain: **x3** (ერთჯერადი)
- Cards (Wildcard/Limitless/TC): **one-time** per tournament
- Marketplace (სატრანსფერო ფანჯარა): **დახურულია** მატჩების დროს, **იხსნება** ეტაპებს შორის
- ყიდვა და გაყიდვა — მხოლოდ სატრანსფერო ფანჯარა ღია რომ არის
- `POST /market/save-team` — batch ყიდვა ერთ request-ში (გაყიდვა არ ხდება)
- eliminated ნაკრების ფეხბ. → ავტომატური ამოშლა + Coin refund

---

## Code Standards

- TypeScript strict — **no `any`**
- ყველა endpoint — `@ApiOperation`, `@ApiResponse` (Swagger)
- ყველა DTO — class-validator decorators
- Coin operations — `PESSIMISTIC_WRITE` lock + `QueryRunner`
- Admin endpoints — `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`
- User data isolation — `userId` ყოველთვის JWT-დან, **არასდროს** request body-დან

---

## Environment Variables

```
DATABASE_URL=postgresql://...railway...
JWT_SECRET=minimum-32-characters-secret
REFRESH_TOKEN_SECRET=different-minimum-32-chars-secret
GEMINI_API_KEY=your-gemini-key
NODE_ENV=production                    # production-ში Swagger გამორთავს, synchronize: false
CORS_ORIGIN=https://your-frontend.com  # CORS whitelist (optional — default: false prod-ზე)
NODE_TLS_REJECT_UNAUTHORIZED=0         # Railway internal SSL-ისთვის
API_FOOTBALL_KEY=9ee469c18a...         # API-Football key (free plan: 100 req/day)
```

---

## პირველი გაშვება (ახალი კომპი)

```bash
npm install
# .env ფაილი შექმენი ზემოთ მოცემული variables-ით
npm run start:dev

# Migrations (production DB-ზე):
npm run migration:run

# Seed data (admin JWT საჭიროა):
# POST /admin/tiers/seed   — 5 tier (Superstar/Strong/Average/Backup/Reserve)
# POST /admin/teams/seed   — 48 WC 2026 ნაკრები (groups A-L)

# UEFA players seed (Node.js script — API-Football):
# node scripts/seed-uefa.js   (100 req/day limit — 7s delay)

# Player detail sync (daily batch):
# node scripts/sync-player-details.js   (100 req/day, ~7s/req, ~12min/batch)
```

Swagger (dev): `http://localhost:3000/api`
Production: `https://auth-nest-production.up.railway.app`

## გასაკეთებელი (Phase 7 — მიმდინარე)

| # | Task | სტატუსი |
|---|------|---------|
| 1 | Player fields migration 006 | DONE |
| 2 | Player detail sync (99/1739 — ყოველდღე 100) | IN PROGRESS |
| 3 | Republic of Ireland squad (filter გასწორდა, ხვალის batch-ში) | TODO |
| 4 | Daily injury cron (`@nestjs/schedule`) | TODO (ტურნირის დროს) |
| 5 | Match stats auto-sync cron | TODO (ტურნირის დროს) |
| 6 | Beta testing (10-20 user) | TODO |
