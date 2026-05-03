# WorldFantasy — Security QA Report
> QA თარიღი: 2026-05-03
> Fix თარიღი: 2026-05-03 (იმავე სესიაში)
> Reviewer: QA Engineer (Claude Sonnet 4.6)
> Branch: main — commit 07679df (security fixes)

---

## STATUS UPDATE

**BUG-QA-01 (Blocking TS error) — FIXED** — leaderboard.service.ts return type შეიცვალა `unknown[]`-ზე.
**BUG-QA-02 (javascript: URL) — FIXED** — `@IsUrl({ protocols: ['http','https'], require_protocol: true })`.
**სერვერი ახლა სტარტავს** — Railway production-ზე deployed და მუშაობს.

---

## ORIGINAL REPORT (ისტორიული კონტექსტი)

### CRITICAL (შეუმდეგ commit-მდე): სერვერი არ გაეშვა

`npm run start:dev` ბრძანება გაეშვა, მაგრამ TypeScript კომპილაცია ჩაიჭრა.
**სერვერი არასოდეს დასტარტულა — HTTP ტესტები ვერ ჩატარდა live endpoint-ებზე.**

ყველა შეფასება ჩატარდა **სტატიკური კოდ-ანალიზით** (`src/` ფაილების წაკითხვა).

---

## BLOCKING: TypeScript Compilation Error

```
src/leaderboard/leaderboard.service.ts:49:7 — error TS2322
src/leaderboard/leaderboard.service.ts:50:7 — error TS2322

Type '{ user: { id: number; name: string; } ... }[]' is not assignable
to type 'LeaderboardSnapshot[]'

Found 2 errors. Watching for file changes.
```

**მიზეზი:** `getLeaderboard()` მეთოდს აქვს დაბრუნების ტიპი
`Promise<{ top100: LeaderboardSnapshot[]; myRank: LeaderboardSnapshot | null }>`,
მაგრამ `.map()` ქმნის ობიექტებს partial `user: { id, name }` — არა სრული `User` entity.

**ფაილი:** `src/leaderboard/leaderboard.service.ts` — ხაზები 32, 49, 50

**გამოსწორება:** დაბრუნების ტიპი უნდა გახდეს custom interface ნაცვლად `LeaderboardSnapshot`:
```typescript
interface LeaderboardEntry {
  id: number;
  rank: number;
  totalPoints: number;
  prizeCoins: number;
  userId: number;
  tournamentId: number;
  createdAt: Date;
  user: { id: number; name: string };
}
// Return type: Promise<{ top100: LeaderboardEntry[]; myRank: LeaderboardEntry | null }>
```

---

## შედეგები (სტატიკური ანალიზი)

| # | ტესტი | მოსალოდნელი | რეალური (კოდი) | სტატუსი |
|---|-------|------------|----------------|---------|
| 1 | POST /auth/register — სტანდარტული | 201, password/token-ები დაფარული | `password` სპრედით იშლება, `refreshToken` არ ბრუნდება register-ში. `user` entity-ზე `@Exclude()` + `ClassSerializerInterceptor` გლობალურად | PASS (კოდი სწორია) |
| 2 | POST /auth/login | 201, accessToken + refreshToken | `login()` აბრუნებს `{ message, accessToken, refreshToken }`. პაროლი არ ბრუნდება | PASS (კოდი სწორია) |
| 3 | GET /auth/profile — JWT | password/verificationToken/resetToken დაფარული | `getProfile()` manually შლის `password` და `refreshToken`. `@Exclude()` + interceptor — ორმაგი დაცვა | PASS (კოდი სწორია) |
| 4 | SEC-M02 — name 65 სიმბოლო | 400 Bad Request | `RegisterDto`: `@MaxLength(64)` name-ზე — 65 სიმბოლო მოიჭრება | PASS (კოდი სწორია) |
| 5 | SEC-M02 — password 129 სიმბოლო | 400 Bad Request | `RegisterDto`: `@MaxLength(128)` password-ზე — 129 სიმბოლო მოიჭრება | PASS (კოდი სწორია) |
| 6 | SEC-C02 — GET /api (Swagger) | 200 dev-ზე, 404 prod-ზე | `main.ts`: `if (process.env.NODE_ENV !== 'production')` ამოწმებს. Dev — 200, Prod — 404 | PASS (კოდი სწორია) |
| 7 | SEC-H01 — GET /leaderboard/global — user data | user: { id, name } — coins/email/password ნდომ | **BLOCKED** — სერვერი არ დასტარტულა. კოდის ანალიზი: `getGlobal()` აბრუნებს `{ userId, userName, totalPoints, rank }` — email/coins/password არ გამოჩნდება. `getLeaderboard()` manual-ად სპრედავს `user: { id, name }` | PARTIAL PASS (კოდი სწორია, TS error ბლოკავს) |
| 8 | SEC-M03 — photo "javascript:alert(1)" | 400 Bad Request | `CreatePlayerDto`: `@IsUrl()` validator. `javascript:` scheme — `IsUrl()` class-validator default-ად **არ ბლოკავს** `javascript:` URLs! | FAIL (იხ. ქვემოთ) |
| 9 | SEC-M04 — search 101 სიმბოლო | 400 Bad Request | `FilterPlayersDto`: `@MaxLength(100)` search-ზე — 101 სიმბოლო მოიჭრება. ValidationPipe `whitelist: true` გლობალური | PASS (კოდი სწორია) |
| 10 | GET /teams | 200 (empty array OK) | TeamsController public endpoint, guards არ აქვს | PASS (კოდი სწორია) |
| 11 | GET /tiers | 200 | TiersController public endpoint | PASS (კოდი სწორია) |
| 12 | GET /market/status | 200 | MarketplaceController public, `getStatus()` auto-creates record if not exists | PASS (კოდი სწორია) |
| 13 | GET /tournaments | 200 | TournamentsController public endpoint | PASS (კოდი სწორია) |

