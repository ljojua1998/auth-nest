# Bugs Report — Phase 2-5 (QA Round 2)
> QA Code Review განახლება. თარიღი: 2026-05-02

---

## სტატუსი

| კატეგორია | რაოდენობა |
|-----------|----------|
| CRITICAL 🔴 | 5 |
| HIGH 🟠 | 7 |
| MEDIUM 🟡 | 9 |
| LOW 🟢 | 7 |
| **სულ** | **28** |

---

## CRITICAL 🔴

### BUG-C01: `marketplace.service.ts sell()` — UserTeam ჩატვირთვა Transaction-ის გარეთ + Lock გარეშე (TOCTOU)
- **ფაილი:** `src/marketplace/marketplace.service.ts` (line 179)
- **პრობლემა:** `sell()` method-ში `UserTeam` ჩატვირთვა ხდება `queryRunner.manager.findOne(UserTeam, { where: { userId } })` — **`pessimistic_write` lock გარეშე**. ორი parallel sell request ერთი და იმავე ფეხბ.-ზე ამავე user-ისგან:
  1. ორივე reads UserTeam without lock
  2. ორივე finds `utpEntry` (TOCTOU)
  3. ორივე deletes `UserTeamPlayer` row — მეორე delete no-op-ი ხდება სიჩუმით (FK cascade)
  4. ორივე coin-ებს უმატებს (PESSIMISTIC_WRITE lock user-ზე — ეს lock გადარჩება, მაგრამ UTPs delete double-ს გაივლის)
- **შედეგი:** ფეხბ. გაიყიდება, მეორე request-ი კი `utpEntry null`-ს ვერ დაიჭერს (delete უკვე მოხდა) — `BadRequestException` გაისვრება. User coins-ს ერთხელ მიიღებს (user lock მუშაობს), მაგრამ captain reset-ი (line 198-200) შეიძლება ორჯერ გაეშვას. **ნაკლები სერიოზული ვარიანტი**, მაგრამ race window ღიაა.
- **Fix:** UserTeam-ზე `pessimistic_write` lock დაამატე:
```typescript
const currentTeam = await queryRunner.manager.findOne(UserTeam, {
  where: { userId },
  lock: { mode: 'pessimistic_write' },
});
```

---

### BUG-C02: `cards.service.ts activateCard()` — Race Condition, Check-Then-Act Without Transaction
- **ფაილი:** `src/cards/cards.service.ts` (lines 44-59)
- **პრობლემა:** `activateCard()` method-ი:
  1. `findOne(card)` — checks `card.used === false`
  2. `card.used = true` + `save(card)` — updates

  ეს ორი ოპერაცია **transaction-ის გარეთ** ხდება, lock-ის გარეშე. ორი parallel request ერთი და იმავე card-ის activation-ზე:
  - ორივე reads `card.used = false` ✓
  - ორივე saves `used = true`
  - card **ორჯერ "activate"-ვდება** (ორჯერ `save()` ერთი row-ის) — ეს TypeORM-ში last write wins. გარეგნულად "მუშაობს", მაგრამ ორი request-ი ორივე `200 OK`-ს დააბრუნებს — user გადაწყვეტილებებს ორ სხვადასხვა tournament-ზე გაიყოფს.
  - **გარე სცენარი:** Triple Captain card-ი `tournamentId=1`-ზე და `tournamentId=2`-ზე ერთდროულად activation. Last write wins — `usedInTournamentId` ერთ-ერთ tournament-ს მიუთითებს, scoring-ზე მხოლოდ ერთ tournament-ზე x3 ეფექტი.
- **შედეგი:** Card ორი სხვადასხვა tournament-ზე "გამოყენდება" — scoring inconsistency.
- **Fix:** Transaction + pessimistic_write lock:
```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
try {
  const card = await queryRunner.manager.findOne(UserCard, {
    where: { userId, type },
    lock: { mode: 'pessimistic_write' },
  });
  if (!card || card.used) throw ...;
  card.used = true; card.usedAt = new Date(); card.usedInTournamentId = dto.tournamentId;
  await queryRunner.manager.save(UserCard, card);
  await queryRunner.commitTransaction();
} catch { await queryRunner.rollbackTransaction(); throw err; }
finally { await queryRunner.release(); }
```

---

### BUG-C03: `scoring.service.ts calculateMatchPoints()` — N+1 Query: `userScoresRepo.findOne()` Inside Loop
- **ფაილი:** `src/scoring/scoring.service.ts` (lines 174-192)
- **პრობლემა:** `for (const team of allUserTeams)` loop-ის შიგნით ყოველ iteration-ზე:
```typescript
const existing = await this.userScoresRepo.findOne({
  where: { userId: team.userId, matchId },
});
```
ეს **ყოველი user-ისთვის ცალ-ცალკე DB query**-ია. 10,000 user = 10,000 SELECT queries.
- **შედეგი:** World Cup match-ზე scoring calculation-ი minutes-ებს დასჭირდება. DB connection pool-ი ამოიწურება. Admin endpoint timeout-ს გაუშვებს (NestJS default 30s). Production scoring failure.
- **Fix:** Loop-ის **წინ** ყველა existing score-ი ერთ query-ში ჩატვირთე:
```typescript
const existingScores = await this.userScoresRepo.find({ where: { matchId } });
const existingScoreMap = new Map(existingScores.map(s => [s.userId, s]));
// loop-ში:
const existing = existingScoreMap.get(team.userId);
```

