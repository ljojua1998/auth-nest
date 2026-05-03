# Phase 6 — Referral System
> თარიღი: 2026-05-03
> სტატუსი: DONE — deployed Railway-ზე. Migration 004 run-ვდება.

## რა გაკეთდა

### რომელი ფაილები შეიცვალა

1. **`src/users/entities/user.entity.ts`** — დაემატა 2 ახალი column:
   - `referralCode: string | null` — VARCHAR(20), UNIQUE, `@Exclude()` (API response-ში არ ჩანს)
   - `referredBy: number | null` — INT FK users.id

2. **`src/transactions/entities/transaction.entity.ts`** — `TransactionType` enum-ში დაემატა:
   - `REFERRAL_BONUS = 'referral_bonus'`

3. **`src/auth/dto/register.dto.ts`** — დაემატა optional field:
   - `referralCode?: string` — `@IsOptional()`, `@IsString()`, `@MaxLength(20)`, `@ApiPropertyOptional()`

4. **`src/users/users.service.ts`** — დაემატა 3 მეთოდი:
   - `generateReferralCode(): string` — generates `WF-XXXXXX` format
   - `findByReferralCode(code: string): Promise<User | null>`
   - `getReferralInfo(userId: number)` — referralCode + referredCount + totalEarned

5. **`src/auth/auth.service.ts`** — შეიცვალა registration logic:
   - `TransactionsService` და `TransactionType` import-ი
   - `transactionsService` inject constructor-ში
   - user შექმნისას `referralCode` auto-generate (`generateReferralCode()`)
   - commit-ის წინ: თუ `registerDto.referralCode` მოვიდა — referrer პოულობს PESSIMISTIC_WRITE lock-ით, +10M Coins, transaction log, `referredBy` update

6. **`src/auth/auth.module.ts`** — დაემატა `TransactionsModule` imports-ში

7. **`src/users/users.controller.ts`** — დაემატა endpoint:
   - `GET /users/me/referral` — JWT protected, Swagger annotated

### ახალი ფაილები

8. **`src/migrations/004_AddReferralCode.ts`** — migration:
   - `ALTER TYPE "transactions_type_enum" ADD VALUE IF NOT EXISTS 'referral_bonus'`
   - `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" VARCHAR(20) UNIQUE`
   - `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredBy" INTEGER REFERENCES "users"("id") ON DELETE SET NULL`

## ფაილების სტრუქტურა

```
src/
├── auth/
│   ├── auth.module.ts          (TransactionsModule added)
│   ├── auth.service.ts         (referral bonus logic)
│   └── dto/
│       └── register.dto.ts     (referralCode optional field)
├── users/
│   ├── entities/
│   │   └── user.entity.ts      (referralCode + referredBy columns)
│   ├── users.service.ts        (3 new methods)
│   └── users.controller.ts     (GET /users/me/referral)
├── transactions/
│   └── entities/
│       └── transaction.entity.ts (REFERRAL_BONUS enum value)
└── migrations/
    └── 004_AddReferralCode.ts  (NEW)
```

## DB ცვლილებები

| ცხრილი | ცვლილება |
|--------|---------|
| `users` | `referralCode VARCHAR(20) UNIQUE` column დამატება |
| `users` | `referredBy INT REFERENCES users(id) ON DELETE SET NULL` column დამატება |
| `transactions_type_enum` | `referral_bonus` value დამატება |

## ბიზნეს ლოგიკა

- თითოეულ user-ს registration-ზე ავტომატურად ენიჭება `WF-XXXXXX` format კოდი
- referral კოდი registration request-ში optional-ია
- თუ კოდი valid-ია (referrer-ი მოიძებნა და არ არის იგივე user): referrer-ი იღებს +10,000,000 Coins
- Coin ოპერაცია PESSIMISTIC_WRITE lock-ით, transaction table-ში ლოგდება
- ახალი user-ის `referredBy` ივსება referrer-ის ID-ით
- `referralCode` column `@Exclude()` — profile endpoint-ებში არ ჩანს; მხოლოდ `/users/me/referral` endpoint-ით

## QA — გასატესტი სია

### Registration
- [ ] `POST /auth/register` without `referralCode` — user registration-ი მუშაობს ისე, როგორც ადრე
- [ ] `POST /auth/register` with valid `referralCode` — referrer-ი იღებს +10M Coins
- [ ] `POST /auth/register` with valid `referralCode` — transaction `type=referral_bonus` ჩაიწერება
- [ ] `POST /auth/register` with valid `referralCode` — new user-ს `referredBy` დაყენდება
- [ ] `POST /auth/register` with invalid/nonexistent `referralCode` — registration გადის, bonus არ გამოიყენება (silently ignored)
- [ ] `POST /auth/register` — ახალ user-ს `referralCode` ავტომატურად გენერირდება
- [ ] `POST /auth/register` — generated referralCode ყოველთვის `WF-` prefix-ით იწყება

### Referral endpoint
- [ ] `GET /users/me/referral` with JWT — returns `referralCode`, `referredCount`, `totalEarned`
- [ ] `GET /users/me/referral` without JWT — 401 Unauthorized
- [ ] `referredCount` იზრდება ყოველი successful referral-ის შემდეგ
- [ ] `totalEarned` = `referredCount * 10_000_000`

### Known Edge Cases
- [ ] `referralCode` თვით-რეფერალი (user-ი იყენებს საკუთარ კოდს) — bonus არ გამოიყენება (`referrer.id !== user.id` check)
- [ ] `referralCode` case-sensitivity — კოდი uppercase-ია, client-ი რომ lowercase გამოგზავნოს — `WF-abc123` vs `WF-ABC123` — fail (PostgreSQL VARCHAR case-sensitive)
- [ ] duplicate registration-ი — rollback transaction-ის დროს referrer-ს Coins არ ემატება
- [ ] `referralCode` max 20 chars validation — 21+ char კოდი → 400 Bad Request
- [ ] migration იდემპოტენტია: `ADD COLUMN IF NOT EXISTS` + `ADD VALUE IF NOT EXISTS`
