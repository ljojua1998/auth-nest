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
| Phase 6 — Beta | TODO | — |

სრული გეგმა: `ideas/plan.md`
პროექტის სპეციფიკაცია: `ideas/idea.md`

---

## Tech Stack

- **Framework:** NestJS v11
- **ORM:** TypeORM
- **DB:** PostgreSQL (Neon cloud) — `DATABASE_URL` env var
- **Auth:** JWT access (15min) + refresh (7d), bcryptjs
- **Docs:** Swagger at `/api`
- **WebSocket:** Socket.IO (chat/news)
- **AI:** Google Gemini 2.0 Flash — `GEMINI_API_KEY` env var

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
├── auth/           — JWT auth (register, login, refresh, logout, profile)
├── users/          — User entity (+coins, +role)
├── common/
│   ├── decorators/ — @Roles()
│   └── guards/     — RolesGuard
├── tiers/          — Player price tiers (Superstar → Reserve)
├── teams/          — World Cup national teams
├── players/        — Players (position, tier, team)
├── chat/           — AI chat (Gemini, WebSocket) — News-ისთვის
├── app.module.ts
└── main.ts

ideas/
├── idea.md         — სრული სპეციფიკაცია
├── plan.md         — Build plan (6 sprint)
├── phase1.md       — Phase 1 დეტალები + QA checklist
└── phase{N}.md     — ...
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
DATABASE_URL=postgresql://...neon...
JWT_SECRET=minimum-32-characters-secret
GEMINI_API_KEY=your-gemini-key
NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## პირველი გაშვება (ახალი კომპი)

```bash
npm install
# .env ფაილი შექმენი ზემოთ მოცემული variables-ით
npm run start:dev

# Seed data (პირველ გაშვებაზე):
# POST /admin/tiers/seed   (Admin JWT საჭიროა)
# POST /admin/teams/seed   (Admin JWT საჭიროა)
```

Swagger: `http://localhost:3000/api`