---

### BUG-C04: `auth.service.ts register()` — Non-Atomic: User Saved, Cards Issue-ზე Error → Orphaned User
- **ფაილი:** `src/auth/auth.service.ts` (lines 28-34)
- **პრობლემა:** Registration flow:
  1. `this.usersService.create(...)` → user DB-ში save-ვდება (1000000 coins ჩათვლით)
  2. `await this.cardsService.issueCards(user.id)` → cards issue-ვდება

  თუ `issueCards()` fail-ს გაუშვებს (DB error, connection issue), **user DB-ში დარჩება cards-ის გარეშე**. Registration endpoint-ი 500-ს დააბრუნებს. User retry-ზე `ConflictException`-ს ("email უკვე გამოყენებულია") მიიღებს — **ვერ დარეგისტრირდება**.
- **შედეგი:** Dead user account — email blocked, card-ები არ გაქვს, registration failed. მხოლოდ Admin-ს შეუძლია DB-ში ხელით fix.
- **Fix:** Registration გახვიე single transaction-ში. ან `issueCards()` idempotent retry-ზე ჩაამატე (BUG-024 in Round 1 addresses idempotency, but not the orphan issue).

---

### BUG-C05: `admin.service.ts processElimination()` — UTPs Fetched Outside Transaction (TOCTOU + Partial Refund Risk)
- **ფაილი:** `src/admin/admin.service.ts` (lines 85-89)
- **პრობლემა:** `utps` query:
```typescript
const utps = await queryRunner.manager.find(UserTeamPlayer, {
  where: { player: { teamId } },
  relations: ['player', 'player.tier', 'userTeam'],
});
```
ეს query **queryRunner.manager**-ით ხდება, ანუ transaction-ის შიგნით — ეს OK-ია. **თუმცა `userTeam` relation-ი load-ვდება**, რაც შეიძლება stale data-ს შეიცავდეს. მაგრამ **ნამდვილი bug**: `eliminated` flag-ი შემოწმება (line 77: `if (team.eliminated) throw`) ხდება **transaction-ის გარეთ** — unprotected read. ორი parallel `processElimination(teamId)` call:
  1. ორივე reads `team.eliminated = false` (no lock)
  2. ორივე enters try block
  3. ორივე refunds users
  4. ორივე sets `eliminated = true`
- **შედეგი:** Double elimination refund — Coin inflation. ყველა user-ი refund-ს ორჯერ მიიღებს.
- **Fix:** Eliminated check transaction-ის შიგნით pessimistic_write lock-ით:
```typescript
const team = await queryRunner.manager.findOne(Team, {
  where: { id: teamId },
  lock: { mode: 'pessimistic_write' },
});
if (team.eliminated) throw new BadRequestException('ნაკრები უკვე eliminated-ია');
```

---

## HIGH 🟠

### BUG-H01: `scoring.service.ts` — ყველა UserTeam eager Loading (Memory Bloat)
- **ფაილი:** `src/scoring/scoring.service.ts` (lines 109-111) + `src/user-teams/entities/user-team.entity.ts` (line 42-46)
- **პრობლემა:** `UserTeam` entity-ში `players` relation-ი `eager: true`. `this.userTeamsRepo.find({ relations: ['players', 'players.player'] })` — ყველა user-ის ყველა team-ი + ყველა player-ი + ყველა tier/team relation-ი **მეხსიერებაში** ჩაიტვირთება. 10,000 user x 15 players x eager Team+Tier = **სერიოზული RAM usage**.
- **შედეგი:** OOM (Out of Memory) error scoring calculation-ზე World Cup-ის დროს. Node.js process restart. Scores დაიკარგება.
- **Fix:** `eager: false` + explicit relations only where needed. Scoring-ში paginate ან batch process:
```typescript
// Batch by 500 teams
const batchSize = 500;
for (let skip = 0; ; skip += batchSize) {
  const teams = await this.userTeamsRepo.find({ relations: [...], take: batchSize, skip });
  if (teams.length === 0) break;
  // process batch
}
```

---

### BUG-H02: `tiers.controller.ts` — Route Order Bug: `/seed` Shadowed by `/:id` on POST
- **ფაილი:** `src/tiers/tiers.controller.ts` (lines 40-82)
- **პრობლემა:** Route registration order:
  1. `@Post('admin/tiers')` — create
  2. `@Patch('admin/tiers/:id')` — update
  3. `@Delete('admin/tiers/:id')` — delete
  4. `@Post('admin/tiers/seed')` — **seed (registered LAST)**

  NestJS Express adapter-ი routes-ს registration order-ით match-ავს. `@Post('admin/tiers/seed')` registered-ია `@Patch('admin/tiers/:id')`-ის შემდეგ. **POST `/admin/tiers/seed`** — NestJS-ი `POST` method-ში `/seed`-ს სწორად match-ავს ( პოზიცია 4), **PATCH `/:id`** სხვა method-ია. POST-ზე conflict: `@Post('admin/tiers')` (line 40) vs `@Post('admin/tiers/seed')` (line 74). NestJS route resolver: `admin/tiers` (exact) + `admin/tiers/seed` (exact but after) — `/seed` **ვერ match-ს გაუკეთებს** `admin/tiers` route-ს. **ნამდვილი bug**: `@Post('admin/tiers/seed')` ფაქტობრივად **არასდროს** match-ს გაუკეთებს, რადგან NestJS `@Post('admin/tiers')` controller-ზე `/seed`-ს `/`-ად განიხილავს (controller prefix empty). **დეტალი**: Controller `@Controller()` (no prefix), routes სრულ paths-ს ადგენს. `@Post('admin/tiers/seed')` გამოიყენებს path `admin/tiers/seed`. `@Post('admin/tiers')` uses `admin/tiers`. These are **different paths** — no conflict. თუმცა `seed` route-ი `/:id` route-ის **შემდეგ** register-დება — future `@Post('admin/tiers/:id')` route დაამატეთ და `/seed` `id=seed`-ად გახდება → `ParseIntPipe` fail → 400 error.
