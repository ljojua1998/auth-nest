# API-Football — Player Data Sync Plan (Phase 7)

## სტატუსი (2026-05-10)

- Migration 006 (player detail fields): **DONE**
- Player detail sync: **99/1,739** synced (2026-05-10 batch 1)
- IRL squad: **TODO** (filter გასწორდა, ხვალის batch-ში)
- API key: env `API_FOOTBALL_KEY` (free plan: 100 req/day)

## Player entity ველები (migration 006)

```
id, name, position, photo, apiFootballId, teamId, tierId, createdAt   ← არსებული
number, age, birthDate, birthPlace, nationality, height, weight,       ← ახალი (006)
injured, rating, lastSyncAt                                            ← ახალი (006)
```

---

## Daily Sync Script

```bash
node scripts/sync-player-details.js
```

- ყოველდღე გაუშვი — 100 player/day (free plan)
- ~17 დღე სრულ sync-მდე (1,739 player)
- `lastSyncAt IS NULL` — ავტომატურად იმას ასინქავს ვინც ჯერ არ დასინქულა
- IRL squad-იც ავტომატურად ჩამოტვირთავს (Step 1)

## Sync-ის პროგრესი

| თარიღი | Synced | Errors | დარჩა |
|--------|--------|--------|-------|
| 2026-05-10 | 99 | 0 | 1,640 |

---

## API-Football Endpoints

### 1. Squad — `/players/squads?team={id}`
**რას იძლევა:** id, name, age, number, position, photo
**request-ები:** 1 per team

### 2. Player Detail — `/players?id={id}&season=2024`
**რას იძლევა:**
- `birth.date`, `birth.place`, `birth.country`
- `nationality`, `height`, `weight`
- `injured`
- `statistics[0].games.rating` — სეზონის რეიტინგი

**request-ები:** 1 per player — ~1,739 req სულ

### 3. Injuries — `/injuries?team={id}&season=2026`
**რას იძლევა:** დაჭრილი ფეხბ. სია, ტიპი, დაბრუნების თარიღი
**request-ები:** 1 per team

---

## TODO (ტურნირისთვის)

| # | Task | Requests | როდის |
|---|------|----------|-------|
| 1 | Daily sync (დარჩენილი 1,640 player) | 100/day | ყოველდღე |
| 2 | Daily injury sync cron | 48/day | ტურნირის დროს |
| 3 | Match stats auto-sync | 1/match | ტურნირის დროს |

---

## კოდი რაც ჯერ უნდა დაიწეროს

### Daily injury cron (`@nestjs/schedule`)
```typescript
// ყოველ დღე 08:00 UTC — 48 ნაკრების injuries
POST /admin/sync-injuries
```

### Match stats auto-sync
```typescript
// მატჩის დასრულების შემდეგ
POST /admin/sync-match-stats/:matchId
// `/fixtures/players?fixture={id}` — 1 request per match
```
