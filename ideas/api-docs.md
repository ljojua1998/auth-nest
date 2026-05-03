# WorldFantasy — Frontend API Documentation

**Base URL (production):** `https://auth-nest-production.up.railway.app`
**Base URL (dev):** `http://localhost:3000`

## Authentication

JWT Bearer Token — ყველა დაცულ endpoint-ზე header-ში გადაიგზავნება:
```
Authorization: Bearer <accessToken>
```

Access token-ი იწურება **15 წუთში**. Refresh token-ი **7 დღეში**.
Token-ების განახლება: `POST /auth/refresh`.

---

## AUTH

### POST /auth/register
რეგისტრაცია. user-ს ავტომატურად ენიჭება 1,000,000 Coin და 3 Card.

**Body:**
```json
{
  "name": "Lasha",
  "email": "lasha@test.com",
  "password": "123456",
  "referralCode": "WF-ABC123"
}
```
> `referralCode` — optional. ვინმეს referral კოდი რომ შეიყვანო, ის +10,000,000 Coin-ს მიიღებს.

**Response 201:**
```json
{
  "id": 1,
  "name": "Lasha",
  "email": "lasha@test.com",
  "coins": 1000000,
  "role": "user"
}
```

**Errors:** `409` — email უკვე გამოყენებულია

---

### POST /auth/login
Login. გაძლევს access + refresh token-ს.

**Body:**
```json
{
  "email": "lasha@test.com",
  "password": "123456"
}
```

**Response 201:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors:** `401` — არასწორი email ან პაროლი

---

### POST /auth/refresh
Access token-ის განახლება (access token-ი ვადაგასული).

**Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response 201:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors:** `401` — refresh token ვადაგასული ან არასწორი

---

### GET /auth/profile
**Auth: Bearer Token**

მიმდინარე user-ის პროფილი.

**Response 200:**
```json
{
  "id": 1,
  "name": "Lasha",
  "email": "lasha@test.com",
  "coins": 950000,
  "role": "user",
  "createdAt": "2026-05-01T10:00:00Z"
}
```

---

### POST /auth/logout
**Auth: Bearer Token**

Refresh token-ის გასუფთავება.

**Response 201:**
```json
{ "message": "Logged out" }
```

---

## USERS

### GET /users/me
**Auth: Bearer Token**

Coin ბალანსი + სრული პროფილი.

**Response 200:**
```json
{
  "id": 1,
  "name": "Lasha",
  "email": "lasha@test.com",
  "coins": 950000,
  "role": "user",
  "createdAt": "2026-05-01T10:00:00Z"
}
```

---

### PATCH /users/me
**Auth: Bearer Token**

სახელის განახლება.

**Body:**
```json
{
  "name": "Giorgi"
}
```

**Response 200:** განახლებული user object

---

### GET /users/me/referral
**Auth: Bearer Token**

Referral კოდი + სტატისტიკა.

**Response 200:**
```json
{
  "referralCode": "WF-ABC123",
  "referredCount": 3,
  "totalEarned": 30000000
}
```

---

## TIERS (ფასები)

### GET /tiers
**Public**

ყველა tier coinPrice-ის მიხედვით.

**Response 200:**
```json
[
  { "id": 1, "name": "Superstar", "coinPrice": 150000 },
  { "id": 2, "name": "Strong",    "coinPrice": 110000 },
  { "id": 3, "name": "Average",   "coinPrice": 80000  },
  { "id": 4, "name": "Backup",    "coinPrice": 55000  },
  { "id": 5, "name": "Reserve",   "coinPrice": 35000  }
]
```

---

## TEAMS (ნაკრებები)

### GET /teams
**Public**