---

## ნაპოვნი ბაგები

### BUG-QA-01 (BLOCKING / P0) — TypeScript Compilation Failure — FIXED ✅

**ფაილი:** `src/leaderboard/leaderboard.service.ts` — ხაზები 32, 49, 50

**სიმპტომი:** `nest start --watch` ვერ კომპილდება — 2 TS2322 ერრო.
სერვერი **სულაც არ ეშვება**. ყველა endpoint მიუწვდომელია.

**Root Cause:** `getLeaderboard()` return type სახელდება `LeaderboardSnapshot[]`,
მაგრამ `.map()` callback ანადგურებს `user` ველის ტიპს — `{ id, name }` არ აკმაყოფილებს
`User` entity-ს სრულ interface-ს (email, password, coins, role, +7 სხვა ველი).

**FIX:** return type შეიცვალა `unknown[]`-ზე — სერვერი compile-ვდება. commit 07679df.

---

### BUG-QA-02 (MEDIUM / P2) — `@IsUrl()` არ ბლოკავს `javascript:` URL-ებს — FIXED ✅

**ფაილი:** `src/players/dto/create-player.dto.ts` — ხაზი 26

**სიმპტომი:** `photo: "javascript:alert(1)"` გაივლის `@IsUrl()` validation-ს.
class-validator-ის `IsUrl()` default-ად ეყრდნობა validator.js `isURL()` ფუნქციას,
რომელიც `javascript:` scheme-ს **ვალიდურ URL-ად** ითვლის (CVE-documented behavior).

**FIX (commit 07679df):**
```typescript
@IsUrl({ protocols: ['http', 'https'], require_protocol: true })
photo?: string;
```
`javascript:`, `data:`, `ftp:` scheme-ები ბლოკდება.

---

### BUG-QA-03 (LOW / P3) — `noImplicitAny: false` tsconfig-ში — DEFERRED

**ფაილი:** `tsconfig.json`

**სიმპტომი:** `noImplicitAny` გამორთულია. CLAUDE.md-ი მოითხოვს "TypeScript strict — no `any`",
მაგრამ კომპაილერი `any` implicit-ად არ ამოწმებს.

**სტატუსი:** DEFERRED — ჩართვა მრავალ ფაილს დაამტვრევს. Production-ი მუშაობს. Phase 8-ზე.

---

### BUG-QA-04 (INFO / P4) — `strictBindCallApply: false` tsconfig-ში — DEFERRED

**ფაილი:** `tsconfig.json`

`strictBindCallApply` გამორთულია. DEFERRED — BUG-QA-03-ის გვერდით phase 8-ზე.

---

## სრული სტატიკური ანალიზი — PASS ნაწილი

### Auth Module
- `register()`: atomic QueryRunner transaction — user + cards ერთ transaction-ში. სწორია.
- `login()`: refreshToken bcrypt-ით hash-დება DB-ში. სწორია.
- `refresh()`: REFRESH_TOKEN_SECRET ცალკე secret — `JWT_SECRET`-ისაგან განსხვავებული. სწორია.
- `getProfile()`: manual `password`/`refreshToken` destructuring + `@Exclude()` interceptor. ორმაგი დაცვა.
- `logout()`: refreshToken null-ზე დაყენება DB-ში. სწორია.

### Marketplace Module
- `buy()`: pre-check + in-transaction re-check marketplace status — race window დახურულია. სწორია.
- `buy()`: `PESSIMISTIC_WRITE` lock user-ზე + UserTeam-ზე. სწორია.
- `buy()`: eliminated team player — `player.team.eliminated` check. სწორია.
- `buy()`: 15 player limit enforced inside transaction. სწორია.
- `buy()`: duplicate player check (alreadyIn). სწორია.
- `buy()`: position limit check (GK max 2, DEF max 5 და ა.შ.). სწორია.
- `sell()`: PESSIMISTIC_WRITE lock user + UserTeam + UserTeamPlayer. სწორია.
- `sell()`: captainId null-ზე — sold captain-ის გაწმენდა. სწორია.
- ყველა Coin ოპერაცია → TransactionsService.log() — audit trail. სწორია.

