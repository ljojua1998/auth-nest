# WorldFantasy — Build Plan

> ქართული Fantasy Football პლატფორმა World Cup 2026-ისთვის
> Backend: NestJS + TypeORM + PostgreSQL (Railway)
> Deadline: ივნისი 11, 2026

---

## Implementation Status (2026-05-03)

**სრულად დასრულებული:** Sprint 1–5 + QA rounds 1&2 + Security audit + Referral system + Railway deploy

### Endpoint Status

| Endpoint | სტატუსი |
|----------|---------|
| POST /auth/register | DONE |
| POST /auth/login | DONE |
| POST /auth/refresh | DONE |
| POST /auth/logout | DONE |
| GET /auth/profile | DONE |
| GET /users/me | DONE |
| PATCH /users/me | DONE |
| GET /users/me/referral | DONE |
| GET /tiers | DONE |
| POST /admin/tiers | DONE |
| PATCH /admin/tiers/:id | DONE |
| DELETE /admin/tiers/:id | DONE |
| POST /admin/tiers/seed | DONE |
| GET /teams | DONE |
| GET /teams/:id | DONE |
| GET /teams/:id/players | DONE |
| POST /admin/teams/seed | DONE (48 teams, groups A-L) |
| POST /admin/teams/sync | TODO (API-Football paid plan) |
| GET /players | DONE |
| GET /players/:id | DONE |
| GET /players/:id/stats | DONE |
| POST /admin/players | DONE |
| PATCH /admin/players/:id | DONE |
| POST /admin/players/seed-top5 | DONE |
| POST /admin/players/sync-details | TODO (API-Football paid plan) |
| GET /market | DONE |
| GET /market/status | DONE |
| POST /market/buy | DONE |
| POST /market/sell | DONE |
| GET /my-team | DONE |
| POST /my-team/formation | DONE |
| POST /my-team/captain | DONE |
| POST /my-team/lineup | DONE |
| GET /my-team/history | DONE |
| GET /cards | DONE |
| POST /cards/triple-captain | DONE |
| POST /cards/wildcard | DONE |
| POST /cards/limitless | DONE |
| GET /tournaments | DONE |
| GET /tournaments/current | DONE |
| GET /matches | DONE |
| GET /matches/:id | DONE |
| GET /matches/live | DONE |
| GET /leaderboard/:tournamentId | DONE |
| GET /leaderboard/global | DONE |
| GET /transactions/me | DONE |
| POST /promo/redeem | DONE |
| GET /promo/my-redemptions | DONE |
| POST /admin/promo | DONE |
| GET /admin/promo | DONE |
| PATCH /admin/promo/:id | DONE |
| DELETE /admin/promo/:id | DONE |
| POST /admin/open-marketplace | DONE |
| POST /admin/close-marketplace | DONE |
| POST /admin/calculate-points/:matchId | DONE |
| POST /admin/process-elimination/:teamId | DONE |
| POST /admin/distribute-prizes/:tournamentId | DONE |
| POST /admin/snapshot-leaderboard/:tournamentId | DONE |
| POST /admin/activate-tournament/:tournamentId | DONE |
| POST /admin/complete-tournament/:tournamentId | DONE |
| POST /admin/match-status/:matchId | DONE |
| POST /admin/matches | DONE |
| POST /admin/matches/:matchId/stats | DONE |
| POST /admin/sync-match-stats/:matchId | TODO (API-Football paid plan) |

### DB Migrations

| # | Migration | სტატუსი |
|---|-----------|---------|
| 001 | InitialSchema | RUN |
| 002 | AddUniqueConstraints | RUN |
| 003 | PromoRedemptionUniqueConstraint | RUN |
| 004 | AddReferralCode | RUN |
| 005 | AddMissingIndexes | RUN |
| 006 | AddPlayerFields (age/number/birthDate/...) | TODO |

### Player Data