- **შედეგი:** Seed endpoint ახლა მუშაობს, მაგრამ სტრუქტურულად fragile. ნებისმიერი refactoring-ი breaks seed.
- **Fix:** Specific routes (`/seed`) define-ი generic routes (`/:id`)-ის **წინ**.

---

### BUG-H03: `leaderboard.service.ts distributePrizes()` — N+1 Queries: `findOne(User)` Inside Loop
- **ფაილი:** `src/leaderboard/leaderboard.service.ts` (lines 158-163)
- **პრობლემა:** `for (const uid of userIds)` — ყოველი iteration:
```typescript
const user = await queryRunner.manager.findOne(User, {
  where: { id: uid },
  lock: { mode: 'pessimistic_write' },
});
```
Top 5 prize winners-ისთვის 5 query (OK), **მაგრამ** tied users scenario-ში (e.g. 100 users tied at rank 1) — 100 sequential locked queries. ასევე outer loop `for (const [rank, userIds] of rankGroups.entries())` — nested loops.
- **შედეგი:** Prize distribution transaction-ი slow. Long-running transaction-ი deadlock-ს შეიძლება გამოიწვევს სხვა concurrent transactions-თან.
- **Fix:** Batch users fetch before loop + individual updates:
```typescript
const allUserIds = [...new Set([...rankGroups.values()].flat())];
// fetch all with FOR UPDATE SKIP LOCKED or process individually
```

---

### BUG-H04: `UserTeamPlayer` entity — Unique Constraint არ არის (`userTeamId` + `playerId`)
- **ფაილი:** `src/user-teams/entities/user-team-player.entity.ts`
- **პრობლემა:** Entity-ში `@Unique(['userTeamId', 'playerId'])` constraint **არ არის** DB level-ზე. Duplicate check (line 98-101 marketplace.service.ts) application level-ზეა. Race condition-ით ორი identical player შეიძლება ერთ გუნდში მოხვდეს (buy() transaction lock UserTeam-ზე არის, მაგრამ რა ხდება თუ ორი სხვადასხვა request ერთდროულად UserTeam-ს first time ქმნის და duplicate insert-ს ასრულებს).
- **შედეგი:** DB-ში duplicate player ერთ გუნდში — scoring-ი ორჯერ დაითვლის. Business rule violation.
- **Fix:** Entity-ზე დაამატე:
```typescript
@Entity('user_team_players')
@Unique(['userTeamId', 'playerId'])
export class UserTeamPlayer { ... }
```

---

### BUG-H05: `scoring.service.ts` — სუბსტიტუტი Player-ს Stats-ი შეიძლება არ ჰქონდეს (Phantom Sub)
- **ფაილი:** `src/scoring/scoring.service.ts` (lines 141-153)
- **პრობლემა:** Sub substitution logic:
```typescript
const sub = subs.find(
  (s) => s.player.position === starter.player.position && !usedSubIds.has(s.id),
);
if (sub) {
  usedSubIds.add(sub.id);
  activePlayers.push({ playerId: sub.playerId, isCaptain: ... });
}
```
Sub-ი `activePlayers`-ში ემატება **`playerPointsMap`-ში არსებობის შემოწმების გარეშე**. შემდეგ:
```typescript
const pts = playerPointsMap.get(ap.playerId);
if (!pts) continue; // sub-ი played 0 minutes = no stat
```
თუ sub-ი სხვა match-ში ან საერთოდ არ ჩვენება stats-ში — `continue` სიჩუმით. **მაგრამ**: sub-ი შეიძლება **საერთოდ არ ითამაშებდეს** (minutes=0) — stat-ი არ ეცემა `playerPointsMap`-ში → `continue`. ეს OK-ია. **ნამდვილი bug**: starter-ი არ ითამაშებს → sub-ი ემატება → sub-საც არ ჰქონია stat → sub-ი 0 ქულა, starter-საც 0 ქულა — **შედეგი სწორია**, მაგრამ **sub-ი „გამოყენდა"** (`usedSubIds.add(sub.id)`) even though-ი 0 ქულა მიიღო. გასაუმჯობესებელია: check if sub has stat before marking as used.
- **შედეგი:** Sub-ი „გამოხარჯულია" მაშინ, როცა 0 ქულა მიიღო — სხვა starter-ის ჩანაცვლება ამ sub-ით ვეღარ მოხდება.
- **Fix:** Sub-ი `usedSubIds`-ში დაამატე მხოლოდ მაშინ, თუ მას stats-ი აქვს:
```typescript
const subStat = stats.find(s => s.playerId === sub.playerId && s.minutes > 0);
if (subStat) {
  usedSubIds.add(sub.id);
  activePlayers.push({ ... });
}
```

