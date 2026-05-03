# WorldFantasy — Security Audit Report
> Audit თარიღი: 2026-05-03 | Fix commit: 07679df
> Production: https://auth-nest-production.up.railway.app

---

## CRITICAL

| # | ID | ფაილი | პრობლემა | სტატუსი |
|---|-----|-------|----------|---------|
| 1 | SEC-C01 | `.env` | JWT Secrets სუსტია — ქართული სიტყვები, dictionary attack-ით crack-ი შესაძლებელია | ⚠️ MANUAL (Railway vars-ში შეცვალე) |
| 2 | SEC-C02 | `src/main.ts` | Swagger production-ში ღიაა — ყველა endpoint/DTO გამოაშკარავებულია | ✅ FIXED |

---

## HIGH

| # | ID | ფაილი | პრობლემა | სტატუსი |
|---|-----|-------|----------|---------|
| 3 | SEC-H01 | `src/leaderboard/leaderboard.service.ts` | Leaderboard response-ში user.password (bcrypt hash) ჩანს nested relation-ში | ✅ FIXED |
| 4 | SEC-H02 | `src/migrations/003_PromoRedemptionUniqueConstraint.ts` | `promo_redemptions` ცხრილს `(userId, promoCodeId)` unique constraint აკლია — race condition-ით double redeem შესაძლებელია | ✅ FIXED (migration:run საჭიროა) |
| 5 | SEC-H03 | `src/main.ts` + `.env` | `CORS_ORIGIN` არ არის დაყენებული → fallback `'*'` — ნებისმიერი origin | ✅ FIXED |
| 6 | SEC-H04 | `src/chat/chat.gateway.ts` | WebSocket CORS `cors: true` → `origin: '*'` | ✅ FIXED |

---

## MEDIUM

| # | ID | ფაილი | პრობლემა | სტატუსი |
|---|-----|-------|----------|---------|
| 7 | SEC-M01 | `src/users/entities/user.entity.ts` | `verificationToken`, `resetToken`, `resetTokenExpiry` — `@Exclude()` decorator არ ახლავს, response-ში ჩანს | ✅ FIXED |
| 8 | SEC-M02 | `src/auth/dto/register.dto.ts` | `name` და `password` ველებს `@MaxLength()` არ აქვს — DoS შესაძლებელია | ✅ FIXED |
| 9 | SEC-M03 | `src/players/dto/create-player.dto.ts` | `photo` ველს `@IsUrl()` და `@MaxLength()` არ აქვს — XSS risk | ✅ FIXED |
| 10 | SEC-M04 | `src/players/dto/filter-players.dto.ts` | `search` ველს `@MaxLength()` არ აქვს | ✅ FIXED |
| 11 | SEC-M05 | `src/promotions/dto/create-promo.dto.ts` | `bonusCoins` ველს `@Max()` upper bound არ აქვს | ✅ FIXED |
| 12 | SEC-M06 | `.env` | `NODE_TLS_REJECT_UNAUTHORIZED=0` production-ში — MITM attack შესაძლებელია | ⚠️ MANUAL (Railway SSL config საჭიროა) |

---

## LOW

| # | ID | ფაილი | პრობლემა | სტატუსი |
|---|-----|-------|----------|---------|
| 13 | SEC-L01 | `src/auth/auth.service.ts` | JWT payload-ში email ზედმეტია — user email-ის შეცვლის შემდეგ ძველი token-ი ძველ email-ს შეიცავს | ⏸️ DEFERRED |
| 14 | SEC-L02 | `src/chat/chat.gateway.ts` | WebSocket events-ს rate limit არ აქვს — Gemini API quota exhaustion შესაძლებელია | ⏸️ DEFERRED |
| 15 | SEC-L03 | `src/chat/chat.gateway.ts` | Production logs-ში userId (PII) და socket.id ჩაიწერება | ⏸️ DEFERRED |

---

## ✅ დაცული კონტროლები (PASSED)

- **IDOR** — userId ყოველთვის JWT-დან, არასდროს request body-დან ✅
- **SQL Injection** — TypeORM parameterized queries, LIKE wildcards escape-ი ✅
- **Coin Race Conditions** — PESSIMISTIC_WRITE + QueryRunner ✅
- **Admin Bypass** — `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(ADMIN)` ✅
- **Cards one-time use** — PESSIMISTIC_WRITE lock + `used` flag ✅
- **Refresh Token** — bcrypt hash DB-ში, compare()-ით verify, logout-ზე null ✅
- **Input Validation** — `ValidationPipe` whitelist + forbidNonWhitelisted ✅
- **Password in responses** — destructuring-ით ამოიშლება ✅
- **Mass Assignment** — whitelist: true DTO-ებზე ✅

---

## გასატესტი (QA Checklist)

- [ ] **SEC-C01**: JWT secret-ის შეცვლის შემდეგ ძველი token-ი → `401 Unauthorized`
- [ ] **SEC-C02**: `NODE_ENV=production`-ზე `/api` → `404` (Swagger მიუწვდომელია)
- [ ] **SEC-H01**: `GET /leaderboard/:id` response-ში `password`, `refreshToken`, `verificationToken` არ ჩანს
- [ ] **SEC-H02**: ორი პარალელური `POST /promo/redeem` → მეორე `400 Already redeemed`
- [ ] **SEC-H03**: Frontend domain-ის გარდა სხვა origin-იდან request → `CORS error`
- [ ] **SEC-M01**: `GET /auth/profile` response-ში `verificationToken`, `resetToken` არ ჩანს
- [ ] **SEC-M02**: `POST /auth/register` body `name: "a".repeat(1000)` → `400 Bad Request`
- [ ] **SEC-M03**: `POST /admin/players` body `photo: "javascript:alert(1)"` → `400 Bad Request`
- [ ] **SEC-M05**: `POST /admin/promo` body `bonusCoins: 999999999999` → `400 Bad Request`