| | |
|-|-|
| სულ ფეხბ. | 1,739 |
| სულ ნაკრები DB-ში | 82 (48 WC + UEFA qualifiers) |
| Superstar tier | 23 |
| Strong tier | 725 |
| Average tier | 723 |
| Reserve tier | 268 |
| მკლოდ IRL squad | 1 (API limit hit) |

---

## Cleanup (auth-nest-დან)

- [ ] `src/products/` — წაშლა
- [ ] `src/cart/` — წაშლა
- [ ] `src/orders/` — წაშლა
- [ ] `app.module.ts` — წაშლილი მოდულების imports გასუფთავება

---

## Sprint 1 — Foundation

### 1.1 Users Refactor

- [ ] `users/entities/user.entity.ts` — +`coins` (default: 1,000,000), +`role` (admin/user)
- [ ] `users/users.service.ts` — +`addCoins`, +`deductCoins` მეთოდები
- [ ] `auth/auth.service.ts` — რეგისტრაციისას 1,000,000 Coin მინიჭება
- [ ] `common/guards/roles.guard.ts` — RolesGuard შექმნა
- [ ] `common/decorators/roles.decorator.ts` — @Roles() დეკორატორი

### 1.2 Tiers Module

- [ ] `tiers/entities/tier.entity.ts`
  - `id`, `name`, `coinPrice`, `createdAt`
- [ ] `tiers/tiers.module.ts`
- [ ] `tiers/tiers.service.ts` — CRUD
- [ ] `tiers/tiers.controller.ts`
  - `GET /tiers` — Public
  - `POST /admin/tiers` — Admin
  - `PATCH /admin/tiers/:id` — Admin
  - `DELETE /admin/tiers/:id` — Admin
- [ ] `tiers/dto/create-tier.dto.ts`
- [ ] `tiers/dto/update-tier.dto.ts`
- [ ] Seed: Superstar(150k), Strong(110k), Average(80k), Backup(55k), Reserve(35k)

### 1.3 Teams Module (ნაკრებები)

- [ ] `teams/entities/team.entity.ts`
  - `id`, `name`, `code`, `flag`, `group`, `eliminated` (default: false)
- [ ] `teams/teams.module.ts`
- [ ] `teams/teams.service.ts`
- [ ] `teams/teams.controller.ts`
  - `GET /teams` — Public
  - `GET /teams/:id` — Public
  - `GET /teams/:id/players` — Public
  - `POST /admin/teams/sync` — Admin (API-Football)
- [ ] `teams/dto/create-team.dto.ts`

### 1.4 Players Module

- [ ] `players/entities/player.entity.ts`
  - `id`, `name`, `position` (GK/DEF/MID/FWD), `photo`
  - `apiFootballId` (external ID)
  - Relations: `team` (ManyToOne), `tier` (ManyToOne)
- [ ] `players/players.module.ts`
- [ ] `players/players.service.ts`
- [ ] `players/players.controller.ts`
  - `GET /players` — Public (filters: position, tier, team, search)
  - `GET /players/:id` — Public
  - `GET /players/:id/stats` — Public
  - `POST /admin/players/sync` — Admin
  - `PATCH /admin/players/:id` — Admin (Tier-ის შეცვლა)
- [ ] `players/dto/`

### 1.5 Seed Scripts

- [ ] `tiers` seed (5 Tier)
- [ ] `teams` seed (32 World Cup ნაკრები)
- [ ] `players` seed (test data — API-Football-მდე)

---

## Sprint 2 — Fantasy Core

### 2.1 User Teams Module

- [ ] `user-teams/entities/user-team.entity.ts`
  - `id`, `formation` (e.g. "4-3-3")
  - `captainId`, `tripleCaptainActive` (bool)
  - Relations: `user` (OneToOne), `players` (ManyToMany with extras)
- [ ] `user-teams/entities/user-team-player.entity.ts`
  - `id`, `slot` (1-15), `isStarter` (bool), `subOrder` (1-4)
  - Relations: `userTeam`, `player`
