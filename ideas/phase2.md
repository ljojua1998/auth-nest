# Phase 2 — Fantasy Core
> Phase 2, 3, 4, 5 ერთ session-ში. თარიღი: 2026-05-01

---

## რა გაკეთდა

### Phase 2 — Fantasy Core

**Transactions Module** (`src/transactions/`)
- `Transaction` entity: type (enum), amount, balanceBefore, balanceAfter, description, userId
- `TransactionsService.log(manager, ...)` — EntityManager-ით გამოიყენება QueryRunner-ში
- `GET /transactions/me` — JWT, ბოლო transactions ისტორია

**User Teams Module** (`src/user-teams/`)
- `UserTeam` entity: OneToOne→User, formation, captainId, tripleCaptainActive
- `UserTeamPlayer` entity: isStarter, subOrder(1-4), ManyToOne→UserTeam, ManyToOne→Player
- `UserTeamHistory` entity: action(buy/sell/elimination_removed), coinAmount, playerName
- Position limits: GK≤2, DEF≤5, MID≤5, FWD≤3
- Formation validation: "4-3-3" → 4DEF+3MID+3FWD (11 starters)
- `GET /my-team`, `POST /my-team/formation`, `POST /my-team/captain`, `POST /my-team/lineup`, `GET /my-team/history`

**Marketplace Module** (`src/marketplace/`)
- `MarketplaceStatus` entity: singleton (id=1), isOpen, openedAt, closedAt
- `buy(userId, playerId)`: marketplace open check → team size ≤15 → duplicate check → position limit → PESSIMISTIC_WRITE lock → Coin deduct → add to team → log history + transaction
- `sell(userId, playerId)`: marketplace open → player in team check → PESSIMISTIC_WRITE → Coin refund → remove from team → clear captain if sold
- `GET /market`, `GET /market/status`, `POST /market/buy`, `POST /market/sell`

**Cards Module** (`src/cards/`)
- `UserCard` entity: type(triple_captain/wildcard/limitless), used, usedAt, usedInTournamentId
- 3 Cards გაიცემა `auth.service.register()`-ზე ავტომატურად
- `GET /cards`, `POST /cards/triple-captain`, `POST /cards/wildcard`, `POST /cards/limitless`

### Phase 3 — Tournament & Scoring

**Tournaments Module** (`src/tournaments/`)
- `Tournament` entity: name, stage(enum), status(upcoming/active/completed), startDate, endDate
- `GET /tournaments`, `GET /tournaments/current`, `GET /tournaments/:id`
- `POST /admin/tournaments` (Admin)

**Matches Module** (`src/matches/`)
- `Match` entity: apiFootballId, status(scheduled/live/finished), homeScore, awayScore, kickoff, statsCalculated
- `MatchStat` entity: minutes, goals, assists, cleanSheet, yellowCards, redCards, saves, penaltySaved, penaltyMissed, penaltyEarned, penaltyConceded, ownGoals, tackles, goalsConceded, rawApiData(jsonb)
- `UserMatchScore` entity: totalPoints, breakdown(jsonb), userId, matchId, tournamentId
- `GET /matches`, `GET /matches/live`, `GET /matches/:id`, `GET /matches/:id/stats`

**Scoring Engine** (`src/scoring/`)
- სრული ქულების სქემა პოზიციის მიხედვით:
  - appearance +1, 60min +1
  - GK/DEF goal +6, MID goal +5, FWD goal +4
  - assist +3, cleanSheet(60+min): GK/DEF +4, MID +1
  - GK: saves/3=+1, penaltySaved +5
  - GK/DEF: goalsConceded/2=-1
  - penaltyEarned +2, penaltyConceded -1, penaltyMissed -2
  - yellow -1, red -3, doubleYellow -1, ownGoal -2, tackles/3=+1
- Auto-substitution: starter 0min → same-position sub ჩადგება
- Captain x2, Triple Captain x3 (card check)
- `POST /admin/calculate-points/:matchId`

