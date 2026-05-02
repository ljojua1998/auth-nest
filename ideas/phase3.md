# Phase 3 — Bug Fixes Round 2
> თარიღი: 2026-05-02

## გამოსწორებული Bugs

### CRITICAL (5/5 fixed)
- **BUG-C01** — `sell()` UserTeam fetch-ს დაემატა `pessimistic_write` lock (`marketplace.service.ts`)
- **BUG-C02** — `activateCard()` გადაწერილია transaction-ში `pessimistic_write` lock-ით (`cards.service.ts`); DataSource injected
- **BUG-C03** — `calculateMatchPoints()` N+1 გაქრა — existing scores preload Map-ში loop-ის წინ (`scoring.service.ts`)
- **BUG-C04** — `register()` atomic: user + cards ერთ transaction-ში (`auth.service.ts`); orphaned user შეუძლებელია
- **BUG-C05** — `processElimination()` Team locked `pessimistic_write`-ით transaction-ის შიგნით; double-refund race condition გაქრა (`admin.service.ts`)

### HIGH (7/7 fixed)
- **BUG-H01** — Scoring batch processing (500 teams/batch) — OOM risk eliminated (`scoring.service.ts`)
- **BUG-H02** — `tiers.controller.ts` route order: `/seed` registered before `/:id`
- **BUG-H03** — `distributePrizes()` user IDs sort ascending — deterministic lock ordering, deadlock prevention
- **BUG-H04** — `UserTeamPlayer` entity: `@Unique(['userTeamId', 'playerId'])` DB constraint added
- **BUG-H05** — Scoring: sub only marked used if it has actual stats (minutes > 0)
- **BUG-H06** — `RedeemPromoDto.code`: `@IsNotEmpty()` validator added
- **BUG-H07** — `UserMatchScore` entity: `@Unique(['userId', 'matchId'])` DB constraint added

### MEDIUM (9/9 fixed)
- **BUG-M01** — `synchronize: false` ყოველთვის (`app.module.ts`)
- **BUG-M02** — `REFRESH_TOKEN_SECRET` validated on use; undefined throws Error (`auth.service.ts`)
- **BUG-M03** — `processElimination()` history batch insert, UTPs bulk delete (`admin.service.ts`)
- **BUG-M04** — `setLineup()` saves only changed UTPs (`user-teams.service.ts`)
- **BUG-M05** — Marketplace status re-checked inside transaction in buy/sell (`marketplace.service.ts`)
- **BUG-M06** — Extra doubleYellow -1 penalty removed from scoring (`scoring.service.ts`)
- **BUG-M07** — `transactions.getMyHistory()` pagination: limit=100, offset=0 (`transactions.service.ts`)
- **BUG-M08** — `ClassSerializerInterceptor` global (`main.ts`); @Exclude() now works on User entity
- **BUG-M09** — `getOrCreateTeam()` handles unique_violation (23505) race condition (`user-teams.service.ts`)

### LOW (4/7 fixed — BUG-L01 is business decision, BUG-L02 deferred, BUG-L07 acceptable)
- **BUG-L03** — `RefreshDto` DTO with `@IsString() @IsNotEmpty()` validation; 400 instead of 500
- **BUG-L04** — `updateMatchStatus()` blocks FINISHED → any other status transition
- **BUG-L05** — `players.findAll()` filters `team.eliminated = false` by default
- **BUG-L06** — `promotions.update()` whitelist: only safe fields updated (no usedCount reset)

---

## QA გასატესტია

### CRITICAL Tests
- [ ] **BUG-C01**: ორი parallel `POST /market/sell` ერთი player-ისთვის — მეორე request-ი სწორ error-ს დააბრუნებს (player not in team)
- [ ] **BUG-C02**: ორი parallel `POST /cards/activate` ერთი card-ისთვის — მეორე request-ი `400 Card already used`-ს დააბრუნებს
- [ ] **BUG-C03**: `POST /admin/scoring/:matchId` 1000+ user-ის შემთხვევაში timeout-ს არ გამოიწვევს
- [ ] **BUG-C04**: `POST /auth/register` — cards service DB failure simulation — user DB-ში არ დარჩება (rollback)
- [ ] **BUG-C05**: ორი parallel `POST /admin/elimination/:teamId` — მეორე request-ი `400 already eliminated`-ს დააბრუნებს

### HIGH Tests
- [ ] **BUG-H01**: Scoring ბევრ user-ზე მეხსიერებაში batch-ებად მუშაობს
- [ ] **BUG-H02**: `POST /admin/tiers/seed` სწორად მუშაობს (არ shadowed-ია)
- [ ] **BUG-H04**: DB-ში duplicate player insert ერთ team-ში → `23505 unique violation` error
- [ ] **BUG-H05**: starter-ი 0 minutes, sub-ი 0 minutes → sub არ "გამოხარჯულია"
- [ ] **BUG-H06**: `POST /promo/redeem` body: `{"code": ""}` → `400 Bad Request`
- [ ] **BUG-H07**: DB-ში duplicate UserMatchScore insert → `23505 unique violation` error

### MEDIUM Tests
- [ ] **BUG-M01**: `NODE_ENV` unset-ის შემთხვევაში DB schema auto-sync-ი არ მოხდება
- [ ] **BUG-M02**: `REFRESH_TOKEN_SECRET` unset — login/refresh → `500` with clear message
- [ ] **BUG-M03**: Elimination 1000 player-ზე — transaction სწრაფად სრულდება
- [ ] **BUG-M05**: Marketplace-ი status check: marketplace close-ს შემდეგ in-flight buy/sell → `403`
- [ ] **BUG-M06**: Player 2 yellow + red cards → penalty: -1 (yellow1) + -1 (yellow2) + -3 (red) = -5 (no extra -1)
- [ ] **BUG-M07**: `GET /transactions/my` → max 100 records
- [ ] **BUG-M08**: `GET /leaderboard/:id` → response-ში `password`, `refreshToken` fields არ არის
- [ ] **BUG-M09**: ახალი user პირველ buy-ზე parallel requests → `500`-ის ნაცვლად სწორი response

### LOW Tests
- [ ] **BUG-L03**: `POST /auth/refresh` body: `{}` → `400 Bad Request` (არა 500)
- [ ] **BUG-L04**: `PATCH /admin/matches/:id/status` FINISHED → SCHEDULED → `400 Bad Request`
- [ ] **BUG-L05**: `GET /market/players` — eliminated team-ების ფეხბ. სიაში არ ჩანს
- [ ] **BUG-L06**: `PATCH /admin/promo/:id` body: `{"usedCount": 0}` → usedCount unchanged

---

## შენიშვნები

- `synchronize: false` გამოიწვევს schema migration-ის საჭიროებას: `@Unique` constraints (`UserTeamPlayer`, `UserMatchScore`) DB-ში ხელით ან migration-ის გავლით უნდა შეიქმნას
- `ClassSerializerInterceptor` global-ი შეიძლება ზოგ endpoint-ზე response shape-ს ოდნავ შეცვლიდეს — QA-ს უნდა გადაამოწმოს ყველა public endpoint