- [ ] `user-teams/entities/user-team-history.entity.ts`
  - `id`, `action` (buy/sell), `coinAmount`, `createdAt`
  - Relations: `user`, `player`
- [ ] `user-teams/user-teams.module.ts`
- [ ] `user-teams/user-teams.service.ts`
  - `getMyTeam(userId)`
  - `setFormation(userId, formation)`
  - `setCaptain(userId, playerId)`
  - `setLineup(userId, lineup[])` — starter/sub განლაგება
  - `getHistory(userId)`
- [ ] `user-teams/user-teams.controller.ts`
  - `GET /my-team`
  - `POST /my-team/formation`
  - `POST /my-team/captain`
  - `POST /my-team/lineup`
  - `GET /my-team/history`

### 2.2 Marketplace Module

- [ ] `marketplace/marketplace.module.ts`
- [ ] `marketplace/marketplace.service.ts`
  - `getStatus()` — ღია/დახურული
  - `getAvailablePlayers(filters)` — marketplace-ზე
  - `buy(userId, playerId)` — Coin დაჭრა + გუნდში დამატება
  - `sell(userId, playerId)` — Coin დამატება + გუნდიდან ამოშლა
  - Row-level lock (PESSIMISTIC_WRITE) Coin ბალანსზე
  - ATOMIC transactions
- [ ] `marketplace/marketplace.controller.ts`
  - `GET /market` — Public
  - `GET /market/status` — Public
  - `POST /market/buy` — JWT
  - `POST /market/sell` — JWT
- [ ] `marketplace/entities/marketplace-status.entity.ts`
  - `id`, `isOpen` (bool), `openedAt`, `closedAt`
- [ ] ვალიდაცია: 15 ფეხბ. ლიმიტი, Coin ბალანსი, ფორმაციის rule-ები

### 2.3 Cards Module

- [ ] `cards/entities/user-card.entity.ts`
  - `id`, `type` (triple_captain/wildcard/limitless)
  - `used` (bool), `usedAt`, `usedInTournamentId`
  - Relations: `user` (ManyToOne)
- [ ] `cards/cards.module.ts`
- [ ] `cards/cards.service.ts`
  - `getMyCards(userId)`
  - `activateTripleCaptain(userId, tournamentId)`
  - `activateWildcard(userId, tournamentId)`
  - `activateLimitless(userId, tournamentId)`
  - Cards-ის გაცემა რეგისტრაციისას (3 card)
- [ ] `cards/cards.controller.ts`
  - `GET /cards`
  - `POST /cards/triple-captain`
  - `POST /cards/wildcard`
  - `POST /cards/limitless`

---

## Sprint 3 — Tournament & Scoring

### 3.1 Tournaments Module

- [ ] `tournaments/entities/tournament.entity.ts`
  - `id`, `name` (Group Stage / R32 / R16...), `stage`
  - `status` (upcoming/active/completed)
  - `startDate`, `endDate`
- [ ] `tournaments/tournaments.module.ts`
- [ ] `tournaments/tournaments.service.ts`
  - `getAll()`
  - `getCurrent()`
- [ ] `tournaments/tournaments.controller.ts`
  - `GET /tournaments`
  - `GET /tournaments/current`

### 3.2 Matches Module

- [ ] `matches/entities/match.entity.ts`
  - `id`, `apiFootballId`, `homeTeam`, `awayTeam`
  - `homeScore`, `awayScore`, `status` (scheduled/live/finished)
  - `kickoff`, `tournamentStage`
  - Relations: `tournament`, `homeTeamEntity`, `awayTeamEntity`
- [ ] `matches/entities/match-stat.entity.ts`
  - `id`, `minutes`, `goals`, `assists`, `cleanSheet` (bool)
  - `yellowCards`, `redCards`, `saves`, `penaltySaved`
  - `penaltyMissed`, `ownGoals`, `penaltyEarned`, `penaltyConceded`
  - `tackles` (for bonus), `rawApiData` (JSON)
  - Relations: `match`, `player`