**Leaderboard Module** (`src/leaderboard/`)
- `LeaderboardSnapshot` entity: rank, totalPoints, prizeCoins, userId, tournamentId
- Tie-break: ერთი prize pool ≡ თანაბარ rank-ებს → prize/count
- Prize: 1st=1M, 2nd=900k, 3rd=800k, 4th=700k, 5th=600k
- `GET /leaderboard/:tournamentId`, `GET /leaderboard/global`

### Phase 4 — Operations

**Admin Module** (`src/admin/`)
- `POST /admin/open-marketplace`
- `POST /admin/close-marketplace`
- `POST /admin/calculate-points/:matchId`
- `POST /admin/snapshot-leaderboard/:tournamentId`
- `POST /admin/distribute-prizes/:tournamentId`
- `POST /admin/process-elimination/:teamId` — ATOMIC: ამოშლა + Coin refund + transaction log
- `POST /admin/activate-tournament/:tournamentId`
- `POST /admin/complete-tournament/:tournamentId`
- `POST /admin/match-status/:matchId`

### Phase 5 — Promotions & Polish

**Promotions Module** (`src/promotions/`)
- `PromoCode` entity: code(unique), type, bonusCoins, maxUses, usedCount, onePerUser, isActive, expiresAt
- `PromoRedemption` entity: userId, promoCodeId, redeemedAt
- 3-layer validation: isActive → expiresAt → maxUses → onePerUser(DB level)
- PESSIMISTIC_WRITE lock on Coin balance
- `POST /promo/redeem`, `GET /promo/my-redemptions`
- `POST/GET/PATCH/DELETE /admin/promo`

**main.ts განახლება:**
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
- Swagger path: `/api`, title: WorldFantasy API
- `app.enableCors()`

**Rate Limiting (`@nestjs/throttler`):**
- Global: 10 req/sec, 100 req/min
- ყველა endpoint-ზე გამოიყენება

---

## ფაილების სტრუქტურა

```
src/
├── admin/              ✨ ახალი (Phase 4)
├── cards/              ✨ ახალი (Phase 2)
├── leaderboard/        ✨ ახალი (Phase 3)
├── marketplace/        ✨ ახალი (Phase 2)
├── matches/            ✨ ახალი (Phase 3)
├── promotions/         ✨ ახალი (Phase 5)
├── scoring/            ✨ ახალი (Phase 3)
├── tournaments/        ✨ ახალი (Phase 3)
├── transactions/       ✨ ახალი (Phase 2)
└── user-teams/         ✨ ახალი (Phase 2)
```

---

## DB ცვლილებები

| ცხრილი | სტატუსი |
|--------|---------|
| `transactions` | ✨ ახალი |
| `user_teams` | ✨ ახალი |
| `user_team_players` | ✨ ახალი |
| `user_team_history` | ✨ ახალი |
| `marketplace_status` | ✨ ახალი |
| `user_cards` | ✨ ახალი |
| `tournaments` | ✨ ახალი |
| `matches` | ✨ ახალი |
| `match_stats` | ✨ ახალი |
| `user_match_scores` | ✨ ახალი |
| `leaderboard_snapshots` | ✨ ახალი |
| `promo_codes` | ✨ ახალი |
| `promo_redemptions` | ✨ ახალი |

---

## QA — გასატესტი სია

### Phase 2: Registration Flow
- [ ] `POST /auth/register` → response-ში user object
- [ ] `GET /cards` (ახალი user) → 3 Card (triple_captain, wildcard, limitless), ყველა `used: false`
- [ ] `GET /my-team` (ახალი user) → ცარიელი გუნდი, formation: "4-3-3"