---

### BUG-H06: `promotions.service.ts` — `RedeemPromoDto` — No MinLength Validation (Empty String Promo Code)
- **ფაილი:** `src/promotions/dto/redeem-promo.dto.ts` (line 7)
- **პრობლემა:** `@IsString() @MaxLength(50) code: string` — **`@IsNotEmpty()` ან `@MinLength(1)` არ არის**. Empty string `""` გაივლის validation-ს. `promoRepo.findOne({ where: { code: '' } })` — no match → `NotFoundException`. Innocuous-ია, მაგრამ:
  - Log spam (404-ები)
  - Potential timing attack vector (response time difference on DB lookup)
- **შედეგი:** Empty string request-ები DB query-ს ახდენს — waste + log pollution.
- **Fix:** დაამატე `@IsNotEmpty()` ან `@MinLength(1)`.

---

### BUG-H07: `UserMatchScore` — No Unique Constraint (`userId` + `matchId`)
- **ფაილი:** `src/matches/entities/user-match-score.entity.ts`
- **პრობლემა:** `UserMatchScore` entity-ში `@Unique(['userId', 'matchId'])` **არ არის** DB-ზე. `calculateMatchPoints()` code existing check-ს ამოწმებს application level-ზე (lines 174-192), მაგრამ race condition-ი (parallel calculateMatchPoints calls) duplicate insert-ს გამოიწვევს. `statsCalculated` idempotency guard არის (line 94-96), მაგრამ concurrent calls-ის შემთხვევაში ორივეს შეუძლია `statsCalculated = false`-ის დანახვა.
- **შედეგი:** Duplicate UserMatchScore records — `SUM(totalPoints)` leaderboard-ზე ორმაგი ქულა.
- **Fix:** Entity-ზე:
```typescript
@Entity('user_match_scores')
@Unique(['userId', 'matchId'])
export class UserMatchScore { ... }
```

---

## MEDIUM 🟡

### BUG-M01: `app.module.ts` — `synchronize: true` Production-ში
- **ფაილი:** `src/app.module.ts` (line 47)
- **პრობლემა:** `synchronize: process.env.NODE_ENV !== 'production'` — NODE_ENV-ი **არ არის** set Neon/Railway-ზე by default. თუ undefined — `undefined !== 'production'` → `true` → synchronize ჩართულია.
- **შედეგი:** Schema auto-migration production DB-ზე — data loss risk column rename/drop-ზე.
- **Fix:** `synchronize: false` ყოველთვის, migrations-ი გამოიყენე.

---

### BUG-M02: `auth.service.ts` — `REFRESH_TOKEN_SECRET` Undefined-ის შემთხვევა Silent Fail
- **ფაილი:** `src/auth/auth.service.ts` (lines 71, 113)
- **პრობლემა:** `this.configService.get('REFRESH_TOKEN_SECRET')` — თუ env var არ არის set, `undefined` დაბრუნდება. `jwtService.sign(payload, { secret: undefined })` — fallback-ი `JWT_SECRET`-ზე ან `undefined`-ზე. `jwtService.verify(token, { secret: undefined })` — same fallback.
- **შედეგი:** Refresh token-ი access token-ის იმავე secret-ით signature-ს მიიღებს — BUG-005 (Round 1) კვლავ ქმედითია env misconfiguration-ის შემთხვევაში.
- **Fix:** App startup-ზე validate env:
```typescript
const refreshSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
if (!refreshSecret) throw new Error('REFRESH_TOKEN_SECRET env var is required');
```

---

### BUG-M03: `admin.service.ts processElimination()` — History Records N+1 Insert (Loop-ში ცალ-ცალკე)
- **ფაილი:** `src/admin/admin.service.ts` (lines 120-129)
- **პრობლემა:** `for (const utp of utps)` loop-ში ყოველი iteration-ისთვის:
```typescript
await queryRunner.manager.save(UserTeamHistory, history);
await queryRunner.manager.delete(UserTeamPlayer, { id: utp.id });
```
ეს N insert + N delete queries — elimination-ზე 1000+ UTP rows-ისთვის 2000+ queries within transaction.
- **შედეგი:** Long-running transaction, slow elimination processing, DB lock contention.
- **Fix:** Batch insert/delete:
```typescript
await queryRunner.manager.save(UserTeamHistory, historyRecords); // batch
await queryRunner.manager.delete(UserTeamPlayer, utpIds); // bulk delete by IDs
```

---

### BUG-M04: `user-teams.service.ts setLineup()` — Saves ALL TeamPlayers (Including Unchanged)
- **ფაილი:** `src/user-teams/user-teams.service.ts` (line 123)
- **პრობლემა:** `await this.utpRepo.save([...teamPlayerMap.values()])` — ყველა 15 UserTeamPlayer-ს saves, მათ შორის **მათ, ვინც dto-ში არ არის** (though DTO requires exactly 15, so all are covered). მაგრამ `teamPlayerMap`-ი load-ვდება getOrCreateTeam-ში eager: true-ით — ის **ყველა** player-ს შეიცავს. `for (const item of dto.lineup)` ამახვილებს DTO-ში მოსული items-ების. **Bug**: dto-ში 15 items + teamPlayerMap-ში 15 items — matching. მაგრამ validation loop (lines 102-106) `starters` array-ს iterate-ს, line 118 `teamPlayerMap.get(item.id)` დელეგაციას ანიჭებს. `teamPlayerMap.values()` save-ავს **ყველა** entry-ს — DP round-trip waste.
- **შედეგი:** 15 UPDATE queries ნაცვლად minimal needed updates. Minor performance issue.
- **Fix:** Save მხოლოდ changed records.