- [ ] `matches/matches.module.ts`
- [ ] `matches/matches.service.ts`
- [ ] `matches/matches.controller.ts`
  - `GET /matches`
  - `GET /matches/:id`
  - `GET /matches/live`

### 3.3 Scoring Engine

- [ ] `scoring/scoring.module.ts`
- [ ] `scoring/scoring.service.ts`
  - `calculatePoints(matchStatId)` — ქულების სქემა სრულად:
    - მონაწილეობა: +1
    - 60+ წუთი: +1
    - გოლი: GK/DEF+6, MID+5, FWD+4
    - ასისტი: +3
    - Clean Sheet 60+წთ: GK/DEF+4, MID+1
    - სეივი x3: +1 (GK)
    - პენალტის მოგერიება: +5 (GK)
    - გაშვებული გოლი x2: -1 (GK/DEF)
    - გამომუშავებული პენ.: +2
    - მიღებული პენ.: -1
    - გაცუდ. პენ.: -2
    - ყვითელი: -1
    - წითელი: -3
    - 2ყვ.+წით.: -4
    - ავტოგოლი: -2
    - წარმ. დაცვა x3: +1
  - Captain multiplier (x2 ან x3 Triple Captain)
  - Auto-substitution logic
- [ ] `scoring/entities/user-match-score.entity.ts`
  - `id`, `totalPoints`, `breakdown` (JSON)
  - Relations: `user`, `match`, `tournament`

### 3.4 Leaderboard Module

- [ ] `leaderboard/entities/leaderboard-snapshot.entity.ts`
  - `id`, `rank`, `totalPoints`, `prizeCoins`
  - Relations: `user`, `tournament`
- [ ] `leaderboard/leaderboard.module.ts`
- [ ] `leaderboard/leaderboard.service.ts`
  - `getLeaderboard(tournamentId)` — Top 100 + own rank
  - `getGlobal()` — საბოლოო ჯამი
  - `snapshotLeaderboard(tournamentId)` — ფიქსაცია
- [ ] `leaderboard/leaderboard.controller.ts`
  - `GET /leaderboard/:tournamentId`
  - `GET /leaderboard/global`

---

## Sprint 4 — Operations

### 4.1 Transactions Module

- [ ] `transactions/entities/transaction.entity.ts`
  - `id`, `type` (buy/sell/prize/promo/registration)
  - `amount` (Coin), `balanceBefore`, `balanceAfter`
  - `description`, `createdAt`
  - Relations: `user`
- [ ] `transactions/transactions.module.ts`
- [ ] `transactions/transactions.service.ts`
  - `log(userId, type, amount, description)` — ყველა Coin ოპერაცია
  - `getMyHistory(userId)`
- [ ] `transactions/transactions.controller.ts`
  - `GET /transactions/me`

### 4.2 Admin Module (Operations)

- [ ] `admin/admin.module.ts`
- [ ] `admin/admin.controller.ts` — ყველა Admin endpoint
- [ ] `admin/services/match-sync.service.ts`
  - `syncMatchStats(matchId)` — API-Football → DB
- [ ] `admin/services/elimination.service.ts`
  - `processElimination(teamId)` — ფეხბ. ამოშლა + Coin დაბრუნება
- [ ] `admin/services/prize-distribution.service.ts`
  - `distributePrizes(tournamentId)` — Top 5 Coin Prize
  - Tie-break: prize საშუალო
- [ ] `admin/services/marketplace-control.service.ts`
  - `openMarketplace()` / `closeMarketplace()`

### 4.3 API-Football Integration

- [ ] `integrations/api-football/api-football.module.ts`
- [ ] `integrations/api-football/api-football.service.ts`
  - `getMatchStats(matchId)`
  - `getPlayers(teamId)`
  - `getMatches(tournamentId)`
  - axios-ით + retry logic
  - Rate limit-ის მართვა

