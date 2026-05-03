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
| Phase 7 — Player Data Sync | TODO | ideas/limit.md |

**მიმდინარე Deploy:** Railway — `https://auth-nest-production.up.railway.app`
**DB:** Railway PostgreSQL (5 migrations run: 001–005)
**Player Data:** 1,739 ფეხბ. / 82 ნაკრები (48 WC 2026 + UEFA qualifiers)
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
├── players/        — Players (position, tier, team, apiFootballId)
├── user-teams/     — User fantasy team (15 players, formation, captain, lineup)
├── marketplace/    — Buy/sell players (PESSIMISTIC_WRITE, open/close)
├── cards/          — Triple Captain / Wildcard / Limitless (one-time per tournament)
├── tournaments/    — Tournament stages (group/R32/R16/QF/SF/3rd/Final)
├── matches/        — Matches + stats + user scores
├── scoring/        — Scoring engine (position-based, auto-sub, captain multiplier)
├── leaderboard/    — Per-tournament + global leaderboard
├── transactions/   — Coin audit log
├── promotions/     — Promo codes + redemptions
├── admin/          — All admin operations
├── chat/           — AI chat (Gemini, WebSocket)
├── migrations/     — 001–005 TypeORM migrations
├── app.module.ts
└── main.ts

scripts/
└── seed-uefa.js    — UEFA teams + players seed (API-Football)

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
└── limit.md        — Player Data Sync Plan (paid API plan)
```

---

## Business Rules (კრიტიკული)

- ახალი user → **1,000,000 Coins** (registration-ზე)
- ყველა Coin ოპერაცია → `transactions` ცხრილში (Phase 4)
- Coin ბალანსი **ვერ წავა მინუსში** — 3 layer: DTO → Service (PESSIMISTIC_WRITE) → DB
- User team: **15 ფეხბ.** (11 starter + 4 sub), max ერთი ნაკრებიდან unlimited
- ფორმაციები: `3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-3-2, 5-4-1`
- კაპიტანი: **x2** ქულა, Triple Captain: **x3** (ერთჯერადი)
- Cards (Wildcard/Limitless/TC): **one-time** per tournament
- Marketplace: **დახურულია** მატჩების დროს, **იხსნება** ეტაპებს შორის
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
API_FOOTBALL_KEY=your-key-here         # Phase 7 — paid plan-ზე
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
```

Swagger (dev): `http://localhost:3000/api`
Production: `https://auth-nest-production.up.railway.app`

## გასაკეთებელი (Phase 7)

| # | Task | სტატუსი |
|---|------|---------|
| 1 | Player fields migration (age/number/birthDate/height/weight/injured/rating) | TODO |
| 2 | Squad re-seed — age + number ველები (0 API requests) | TODO |
| 3 | Republic of Ireland squad (1 API request) | TODO |
| 4 | `POST /admin/players/sync-details` — paid plan (~1,739 req) | TODO (paid plan) |
| 5 | Daily injury cron (`@nestjs/schedule`) | TODO (ტურნირის დროს) |
| 6 | Match stats auto-sync cron | TODO (ტურნირის დროს) |
| 7 | Beta testing (10-20 user) | TODO |