---

### BUG-M05: `marketplace.service.ts` — Marketplace Status Check Outside Transaction (TOCTOU)
- **ფაილი:** `src/marketplace/marketplace.service.ts` (lines 52-55, 160-162)
- **პრობლემა:** `buy()` და `sell()` method-ები marketplace-ის `isOpen` status-ს ამოწმებენ **transaction-ის დაწყებამდე**:
```typescript
const status = await this.getStatus();
if (!status.isOpen) throw new ForbiddenException(...);
// ... then start transaction
```
Admin-ს შეუძლია marketplace დახუროს `getStatus()` check-სა და transaction start-ს შორის.
- **შედეგი:** User-ი marketplace-ის დახურვის შემდეგ ყიდვას/გაყიდვას მაინც ახდენს (race window პატარაა მაგრამ theoretically possible).
- **Fix:** Marketplace status check transaction-ის შიგნით გააკეთე, ან accept race window as acceptable risk.

---

### BUG-M06: `scoring.service.ts` — Double Yellow + Red Card Penalty Logic Error
- **ფაილი:** `src/scoring/scoring.service.ts` (line 75)
- **პრობლემა:**
```typescript
if (stat.yellowCards >= 2 && stat.redCards > 0) add('doubleYellow', -1);
```
Double yellow card-ის (2 yellows → auto red) შემთხვევაში: `yellowCards=2`, `redCards=1` (auto). სისტემა: `-1 (yellow1) + -1 (yellow2) + -3 (red) + -1 (doubleYellow) = -6` ქულა. **მაგრამ** Double Yellow = Yellow+Yellow+Red = 3 cards. სტანდარტული fantasy scoring-ი: Double Yellow = Yellow penalty x2 + Red penalty = -1 + -1 + -3 = -5 (No extra -1). Extra `-1` doubleYellow penalty-ი arbitrary-ია და **documented არ არის** spec-ში.
- **შედეგი:** Players-ი extra -1 penalty-ს მიიღებს double yellow-ზე. Scoring inconsistency vs spec.
- **Fix:** `idea.md` სპეციფიკაციის მიხედვით გადაამოწმე. თუ double yellow no extra penalty — ამ line-ი წაშალე.

---

### BUG-M07: `transactions.service.ts getMyHistory()` — Unlimited Results (No Pagination)
- **ფაილი:** `src/transactions/transactions.service.ts` (line 33-37)
- **პრობლემა:** `find({ where: { userId }, order: ... })` — `take` **არ არის**. User-ს შეიძლება ათასობით transaction ჰქონდეს (ყოველი buy/sell + promo + elimination refund).
- **შედეგი:** Large response payload, memory issue, slow query.
- **Fix:** `take: 100, skip: offset` pagination დაამატე.

---

### BUG-M08: `leaderboard.service.ts getLeaderboard()` — User Data Leakage in `top100`
- **ფაილი:** `src/leaderboard/leaderboard.service.ts` (lines 33-38)
- **პრობლემა:** `relations: ['user']` — User entity-ი eager-ად ჩაიტვირთება `LeaderboardSnapshot`-ში. `User` entity-ი `@Exclude()` decorator-ს იყენებს `password` და `refreshToken`-ზე, **მაგრამ** `ClassSerializerInterceptor` globally registered **არ არის** (`main.ts`-ში). `Exclude` decorator-ი მხოლოდ interceptor-ის გამოყენებისას მუშაობს.
- **შედეგი:** Leaderboard response-ი user-ის `password` hash, `refreshToken` hash, `resetToken`-ს დააბრუნებს.
- **Fix:** `main.ts`-ში `app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))` ან DTO/Select-ის გამოყენება.

---

### BUG-M09: `user-teams.service.ts getOrCreateTeam()` — Race Condition on Team Creation
- **ფაილი:** `src/user-teams/user-teams.service.ts` (lines 34-44)
- **პრობლემა:** `getOrCreateTeam()`:
```typescript
let team = await this.userTeamRepo.findOne({ where: { userId }, ... });
if (!team) {
  team = this.userTeamRepo.create({ userId, ... });
  team = await this.userTeamRepo.save(team);
}
```
ორი parallel request ახალი user-ისთვის: ორივეს `team = null` → ორივე `save()` → **unique constraint violation** (`userId` unique) → 500 Internal Server Error.
- **შედეგი:** First marketplace action-ზე parallel requests crash-ს გამოიწვევს.
- **Fix:** `try { save() } catch (UniqueViolation) { return findOne() }` ან INSERT ON CONFLICT DO NOTHING pattern.

---

## LOW 🟢