ყველა ნაკრები, group → name სორტი.

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "United States",
    "code": "USA",
    "flag": null,
    "group": "A",
    "eliminated": false
  },
  ...
]
```

---

### GET /teams/:id
**Public**

ნაკრების დეტალები.

**Errors:** `404` — ვერ მოიძებნა

---

### GET /teams/:id/players
**Public**

ნაკრების ყველა ფეხბურთელი.

**Response 200:**
```json
[
  {
    "id": 10,
    "name": "Kylian Mbappé",
    "position": "FWD",
    "photo": "https://...",
    "apiFootballId": 278,
    "team": { "id": 5, "name": "France", "code": "FRA" },
    "tier": { "id": 1, "name": "Superstar", "coinPrice": 150000 }
  },
  ...
]
```

---

## PLAYERS (ფეხბურთელები)

### GET /players
**Public**

ყველა ფეხბ. ფილტრებით.

**Query params:**
| Param | ტიპი | მაგალითი | აღწერა |
|-------|------|---------|--------|
| `position` | string | `GK`, `DEF`, `MID`, `FWD` | პოზიცია |
| `tierId` | number | `1` | Tier ID |
| `teamId` | number | `5` | ნაკრების ID |
| `search` | string | `messi` | სახელის ძიება (case-insensitive) |

**Response 200:**
```json
[
  {
    "id": 10,
    "name": "Kylian Mbappé",
    "position": "FWD",
    "photo": "https://...",
    "team": { "id": 5, "name": "France", "code": "FRA", "group": "C" },
    "tier": { "id": 1, "name": "Superstar", "coinPrice": 150000 }
  },
  ...
]
```

> eliminated ნაკრების ფეხბ. სიაში არ ჩნდება (default ფილტრი).

---

### GET /players/:id
**Public**

ფეხბ. დეტალები.

**Errors:** `404`

---

### GET /players/:id/stats
**Public**

ფეხბ.-ის სტატისტიკა ყველა მატჩზე.

**Response 200:**
```json
[
  {
    "matchId": 3,
    "minutes": 90,
    "goals": 1,
    "assists": 0,
    "cleanSheet": false,
    "yellowCards": 0,
    "redCards": 0
  }
]
```

---

## MARKETPLACE

### GET /market/status
**Public**

Marketplace ღია/დახურულია.

**Response 200:**
```json
{
  "id": 1,
  "isOpen": true,
  "openedAt": "2026-06-01T08:00:00Z",
  "closedAt": null
}
```

---

### GET /market
**Public**

Marketplace-ზე ხელმისაწვდომი ფეხბ. (იგივე ფილტრები რაც `/players`-ზე).

---

### POST /market/buy
**Auth: Bearer Token**

ფეხბ.-ის ყიდვა. Marketplace ღია უნდა იყოს.

**Body:**
```json
{
  "playerId": 10
}
```

**Response 201:**
```json
{
  "message": "ფეხბ. გუნდს დაემატა",
  "coinsSpent": 150000,
  "newBalance": 850000
}
```

**Errors:**
- `400` — არასაკმარისი Coin
- `400` — გუნდი უკვე სავსეა (15 ფეხბ.)
- `400` — პოზიციის ლიმიტი (GK max 2, DEF max 5, MID max 5, FWD max 3)
- `400` — ფეხბ. უკვე გუნდშია
- `400` — eliminated ნაკრების ფეხბ.
- `403` — Marketplace დახურულია

---

### POST /market/sell
**Auth: Bearer Token**

ფეხბ.-ის გაყიდვა. Marketplace ღია უნდა იყოს.

**Body:**
```json
{
  "playerId": 10
}
```

**Response 201:**
```json
{
  "message": "ფეხბ. გაიყიდა",
  "coinsRefunded": 150000,
  "newBalance": 1000000
}
```

**Errors:**
- `400` — ფეხბ. გუნდში არ არის
- `403` — Marketplace დახურულია

---

## MY TEAM (ჩემი Fantasy გუნდი)

### GET /my-team
**Auth: Bearer Token**

ჩემი გუნდი (15 ფეხბ. + formation + captain).

**Response 200:**
```json
{
  "id": 1,
  "formation": "4-3-3",
  "captainId": 10,
  "tripleCaptainActive": false,
  "players": [
    {
      "id": 5,
      "slot": 1,
      "isStarter": true,
      "subOrder": null,
      "player": {
        "id": 10,
        "name": "Mbappé",
        "position": "FWD",
        "photo": "https://...",
        "tier": { "name": "Superstar", "coinPrice": 150000 }
      }
    },
    ...
  ]
}
```

---

### POST /my-team/formation
**Auth: Bearer Token**

ფორმაციის შეცვლა.

**Body:**
```json
{
  "formation": "4-3-3"
}
```

> ვალიდური ფორმაციები: `3-4-3`, `3-5-2`, `4-3-3`, `4-4-2`, `4-5-1`, `5-3-2`, `5-4-1`

**Errors:** `400` — არასწორი ფორმაცია

---

### POST /my-team/captain
**Auth: Bearer Token**

კაპიტნის დანიშვნა (Starter-ებიდან).

**Body:**
```json
{
  "playerId": 10
}
```

**Errors:** `400` — ფეხბ. გუნდში არ არის / Sub-ია

---

### POST /my-team/lineup
**Auth: Bearer Token**

Starter/Sub განლაგება. ზუსტად 15 ელემენტი უნდა გადაიგზავნოს.

**Body:**
```json
{
  "lineup": [
    { "id": 5, "isStarter": true,  "subOrder": null },
    { "id": 6, "isStarter": true,  "subOrder": null },
    { "id": 7, "isStarter": false, "subOrder": 1 },
    { "id": 8, "isStarter": false, "subOrder": 2 }
  ]
}
```

> `subOrder` — Sub-ების პრიორიტეტი (1=პირველი, 4=ბოლო). Starter-ებს `null`.
> 11 Starter + 4 Sub = 15 სულ.

**Errors:**
- `400` — 11 Starter-ი არ არის
- `400` — ფორმაცია არ ემთხვევა
- `400` — ფეხბ. გუნდში არ არის

---

### GET /my-team/history
**Auth: Bearer Token**

ყიდვა/გაყიდვის ისტორია (ბოლო 50).

**Response 200:**
```json
[
  {
    "id": 1,
    "action": "buy",
    "playerName": "Mbappé",
    "coinAmount": 150000,
    "createdAt": "2026-05-01T10:00:00Z"
  },
  ...
]
```

> `action`: `buy` | `sell` | `elimination_removed`

---

## CARDS

### GET /cards
**Auth: Bearer Token**

ჩემი 3 Card-ის სტატუსი.

**Response 200:**
```json
[
  {
    "id": 1,
    "type": "triple_captain",
    "used": false,
    "usedAt": null,
    "usedInTournamentId": null
  },
  {
    "id": 2,
    "type": "wildcard",
    "used": false,
    "usedAt": null,
    "usedInTournamentId": null
  },
  {
    "id": 3,
    "type": "limitless",
    "used": false,
    "usedAt": null,
    "usedInTournamentId": null
  }
]
```

---

### POST /cards/triple-captain
**Auth: Bearer Token**

Triple Captain Card აქტივაცია (კაპიტნის ქულა x3 ამ ეტაპზე).

**Body:**
```json
{
  "tournamentId": 1
}
```

**Errors:** `400` — Card უკვე გამოყენებულია

---

### POST /cards/wildcard
**Auth: Bearer Token**

Wildcard Card აქტივაცია (ამ ეტაპზე Marketplace-ში ულიმიტო ცვლა).

**Body:** `{ "tournamentId": 1 }`

---

### POST /cards/limitless
**Auth: Bearer Token**

Limitless Card აქტივაცია (ამ ეტაპზე Coin-ის გარეშე ნებისმიერი ფეხბ.).

**Body:** `{ "tournamentId": 1 }`

---

## TOURNAMENTS (ეტაპები)

### GET /tournaments
**Public**

ყველა ეტაპი.

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Group Stage",
    "stage": "group",
    "status": "active",
    "startDate": "2026-06-11",
    "endDate": "2026-06-27"
  },
  {
    "id": 2,
    "name": "Round of 32",
    "stage": "r32",
    "status": "upcoming",
    ...
  }
]
```