### Phase 2: Marketplace
- [ ] `GET /market/status` → `isOpen: false` (default)
- [ ] `POST /market/buy` → 403 Forbidden ("Marketplace დახურულია")
- [ ] `POST /admin/open-marketplace` → `isOpen: true`
- [ ] `POST /market/buy` (playerId: 1) → player გუნდში, coins შემცირდა
- [ ] `POST /market/buy` (იგივე player) → 400 "უკვე გუნდშია"
- [ ] `POST /market/buy` (3-ე GK) → 400 "GK ≤ 2"
- [ ] `POST /market/buy` (15 player-ის შემდეგ) → 400 "გუნდი სავსეა"
- [ ] `POST /market/buy` (Coin-ზე ძვირი player) → 400 "არასაკმარისი Coin"
- [ ] `POST /market/sell` (player არ არის გუნდში) → 400
- [ ] `POST /market/sell` (captain) → captain null-ად გახდება
- [ ] `GET /transactions/me` → buy/sell transactions ჩანს

### Phase 2: My Team
- [ ] `POST /my-team/formation` body: `{"formation":"4-3-3"}` → განახლდა
- [ ] `POST /my-team/formation` body: `{"formation":"2-5-4"}` → 400 "არასწორი ფორმაცია"
- [ ] `POST /my-team/captain` (sub player) → 400 "კაპიტანი Starter უნდა იყოს"
- [ ] `POST /my-team/lineup` 15-ზე ნაკლებ ფეხბ. → 400
- [ ] `POST /my-team/lineup` 12 starters + 3 subs → 400 "Starter 11 უნდა იყოს"
- [ ] `GET /my-team/history` → buy/sell history

### Phase 2: Cards
- [ ] `POST /cards/triple-captain` `{"tournamentId":1}` → used: true
- [ ] `POST /cards/triple-captain` ხელმეორედ → 400 "უკვე გამოყენებული"

### Phase 3: Tournaments & Matches
- [ ] `POST /admin/tournaments` → ეტაპი შეიქმნა
- [ ] `POST /admin/activate-tournament/1` → status: "active"
- [ ] `GET /tournaments/current` → active tournament
- [ ] `GET /matches/live` → ცარიელი სია (live-ების გარეშე)

### Phase 3: Scoring
- [ ] `POST /admin/calculate-points/:matchId` (match not finished) → 400
- [ ] `POST /admin/calculate-points/:matchId` (match finished) → processed count
- [ ] `GET /leaderboard/1` → top100 + myRank
- [ ] `GET /leaderboard/global` → ჯამური ქულები

### Phase 4: Admin Operations
- [ ] `POST /admin/process-elimination/:teamId` → eliminated: true + Coin refund
- [ ] `POST /admin/snapshot-leaderboard/1` → snapshot შეიქმნა
- [ ] `POST /admin/distribute-prizes/1` → top 5-ს Coin დაერიცხა
- [ ] Admin endpoints user JWT-ით → 403

### Phase 5: Promotions
- [ ] `POST /admin/promo` `{"code":"TEST","bonusCoins":50000}` → promo შეიქმნა
- [ ] `POST /promo/redeem` `{"code":"TEST"}` → 50000 Coin დაერიცხა
- [ ] `POST /promo/redeem` ხელმეორედ → 409 "უკვე გამოყენებული"
- [ ] `POST /promo/redeem` ვადაგასული კოდი → 400
- [ ] `POST /promo/redeem` maxUses ამოწურული → 400
- [ ] `GET /transactions/me` → promo transaction ჩანს

### Phase 5: Rate Limiting
- [ ] 11 request/sec-ში → 429 Too Many Requests
- [ ] 101 request/min-ში → 429

### Known Edge Cases
- [ ] Coin bigint DB-დან string-ად — `Number()` კონვერტაცია LeaderboardService-ში
- [ ] `marketplace_status` singleton — ორჯერ open-ის გამოძახება → idempotent
- [ ] `user_team_players` — cascade delete UserTeam-ის წაშლისას
- [ ] `calculateMatchPoints` re-run → existing scores UPDATE-ს (არა duplicate)
- [ ] Tie-break prize: 2 user პირველ ადგილზე → (1M+900k)/2=950k თითოეულს
- [ ] Triple Captain activated კი, მაგრამ სხვა tournament-ზე → x2 (არა x3)
- [ ] Promo code UPPERCASE validation — lowercase-ი → 400