### BUG-L01: `matches.controller.ts` — Auth Guard არ არის (ყველა Match/Stats Public)
- **ფაილი:** `src/matches/matches.controller.ts`
- **პრობლემა:** `@Get()`, `@Get('live')`, `@Get(':id')`, `@Get(':id/stats')` — **`@UseGuards(JwtAuthGuard)` არ არის**. ნებისმიერ unauthenticated request-ს შეუძლია matches + stats-ი ნახოს.
- **შედეგი:** Match stats-ი (goals, assists, etc.) public-ია. Low risk თუ match data public ინფოა, **მაგრამ** `/matches/:id/stats`-ი competitive advantage-ს იძლევა scraping-ისთვის.
- **Fix:** Auth required გადაწყვეტი business decision-ია. თუ public OK — leave. თუ not — guard დაამატე.

---

### BUG-L02: `UserTeam.captainId` — No FK Constraint (DB Level Inconsistency)
- **ფაილი:** `src/user-teams/entities/user-team.entity.ts` (line 33)
- **პრობლემა:** `captainId: number | null` plain column-ი. Application-level validation-ი sell/elimination-ზე captain reset-ს ახდენს (სწორია). **მაგრამ** DB-ზე FK constraint-ი არ არის — manual DB manipulation შეიძლება orphaned captainId-ს გამოიწვევდეს.
- **შედეგი:** Scoring-ზე orphaned captainId — `starter.playerId === team.captainId` true-ია არ-არსებული player-ისთვის, `playerPointsMap.get()` undefined → `continue` — captain multiplier დაიკარგება.
- **Fix:** DB-level unique constraint ან ყოველ scoring-ზე captainId existence check.

---

### BUG-L03: `auth.controller.ts` — `/auth/refresh` Body Validation არ არის
- **ფაილი:** `src/auth/auth.controller.ts` (line 26-28)
- **პრობლემა:** `@Body('refreshToken') refreshToken: string` — `refreshToken` undefined/null-ის შემთხვევაში `auth.service.ts refresh()` გაიძახება და `jwtService.verify(undefined, ...)` გაეშვება → unclear error response.
- **შედეგი:** `500 Internal Server Error` ნაცვლად `400 Bad Request`.
- **Fix:** DTO გამოიყენე validation-ით:
```typescript
export class RefreshDto { @IsString() @IsNotEmpty() refreshToken: string; }
```

---

### BUG-L04: `admin.service.ts updateMatchStatus()` — No Validation on Status Transition
- **ფაილი:** `src/admin/admin.service.ts` (lines 66-71)
- **პრობლემა:** `updateMatchStatus()` ნებისმიერ status-ს ნებისმიერ სხვა-ზე გადაიყვანს. `FINISHED → SCHEDULED` შეიძლება. Match-ი რომ `statsCalculated: true` — status-ის ცვლილება `calculateMatchPoints()`-ს ბარიერს გადადის.
- **შედეგი:** Admin-ს შეუძლია FINISHED match-ი LIVE-ზე დააყენოს → recalculate points → scores manipulate.
- **Fix:** Status transition validation — `FINISHED`-ზე არ გამოიყენო rollback უნებართვოდ, ან audit log.

---

### BUG-L05: `players.service.ts findAll()` — No Eliminated Team Filter by Default
- **ფაილი:** `src/players/players.service.ts` (lines 19-45)
- **პრობლემა:** Marketplace-ზე `getAvailablePlayers()` → `playersService.findAll(filters)` — `eliminated` team-ის ფეხბ. filter-ვდება `buy()` method-ში (`if (player.team.eliminated) throw`). **მაგრამ** player list endpoint-ი (`GET /market`) eliminated players-საც აჩვენებს.
- **შედეგი:** User-ი ხედავს eliminated players marketplace-ზე, ყიდვა try-ზე error-ს მიიღებს — confusing UX.
- **Fix:** `findAll()`-ში default filter: `team.eliminated = false` (ან `FilterPlayersDto`-ში `includeEliminated?: boolean`).

---

### BUG-L06: `promotions.controller.ts update()` — Admin Promo Update-ს `isActive`, `maxUses` ცვლის — No Re-check Logic
- **ფაილი:** `src/promotions/promotions.controller.ts` (lines 68-78) + `src/promotions/promotions.service.ts` (lines 130-135)
- **პრობლემა:** `update()` method `Object.assign(promo, data)` — ამ data-ში `usedCount`-ის ჩართვა შესაძლებელია. `Partial<PromoCode>` type-ი ყველა field-ს საშუალებას იძლევა. Admin-ს შეუძლია `usedCount: 0` გამოაგზავნოს და reset გაუკეთოს already-used code-ს.
- **შედეგი:** Promo code reuse exploitation — admin-ის მხრიდან.
- **Fix:** `usedCount`, `createdAt` whitelist-ი update-ის გარეთ გამოტანე.

---

### BUG-L07: `user-teams.service.ts setFormation()` — Formation Check მხოლოდ 11 Starter-ზე (Partial State)
- **ფაილი:** `src/user-teams/user-teams.service.ts` (lines 56-64)
- **პრობლემა:** `if (starters.length === 11)` — validation-ი მხოლოდ მაშინ ხდება. თუ user-ს 9 starter ყავს (incomplete team), formation შეცვლა **ბლოკის გარეშე** ხდება — ნებისმიერ invalid formation-ს დაამყარებს. DTO-ს `@IsIn(VALID_FORMATIONS)` validation-ი მხოლოდ string format-ს ამოწმებს. **მაგრამ** `setLineup()` `validateFormationWithPlayers()` ასე და ისე გაეშვება სრულ lineup-ზე. ეს acceptable trade-off-ია, მაგრამ user შეიძლება ფიქრობდეს formation set-ვდება valid სტრუქტურით მაშინ, როცა partial team-ი ყავს.
- **შედეგი:** Low risk — `setLineup()` გამოასწორებს, მაგრამ misleading formation state.