> `status`: `upcoming` | `active` | `completed`
> `stage`: `group` | `r32` | `r16` | `qf` | `sf` | `third` | `final`

---

### GET /tournaments/current
**Public**

მიმდინარე აქტიური ეტაპი.

**Response 200:** Tournament object ან `null` (ჯერ არ დაწყებულა)

---

### GET /tournaments/:id
**Public**

ეტაპის დეტალები.

---

## MATCHES (მატჩები)

### GET /matches
**Public**

ყველა მატჩი (kickoff ASC).

**Response 200:**
```json
[
  {
    "id": 1,
    "status": "scheduled",
    "kickoff": "2026-06-11T16:00:00Z",
    "homeScore": null,
    "awayScore": null,
    "statsCalculated": false,
    "homeTeam": { "id": 1, "name": "Qatar", "code": "QAT" },
    "awayTeam": { "id": 2, "name": "Ecuador", "code": "ECU" },
    "tournament": { "id": 1, "name": "Group Stage" }
  },
  ...
]
```

> `status`: `scheduled` | `live` | `finished`

---

### GET /matches/live
**Public**

მხოლოდ live მატჩები.

---

### GET /matches/:id
**Public**

მატჩის დეტალები.

---

### GET /matches/:id/stats
**Public**

მატჩის ყველა ფეხბ.-ის სტატისტიკა.

**Response 200:**
```json
[
  {
    "playerId": 10,
    "playerName": "Mbappé",
    "minutes": 90,
    "goals": 2,
    "assists": 1,
    "cleanSheet": false,
    "yellowCards": 0,
    "redCards": 0,
    "saves": 0,
    "penaltySaved": 0,
    "penaltyMissed": 0,
    "ownGoals": 0
  }
]
```

---

## LEADERBOARD

### GET /leaderboard/global
**Auth: Bearer Token**

Global leaderboard (ყველა ეტაპის ჯამური ქულა).

**Response 200:**
```json
{
  "top100": [
    {
      "rank": 1,
      "userId": 5,
      "userName": "Giorgi",
      "totalPoints": 450
    },
    ...
  ],
  "myRank": {
    "rank": 23,
    "userId": 1,
    "userName": "Lasha",
    "totalPoints": 310
  }
}
```