---

## Sprint 5 — Promotions & Polish

### 5.1 Promotions Module

- [ ] `promotions/entities/promo-code.entity.ts`
  - `id`, `code`, `bonusCoins`, `maxUses`, `usedCount`
  - `onePerUser` (bool), `expiresAt`, `isActive`
  - `type` (campaign/referral/event)
- [ ] `promotions/entities/promo-redemption.entity.ts`
  - `id`, `redeemedAt`
  - Relations: `user`, `promoCode`
- [ ] `promotions/promotions.module.ts`
- [ ] `promotions/promotions.service.ts`
  - `redeem(userId, code)` — ვალიდაცია + Coin + Transaction log
  - `getMyRedemptions(userId)`
- [ ] `promotions/promotions.controller.ts`
  - `POST /promo/redeem`
  - `GET /promo/my-redemptions`
  - `POST /admin/promo`
  - `GET /admin/promo`
  - `PATCH /admin/promo/:id`
  - `DELETE /admin/promo/:id`
- [ ] First Login Bonus: +50,000 Coin (რეგისტრაციისას)

### 5.2 Common / Infrastructure

- [ ] `common/guards/roles.guard.ts`
- [ ] `common/decorators/roles.decorator.ts`
- [ ] `common/interceptors/transaction.interceptor.ts`
- [ ] `common/utils/coin.utils.ts`
- [ ] `@nestjs/throttler` — Rate limiting კონფიგურაცია
- [ ] Global error handling (filters)

### 5.3 Swagger

- [ ] ყველა endpoint Swagger-ში დოკუმენტირება
- [ ] DTO-ების @ApiProperty() დეკორატორები
- [ ] Bearer Auth კონფიგურაცია Swagger-ში

---

## Sprint 6 — Beta

- [ ] 10-20 მეგობრით ტესტი
- [ ] Bug fixes
- [ ] Performance tuning
- [ ] Render.com deploy

---

## API Endpoints — სრული სია

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | No | რეგისტრაცია + 1M Coin |
| POST | /auth/login | No | Login |
| POST | /auth/refresh | No | Token განახლება |
| POST | /auth/logout | JWT | Logout |
| GET | /auth/profile | JWT | პროფილი |
| GET | /users/me | JWT | Coin balance + stats |
| PATCH | /users/me | JWT | პროფილი განახლება |
| GET | /tiers | No | ყველა Tier |
| POST | /admin/tiers | Admin | ახალი Tier |
| PATCH | /admin/tiers/:id | Admin | Tier განახლება |
| DELETE | /admin/tiers/:id | Admin | Tier წაშლა |
| GET | /teams | No | ყველა ნაკრები |
| GET | /teams/:id | No | ნაკრების დეტალები |
| GET | /teams/:id/players | No | ნაკრების ფეხბ. |
| POST | /admin/teams/sync | Admin | API-Football sync |
| GET | /players | No | ყველა ფეხბ. (filters) |
| GET | /players/:id | No | ფეხბ. დეტალები |
| GET | /players/:id/stats | No | ფეხბ. სტატისტიკა |
| POST | /admin/players/sync | Admin | API-Football sync |
| PATCH | /admin/players/:id | Admin | Tier შეცვლა |
| GET | /market | No | Marketplace ფეხბ. |
| GET | /market/status | No | ღია/დახურული |
| POST | /market/buy | JWT | ფეხბ. ყიდვა |
| POST | /market/sell | JWT | ფეხბ. გაყიდვა |
| GET | /my-team | JWT | ჩემი გუნდი |
| POST | /my-team/formation | JWT | ფორმაცია |
| POST | /my-team/captain | JWT | კაპიტანი |
| POST | /my-team/lineup | JWT | Starter/Sub |
| GET | /my-team/history | JWT | Transfer ისტორია |
| GET | /cards | JWT | ჩემი Cards |
| POST | /cards/triple-captain | JWT | Triple Captain |
| POST | /cards/wildcard | JWT | Wildcard |
| POST | /cards/limitless | JWT | Limitless |
| GET | /tournaments | No | ყველა ეტაპი |
| GET | /tournaments/current | No | მიმდინარე ეტაპი |
| GET | /matches | No | მატჩები |
| GET | /matches/:id | No | მატჩის დეტ. |
| GET | /matches/live | No | Live მატჩები |
| GET | /leaderboard/:tournamentId | JWT | ეტაპის Leaderboard |
| GET | /leaderboard/global | JWT | Global Leaderboard |
| GET | /transactions/me | JWT | Coin ისტორია |
| POST | /promo/redeem | JWT | Promo Code |
| GET | /promo/my-redemptions | JWT | ჩემი კოდები |
| POST | /admin/promo | Admin | ახალი Promo |
| GET | /admin/promo | Admin | ყველა Promo |
| PATCH | /admin/promo/:id | Admin | Promo განახლება |
| DELETE | /admin/promo/:id | Admin | Promo წაშლა |
| POST | /admin/sync-match-stats | Admin | სტატისტიკა sync |
| POST | /admin/calculate-points | Admin | ქულების დარიცხვა |
| POST | /admin/process-elimination | Admin | გავარდნ. ამოშლა |
| POST | /admin/distribute-prizes | Admin | Coin Prize |
| POST | /admin/open-marketplace | Admin | Market გახსნა |
| POST | /admin/close-marketplace | Admin | Market დახურვა |
| POST | /admin/snapshot-leaderboard | Admin | Leaderboard ფიქს. |