---

## ✅ გასწორებული BUG-ები (Round 1 — Confirmed Fixed)

შემდეგი bug-ები Round 1-ის report-ში იყო listed და **კოდის review-ით დასტურდება, რომ გამოსწორდა**:

### BUG-001 (Round 1): Marketplace buy() Race Condition — FIXED ✅
- `marketplace.service.ts` (lines 76-108): UserTeam fetch **transaction-ის შიგნით** `pessimistic_write` lock-ით. UTPs ჩატვირთვა `queryRunner.manager.find(UserTeamPlayer, ...)`. ყველა validation (team size, duplicate, position) transaction-ის შიგნით. **სრულად გამოსწორებულია**.

### BUG-002 (Round 1): Marketplace sell() TOCTOU — PARTIALLY FIXED ⚠️
- `utpEntry` ძებნა transaction-ის შიგნით `queryRunner.manager`-ით — ეს გამოსწორდა.
- **მაგრამ**: UserTeam ჩატვირთვა (line 179) `pessimistic_write` lock-ის **გარეშე** — BUG-C01 ჩვენი ახალი report-ში.

### BUG-003 (Round 1): Scoring — Sub Inherits Captain Status — FIXED ✅
- `scoring.service.ts` (line 149): `isCaptain: starter.playerId === team.captainId` — sub-ი captain status-ს inherit-ს ჩვეულებრივი `captain * multiplier` logic-ით. **გამოსწორებულია**.

### BUG-004 (Round 1): Promo Race Condition — FIXED ✅
- `promotions.service.ts` (lines 54-71): PromoCode row locked `pessimistic_write`-ით. `maxUses`, `onePerUser` check, `usedCount` increment ყველა transaction-ის შიგნით. **სრულად გამოსწორებულია**.

### BUG-005 (Round 1): Auth Refresh Token Secret — FIXED ✅
- `auth.service.ts` (lines 70-74, 111-114): `REFRESH_TOKEN_SECRET` გამოიყენება refresh token-ის sign-ისა და verify-სთვის. **გამოსწორებულია**.

### BUG-006 (Round 1): Scoring N+1 TC Cards Query — FIXED ✅
- `scoring.service.ts` (lines 114-117): TC cards preloaded loop-ის წინ `tcCardsByUserId` Map-ში. **გამოსწორებულია**.

### BUG-008 (Round 1): setLineup() — Invalid ID Continue Bug — FIXED ✅
- `user-teams.service.ts` (line 118): `if (!utp) throw new BadRequestException(...)` — `continue`-ის ნაცვლად throw. **გამოსწორებულია**.

### BUG-009 (Round 1): Card Activation — No Tournament Validation — FIXED ✅
- `cards.service.ts` (line 42): `await this.tournamentsService.findById(dto.tournamentId)` — tournament existence validated. **გამოსწორებულია**.

### BUG-010 (Round 1): Global Leaderboard userId Type Mismatch — FIXED ✅
- `leaderboard.service.ts` (line 68): `userId: Number(r.userId)` — cast to number. `myRank` comparison: `r.userId === userId` (both numbers). **გამოსწორებულია**.

### BUG-011 (Round 1): processElimination() — No Eliminated Guard — PARTIALLY FIXED ⚠️
- Application-level `if (team.eliminated) throw` check (line 77) — ეს check transaction-ის **გარეთ** ხდება. Parallel call TOCTOU მაინც შესაძლებელია. **BUG-C05 ჩვენი ახალი report-ში**.

### BUG-012 (Round 1): Eliminated Players Purchasable — FIXED ✅
- `marketplace.service.ts` (lines 60-62): `if (player.team.eliminated) throw BadRequestException`. **გამოსწორებულია**.

### BUG-013 (Round 1): CORS Wildcard — PARTIALLY FIXED ⚠️
- `main.ts` (lines 18-23): `CORS_ORIGIN` env var-ს იყენებს, default `'*'`. **Env-ის სწორი კონფიგურაციაზეა დამოკიდებული** — deployment-ზე `CORS_ORIGIN` უნდა იყოს set.

### BUG-016 (Round 1): validateFormationWithPlayers() GK Not Validated — FIXED ✅
- `user-teams.service.ts` (lines 159-163): `if (actualGk !== 1) throw BadRequestException(...)`. **გამოსწორებულია**.

### BUG-018 (Round 1): Scoring Idempotency — FIXED ✅
- `scoring.service.ts` (lines 94-96): `if (match.statsCalculated) throw BadRequestException(...)`. **გამოსწორებულია**.

### BUG-019 (Round 1): Global Leaderboard Missing User Names — FIXED ✅
- `leaderboard.service.ts` (lines 56-63): `LEFT JOIN User u` + `addSelect('u.name', 'userName')`. **გამოსწორებულია**.

### BUG-021 (Round 1): LIKE Wildcard Injection — FIXED ✅
- `players.service.ts` (lines 38-41): `filters.search.replace(/[%_\\]/g, '\\$&')` escape. **გამოსწორებულია**.

### BUG-024 (Round 1): issueCards() No Idempotency — FIXED ✅
- `cards.service.ts` (lines 22-23): `const existing = await this.cardsRepo.count({ where: { userId } }); if (existing > 0) return;`. **გამოსწორებულია**.