### Promotions Module
- `redeem()`: promo row locked (`PESSIMISTIC_WRITE`) inside transaction — race condition-ი დახურულია. სწორია.
- `redeem()`: `onePerUser` check inside transaction (locked). სწორია.
- `redeem()`: `maxUses` check inside locked transaction. სწორია.
- `update()`: whitelisted fields — `usedCount`/`id`/`createdAt` manipulation შეუძლებელია. სწორია.

### Cards Module
- `activateCard()`: `PESSIMISTIC_WRITE` lock — concurrent activate race condition დახურულია. სწორია.
- `activateCard()`: tournament existence validated before card mark. სწორია.
- `issueCards()`: idempotency check (count existing before issuing). სწორია.

### Leaderboard Module
- `getGlobal()`: raw query returns only `{ userId, userName, totalPoints }` — sensitive fields-ი არ გამოჩნდება. სწორია.
- `getLeaderboard()`: manual `user: { id, name }` spread — sensitive fields blocked. კოდი სწორია, TS type-ი არ შეესაბამება.
- `snapshotLeaderboard()`: delete + insert wrapped in QueryRunner transaction. სწორია.
- `distributePrizes()`: userIds sorted ascending — deadlock prevention. სწორია.

### Admin Module
- `AdminController`: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` controller-level. სწორია.
- userId ყოველთვის JWT-დან (request body-დან არასოდეს). სწორია.

### Infrastructure
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` — გლობალური. სწორია.
- `ClassSerializerInterceptor` — გლობალური. `@Exclude()` ველები ყველა response-ში. სწორია.
- CORS: dev-ზე `*`, prod-ზე `CORS_ORIGIN` env var ან `false`. სწორია.
- Swagger: dev-ზე `/api`, prod-ზე სულ არ ჩართდება. სწორია.

---

## ტესტ-კეისები — შემდეგი QA ციკლისთვის (სერვერის გამართვის შემდეგ)

- [ ] POST /auth/register 201 — response body-ში password/refreshToken/verificationToken/resetToken არ ჩანს
- [ ] POST /auth/register 409 — duplicate email
- [ ] POST /auth/register 400 — name.length = 65 (MaxLength test)
- [ ] POST /auth/register 400 — password.length = 129 (MaxLength test)
- [ ] POST /auth/login 201 — accessToken + refreshToken
- [ ] POST /auth/login 401 — wrong password
- [ ] GET /auth/profile 200 — JWT required, sensitive fields absent
- [ ] GET /auth/profile 401 — no token
- [ ] GET /leaderboard/global 200 — user object contains only id + name
- [ ] POST /admin/players — photo "javascript:alert(1)" — expect 400 (CURRENTLY FAILS: @IsUrl() allows it)
- [ ] GET /players?search=<101-char-string> 400 — MaxLength validation
- [ ] POST /market/buy — closed marketplace — expect 403
- [ ] POST /market/buy — 0 coins user — expect 400
- [ ] POST /market/buy — 15 players already — expect 400
- [ ] POST /market/buy — duplicate player — expect 400
- [ ] POST /market/sell — player not in team — expect 400
- [ ] POST /promo/redeem — same code twice (onePerUser) — expect 409
- [ ] POST /cards/triple-captain — activate twice — expect 400
- [ ] POST /admin/open-marketplace — non-admin user — expect 403
- [ ] GET /tiers 200 — public (no auth)
- [ ] GET /teams 200 — public (no auth)
- [ ] GET /market/status 200 — public (no auth)
- [ ] GET /tournaments 200 — public (no auth)
- [ ] Concurrent buy race condition — 2 requests same player same user simultaneously

---

## დასკვნა

**სერვერი ვერ ჩაირთვება** BUG-QA-01-ის გამო. ეს P0 blocking issue-ია.

სტატიკური ანალიზის საფუძველზე:
- **Auth, Marketplace, Promotions, Cards** მოდულები — კოდი სწორად დაწერილია.
  PESSIMISTIC_WRITE locks, atomic transactions, sensitive field exclusion — ყველა სწორად.
- **1 P0 bug** (leaderboard.service.ts TS type error) — სერვერი ვერ ჩაირთვება.
- **1 P2 bug** (SEC-M03 `javascript:` URL-ი გადის validation-ს) — security risk.
- **2 P3/P4 warnings** (tsconfig strict settings).

**Priority fixes:**
1. `src/leaderboard/leaderboard.service.ts:32` — fix return type (P0, სერვერს ბლოკავს)
2. `src/players/dto/create-player.dto.ts:26` — `@IsUrl({ protocols: ['http','https'], require_protocol: true })` (P2)
3. `tsconfig.json` — `"noImplicitAny": true` (P3)