---

### GET /leaderboard/:tournamentId
**Auth: Bearer Token**

კონკრეტული ეტაპის leaderboard.

**Response 200:** იგივე სტრუქტურა (top100 + myRank) + prizeCoins ველი

```json
{
  "top100": [
    {
      "rank": 1,
      "user": { "id": 5, "name": "Giorgi" },
      "totalPoints": 180,
      "prizeCoins": 1000000
    },
    ...
  ],
  "myRank": { ... }
}
```

> Prize: 1st=1M, 2nd=900k, 3rd=800k, 4th=700k, 5th=600k Coin

---

## TRANSACTIONS (Coin ისტორია)

### GET /transactions/me
**Auth: Bearer Token**

Coin მოძრაობის ისტორია.

**Query params:**
| Param | default | max |
|-------|---------|-----|
| `limit` | 50 | 200 |
| `offset` | 0 | — |

**Response 200:**
```json
[
  {
    "id": 1,
    "type": "registration",
    "amount": 1000000,
    "balanceBefore": 0,
    "balanceAfter": 1000000,
    "description": "Welcome bonus",
    "createdAt": "2026-05-01T10:00:00Z"
  },
  {
    "id": 2,
    "type": "buy",
    "amount": -150000,
    "balanceBefore": 1000000,
    "balanceAfter": 850000,
    "description": "Bought Mbappé",
    "createdAt": "2026-05-01T11:00:00Z"
  }
]
```

> `type`: `registration` | `buy` | `sell` | `prize` | `promo` | `elimination_refund` | `referral_bonus`

---

## PROMOTIONS

### POST /promo/redeem
**Auth: Bearer Token**

Promo კოდის გამოყენება.

**Body:**
```json
{
  "code": "LAUNCH2026"
}
```

**Response 201:**
```json
{
  "message": "კოდი წარმატებით გამოყენებულია",
  "bonusCoins": 50000,
  "newBalance": 900000
}
```

**Errors:**
- `400` — კოდი ვადაგასულია
- `400` — კოდი ამოწურულია (maxUses)
- `409` — ეს კოდი უკვე გამოიყენე
- `404` — კოდი ვერ მოიძებნა

---

### GET /promo/my-redemptions
**Auth: Bearer Token**

ჩემი გამოყენებული promo კოდები.

**Response 200:**
```json
[
  {
    "id": 1,
    "redeemedAt": "2026-05-01T12:00:00Z",
    "promoCode": {
      "code": "LAUNCH2026",
      "bonusCoins": 50000
    }
  }
]
```

---

## ERROR CODES

| HTTP | მნიშვნელობა |
|------|------------|
| `400` | Validation error / Business rule violation |
| `401` | Token გაუქმებულია ან არ არის გადაგზავნილი |
| `403` | უფლება არ გაქვს (Marketplace დახურულია / Admin only) |
| `404` | ობიექტი ვერ მოიძებნა |
| `409` | Conflict (duplicate email, already redeemed) |
| `429` | Rate limit (10 req/sec ან 100 req/min) |
| `500` | Server error |

---

## TOKEN MANAGEMENT (Frontend-ში)

```
1. Login → შეინახე accessToken + refreshToken (localStorage ან httpOnly cookie)
2. ყველა request-ზე: Authorization: Bearer <accessToken>
3. 401 მიიღე → POST /auth/refresh { refreshToken }
4. ახალი accessToken → შეინახე + retry original request
5. Refresh-ზეც 401 → Logout (ორივე token გასუფთავება)
```

---

## SCORING (ქულების სქემა — საინფორმაციო)

| მოქმედება | GK | DEF | MID | FWD |
|-----------|-----|-----|-----|-----|
| მონაწილეობა | +1 | +1 | +1 | +1 |
| 60+ წუთი | +1 | +1 | +1 | +1 |
| გოლი | +6 | +6 | +5 | +4 |
| ასისტი | +3 | +3 | +3 | +3 |
| Clean Sheet (60+წთ) | +4 | +4 | +1 | — |
| სეივი x3 | +1 | — | — | — |
| პენ. მოგერიება | +5 | — | — | — |
| გაშვ. გოლი x2 | -1 | -1 | — | — |
| პენ. გამომუშ. | +2 | +2 | +2 | +2 |
| პენ. მიღება | -1 | -1 | -1 | -1 |
| პენ. გაცდ. | -2 | -2 | -2 | -2 |
| ყვ. ბარათი | -1 | -1 | -1 | -1 |
| წ. ბარათი | -3 | -3 | -3 | -3 |
| ავტოგოლი | -2 | -2 | -2 | -2 |
| Tackle x3 | +1 | +1 | +1 | +1 |

**კაპიტანი:** x2 ქულა | **Triple Captain:** x3 ქულა