### BUG-028 (Round 1): snapshotLeaderboard() No Transaction — FIXED ✅
- `leaderboard.service.ts` (lines 115-127): delete + insert transaction-ში. **გამოსწორებულია**.

---

## შეუსწორებელი Round 1 Bug-ები (კვლავ არსებობს)

| BUG ID | სტატუსი | შენიშვნა |
|--------|---------|---------|
| BUG-002 (Round 1) | PARTIAL | UserTeam lock missing — see BUG-C01 |
| BUG-007 (Round 1) | OPEN | Route order fragile — see BUG-H02 |
| BUG-011 (Round 1) | PARTIAL | Eliminated check outside tx — see BUG-C05 |
| BUG-013 (Round 1) | PARTIAL | CORS depends on env config |
| BUG-014 (Round 1) | FIXED | synchronize: false ყოველთვის — BUG-M01 |
| BUG-015 (Round 1) | N/A | tripleCaptainActive column ვეღარ ვპოულობ entity-ში — may have been removed |
| BUG-020 (Round 1) | OPEN | onDelete RESTRICT on Player |
| BUG-022 (Round 1) | OPEN | No token family rotation |
| BUG-023 (Round 1) | OPEN | synchronize + Neon cold start |
| BUG-025 (Round 1) | FIXED | Pagination დამატებულია — BUG-M07 |
| BUG-026 (Round 1) | OPEN | captainId no FK — see BUG-L02 |
| BUG-027 (Round 1) | FIXED | Route order გამოსწორდა — BUG-H02 |

---

## Round 2 Fixes (backend-developer)

- BUG-C01: fixed — `sell()` UserTeam fetch-ს დაემატა `pessimistic_write` lock TOCTOU-ს თავიდან ასაცილებლად
- BUG-C02: fixed — `activateCard()` გადაწერილია transaction-ში `pessimistic_write` lock-ით race condition-ის გასაუქმებლად; DataSource inject CardsService-ში
- BUG-C03: fixed — `calculateMatchPoints()` loop-ის წინ ყველა existing score preload-ვდება Map-ში; N+1 Query-ი გაქრა
- BUG-C04: fixed — `register()` ახლა ერთ transaction-ში ქმნის user + card-ებს; orphaned user შეუძლებელია
- BUG-C05: fixed — `processElimination()` Team row-ს კითხულობს `pessimistic_write` lock-ით transaction-ის შიგნით; double-refund race condition გაქრა
- BUG-H01: fixed — Scoring user teams batch-ებად (500 per batch) დამუშავდება OOM-ის თავიდან ასაცილებლად
- BUG-H02: fixed — `tiers.controller.ts`-ში `/seed` route registration გადავიდა `/:id` routes-ის წინ
- BUG-H03: fixed — `distributePrizes()` user IDs sort-ვდება ascending რომ lock ordering-ი deterministic იყოს deadlock-ის თავიდან ასაცილებლად
- BUG-H04: fixed — `UserTeamPlayer` entity-ს დაემატა `@Unique(['userTeamId', 'playerId'])` DB constraint
- BUG-H05: fixed — Scoring-ში sub `usedSubIds`-ში მხოლოდ მაშინ ემატება, თუ მას stats (minutes > 0) აქვს
- BUG-H06: fixed — `RedeemPromoDto.code`-ს დაემატა `@IsNotEmpty()` validator
- BUG-H07: fixed — `UserMatchScore` entity-ს დაემატა `@Unique(['userId', 'matchId'])` DB constraint
- BUG-M01: fixed — `synchronize: false` ყოველთვის (მანამდე undefined NODE_ENV-ზე true იყო)
- BUG-M02: fixed — `REFRESH_TOKEN_SECRET` validate-ვდება `generateTokens()` და `refresh()`-ში; undefined — Error
- BUG-M03: fixed — `processElimination()` history records batch insert-ვდება; UTPs bulk delete-ვდება ID array-ით
- BUG-M04: fixed — `setLineup()` მხოლოდ შეცვლილ UTPs-ს save-ავს (15-ის ნაცვლად minimal changed)
- BUG-M05: fixed — Marketplace status გადამოწმდება transaction-ის შიგნითაც (buy/sell)
- BUG-M06: fixed — extra `-1` doubleYellow penalty წაიშალა; spec-ში არ არის documented
- BUG-M07: fixed — `transactions.getMyHistory()` pagination-ი: default limit=100, offset=0
- BUG-M08: fixed — `ClassSerializerInterceptor` global-ად დარეგისტრირდა `main.ts`-ში; `@Exclude()` მუშაობს
- BUG-M09: fixed — `getOrCreateTeam()` PostgreSQL unique_violation (23505) catch; fallback findOne
- BUG-L03: fixed — `RefreshDto` DTO შექმნილია `@IsString() @IsNotEmpty()` validation-ით; controller გამოიყენებს
- BUG-L04: fixed — `updateMatchStatus()` ახლა FINISHED-დან სხვა status-ზე transition-ს ბლოკავს
- BUG-L05: fixed — `players.findAll()` default-ად `team.eliminated = false` filter-ს ამატებს
- BUG-L06: fixed — `promotions.update()` whitelist-ი: მხოლოდ isActive/maxUses/expiresAt/bonusCoins/onePerUser ვრცელდება