---

## Database Entities

| Entity | Status | Description |
|--------|--------|-------------|
| `users` | Refactor | +coins, +role |
| `tiers` | New | ფეხბ. ფასები |
| `teams` | New | ნაკრებები |
| `players` | New | ფეხბურთელები |
| `user_teams` | New | იუზერის გუნდი |
| `user_team_players` | New | 15 ფეხბ. + slot/isStarter |
| `user_team_history` | New | Transfer ისტორია |
| `user_cards` | New | Wildcard/Limitless/TC |
| `marketplace_status` | New | ღია/დახურული |
| `tournaments` | New | 7 ეტაპი |
| `matches` | New | მატჩები |
| `match_stats` | New | ფეხბ. სტატ. მატჩზე |
| `user_match_scores` | New | იუზ. ქულები მატჩზე |
| `leaderboard_snapshots` | New | ეტაპ. Leaderboard |
| `transactions` | New | Coin audit log |
| `promo_codes` | New | Promo კოდები |
| `promo_redemptions` | New | ვინ გამოიყენა |
| `products` | Delete | — |
| `cart_items` | Delete | — |
| `orders` | Delete | — |
| `order_items` | Delete | — |

---

## Critical Rules

- ყველა Coin ოპერაცია → `transactions` ცხრილში
- Marketplace buy/sell → PESSIMISTIC_WRITE lock
- Coin ბალანსი ვერ წავა მინუსში (3 layer validation)
- Scoring → 2 საათიანი re-sync window მატჩის შემდეგ
- Cards — ერთჯერადი მთელ ტურნირზე

---

## Tech Stack

| Package | Status | Use |
|---------|--------|-----|
| @nestjs/common, core | ✅ | Framework |
| typeorm, @nestjs/typeorm | ✅ | ORM |
| pg | ✅ | PostgreSQL |
| @nestjs/jwt, passport-jwt | ✅ | Auth |
| @nestjs/swagger | ✅ | Docs |
| class-validator | ✅ | DTO validation |
| bcryptjs | ✅ | Password hash |
| socket.io | ✅ | WebSocket (News) |
| @google/generative-ai | ✅ | News AI |
| axios | ➕ Add | API-Football |
| @nestjs/throttler | ➕ Add | Rate limiting |
| @nestjs/schedule | ➕ Later | Cron jobs |
