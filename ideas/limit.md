# API-Football — Player Data Sync Plan (Phase 7)

## სტატუსი (2026-05-03)

- Player seed: **DONE** — 1,739 ფეხბ., 82 ნაკრები (scripts/seed-uefa.js)
- Player fields (age/number/etc.): **TODO** — migration 006 საჭიროა
- API key: `25e9f758850770b9b69883a873b86c85` (env: `API_FOOTBALL_KEY`)

## კონტექსტი

ახლა: **100 req/day** (free plan) — squad seed-ისთვის გამოვიყენეთ (~100 req).
მსოფლიო კვირამდე: **750,000 req/day** (paid plan) — მაშინ სრული sync.

---

## რაც ახლა გვაქვს Player entity-ში

```
id, name, position, photo, apiFootballId, teamId, tierId, createdAt
```

## რაც უნდა დავამატოთ

### Migration — ახალი ველები `players` ცხრილში

```sql
ALTER TABLE players ADD COLUMN "number"      SMALLINT    NULL;
ALTER TABLE players ADD COLUMN "age"         SMALLINT    NULL;
ALTER TABLE players ADD COLUMN "birthDate"   DATE        NULL;
ALTER TABLE players ADD COLUMN "birthPlace"  VARCHAR     NULL;
ALTER TABLE players ADD COLUMN "nationality" VARCHAR     NULL;
ALTER TABLE players ADD COLUMN "height"      VARCHAR     NULL;  -- "176 cm"
ALTER TABLE players ADD COLUMN "weight"      VARCHAR     NULL;  -- "73 kg"
ALTER TABLE players ADD COLUMN "injured"     BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE players ADD COLUMN "rating"      DECIMAL(4,2) NULL;  -- "7.80" last season avg
ALTER TABLE players ADD COLUMN "lastSyncAt"  TIMESTAMP   NULL;
```

---

## API-Football Endpoints

### 1. Squad (უკვე გამოვიყენეთ) — `/players/squads?team={id}`
**რას იძლევა:** id, name, age, number, position, photo
**request-ები:** 1 per team

### 2. Player Detail — `/players?id={id}&season=2026`
**რას იძლევა:**
- `birth.date`, `birth.place`, `birth.country`
- `nationality`, `height`, `weight`
- `injured`
- `statistics[0].games.rating` — სეზონის რეიტინგი
- `statistics[0].goals.total`, `statistics[0].goals.assists`
- `statistics[0].games.appearences`, `statistics[0].games.minutes`

**request-ები:** 1 per player — ~1,739 req სულ

### 3. Injuries — `/injuries?team={id}&season=2026`
**რას იძლევა:** დაჭრილი ფეხბ. სია, ტიპი, დაბრუნების თარიღი
**request-ები:** 1 per team

---

## Sync Plan (750k req/day-ზე)

### Phase A — ერთჯერადი სრული sync (მსოფლიოს წინ)

```
POST /admin/players/sync-details
```
- ყველა player-ისთვის `/players?id=X&season=2026`
- ~1,739 requests
- ავსებს: birthDate, birthPlace, nationality, height, weight, injured, rating, number, age
- `lastSyncAt` → NOW()

### Phase B — ყოველდღიური injury update (ტურნირის დროს)

```
POST /admin/sync-injuries          — ყველა active ნაკრების injuries
```
- 48 ნაკრები × 1 req = 48 requests/day
- cron: ყოველ დღე 08:00 UTC
- `injured` ველი განახლდება

### Phase C — Match stats sync (ყოველი მატჩის შემდეგ)

```
POST /admin/sync-match-stats/:matchId
```
- `/fixtures/players?fixture={id}` — ყველა ფეხბ. stats ერთ მატჩზე
- 1 request per match
- ავსებს `match_stats` ცხრილს ავტომატურად

---

## Priority

| # | Task | Requests | როდის |
|---|------|----------|-------|
| 1 | `age` + `number` migration + squad re-seed | 0 extra | ახლავე (free plan) |
| 2 | Player detail sync (birth/height/weight/rating) | ~1,739 | paid plan-ზე |
| 3 | Daily injury sync cron | 48/day | ტურნირის დროს |
| 4 | Match stats auto-sync | 1/match | ტურნირის დროს |

---

## კოდი რაც უნდა დაიწეროს (paid plan-ზე)

### `src/players/players.service.ts`
```typescript
async syncPlayerDetails(playerId: number): Promise<void>
async syncAllPlayerDetails(): Promise<{ synced: number }>
```

### `src/admin/admin.controller.ts`
```
POST /admin/players/sync-details     — სრული sync
POST /admin/players/sync-injuries    — injury update
POST /admin/sync-match-stats/:matchId — match stats
```

### `src/integrations/api-football/api-football.service.ts`
```typescript
getPlayerDetail(apiId: number, season: number)
getTeamInjuries(teamApiId: number, season: number)
getMatchPlayerStats(fixtureApiId: number)
```

---

## შენიშვნა

`number` ველი (მაისური ნომერი) squad endpoint-იდანაც მოდის — ეს **0 extra request**.
მხოლოდ migration + squad re-seed სჭირდება.

ახლავე გასაკეთებელი:
1. Migration — ახალი ველები
2. Squad re-seed script-ი გავუშვათ `number` და `age` ველების შევსებით
   (ისედაც გვაქვს squad data, უბრალოდ entity-ს ველი არ ჰქონდა)
