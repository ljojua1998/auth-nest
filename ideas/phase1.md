# Phase 1 — Foundation
> Sprint 1 დასრულდა. თარიღი: 2026-05-01
> სტატუსი: DONE — ყველა QA bug შეასწორდა Phase 3-ში (bugs2.md + phase3.md)

---

## რა გაკეთდა

### 1. Cleanup
- წაიშალა `src/products/`, `src/cart/`, `src/orders/` მოდულები სრულად
- `app.module.ts`-დან ამოიღო `ProductsModule`, `CartModule`, `OrdersModule` imports
- `chat.module.ts` და `chat.service.ts` განახლდა — Products dependency ამოღებულია, WorldFantasy კონტექსტი დაემატა

### 2. Users Refactor (`src/users/`)
**user.entity.ts:**
- `balance` (decimal, $5000) → `coins` (bigint, 1,000,000)
- დაემატა `role` enum: `user` | `admin` (default: `user`)
- ამოიღო `CartItem`, `Order` relations და მათი imports
- დაემატა `@Exclude()` password და refreshToken ველებზე

**users.service.ts:**
- ამოიღო `deductBalance`, `getBalance`, `findByIdWithOrders` მეთოდები
- დაემატა `addCoins(userId, amount)` — PESSIMISTIC_WRITE lock-ით
- დაემატა `deductCoins(userId, amount)` — PESSIMISTIC_WRITE lock-ით, ნეგატიური ბალანსის დაცვა
- დაემატა `findByIdOrFail(userId)` — NotFoundException-ით
- დაემატა `updateProfile(userId, data)`
- ყველა Coin ოპერაცია `QueryRunner`-ში — ATOMIC

**auth.service.ts:**
- `getProfile` — `findByIdWithOrders` → `findByIdOrFail`, `balance` → `coins`

**jwt.strategy.ts:**
- `validate()` — ახლა `role`-საც აბრუნებს (`UsersService.findByIdOrFail`-ით)
- JWT payload-ში: `{ id, email, role }`

### 3. Common Module (`src/common/`)
- `decorators/roles.decorator.ts` — `@Roles(UserRole.ADMIN)` დეკორატორი
- `guards/roles.guard.ts` — `RolesGuard` (Reflector-ით, role შემოწმება JWT-დან)

### 4. Tiers Module (`src/tiers/`)
**Entity:** `id`, `name` (unique), `coinPrice` (bigint), `createdAt`

**Endpoints:**
- `GET /tiers` — Public, ყველა Tier coinPrice DESC
- `POST /admin/tiers` — Admin only, ახალი Tier
- `PATCH /admin/tiers/:id` — Admin only, სახელი/ფასი
- `DELETE /admin/tiers/:id` — Admin only, 204
- `POST /admin/tiers/seed` — Admin only, 5 default Tier

**Seed data:** Superstar(150k), Strong(110k), Average(80k), Backup(55k), Reserve(35k)

**Validations:** `@IsString @MaxLength(50)` name, `@IsInt @Min(1)` coinPrice, duplicate name → 409

### 5. Teams Module (`src/teams/`)
**Entity:** `id`, `name` (unique), `code` (3-char, unique), `flag`, `group` (A-L), `eliminated` (bool, default: false), `createdAt`

**Endpoints:**
- `GET /teams` — Public, group ASC + name ASC
- `GET /teams/:id` — Public
- `GET /teams/:id/players` — Public (PlayersService-ით)
- `POST /admin/teams` — Admin only
- `POST /admin/teams/seed` — Admin only, 32 World Cup ნაკრები
- `POST /admin/teams/:id/eliminate` — Admin only, `eliminated: true`

**Seed data:** 48 ნაკრები A-L ჯგუფებში (World Cup 2026 format — განახლდა commit e1e3649)

### 6. Players Module (`src/players/`)
**Entity:** `id`, `name`, `position` (enum: GK/DEF/MID/FWD), `photo`, `apiFootballId` (nullable, unique), `teamId` (FK), `tierId` (FK), `createdAt`

**Relations:** `ManyToOne → Team` (eager), `ManyToOne → Tier` (eager)

**Endpoints:**
- `GET /players` — Public, filters: `position`, `tierId`, `teamId`, `search`
- `GET /players/:id` — Public
- `POST /admin/players` — Admin only
- `PATCH /admin/players/:id` — Admin only (Tier, name, position, photo)

**Filter logic:** QueryBuilder + LOWER(name) LIKE LOWER(:search) — case-insensitive

---

## ფაილების სტრუქტურა (ახლანდელი)

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── dto/ (login.dto.ts, register.dto.ts)
│   ├── guards/jwt-auth.guard.ts
│   └── strategies/jwt.strategy.ts   ← განახლდა (+role)
├── chat/
│   ├── chat.gateway.ts
│   ├── chat.module.ts               ← განახლდა (Products ამოღება)
│   └── chat.service.ts              ← განახლდა (WorldFantasy prompt)
├── common/
│   ├── decorators/roles.decorator.ts  ✨ ახალი
│   └── guards/roles.guard.ts          ✨ ახალი
├── players/
│   ├── dto/ (create, update, filter)  ✨ ახალი
│   ├── entities/player.entity.ts      ✨ ახალი
│   ├── players.controller.ts          ✨ ახალი
│   ├── players.module.ts              ✨ ახალი
│   └── players.service.ts             ✨ ახალი
├── teams/
│   ├── dto/create-team.dto.ts         ✨ ახალი
│   ├── entities/team.entity.ts        ✨ ახალი
│   ├── teams.controller.ts            ✨ ახალი
│   ├── teams.module.ts                ✨ ახალი
│   └── teams.service.ts               ✨ ახალი
├── tiers/
│   ├── dto/ (create, update)          ✨ ახალი
│   ├── entities/tier.entity.ts        ✨ ახალი
│   ├── tiers.controller.ts            ✨ ახალი
│   ├── tiers.module.ts                ✨ ახალი
│   └── tiers.service.ts               ✨ ახალი
├── users/
│   ├── entities/user.entity.ts        ← refactor (+coins, +role, -relations)
│   ├── users.module.ts
│   └── users.service.ts               ← refactor (+addCoins, +deductCoins)
├── app.module.ts                       ← განახლდა
└── main.ts
```

---

## DB ცვლილებები (synchronize: true)

| ცხრილი | ცვლილება |
|--------|---------|
| `users` | `balance` → `coins` (bigint), `role` enum column დამატება, cart/order relations წაშლა |
| `tiers` | ✨ ახალი ცხრილი |
| `teams` | ✨ ახალი ცხრილი |
| `players` | ✨ ახალი ცხრილი |
| `cart_items` | წაიშალა |
| `orders` | წაიშალა |
| `order_items` | წაიშალა |
| `products` | წაიშალა |

---

## QA — გასატესტი სია

### Auth & Roles
- [ ] `POST /auth/register` → response-ში `coins: 1000000` (არა `balance`)
- [ ] `GET /auth/profile` → `coins` ველი სწორია
- [ ] Admin endpoint-ზე **user** JWT → `403 Forbidden`
- [ ] Admin endpoint-ზე **admin** JWT → `201/200`
- [ ] JWT payload-ში `role` ველი არსებობს

### Tiers
- [ ] `POST /admin/tiers/seed` → 5 Tier შეიქმნება
- [ ] `POST /admin/tiers/seed` ორჯერ → duplicates არ შეიქმნება
- [ ] `GET /tiers` → coinPrice DESC დალაგება
- [ ] `POST /admin/tiers` იგივე სახელით → `409 Conflict`
- [ ] `POST /admin/tiers` `coinPrice: 0` → `400 Bad Request`
- [ ] `POST /admin/tiers` `coinPrice: -1` → `400 Bad Request`
- [ ] `DELETE /admin/tiers/:id` Players-ს რომ ჰქონდეს → `500` (RESTRICT constraint)
- [ ] `PATCH /admin/tiers/9999` → `404 Not Found`

### Teams
- [ ] `POST /admin/teams/seed` → 48 ნაკრები შეიქმნება (A-L ჯგუფები)
- [ ] `GET /teams` → group ASC დალაგება
- [ ] `GET /teams/:id/players` არარსებული id → `404`
- [ ] `POST /admin/teams` code: "AB" (2 char) → `400`
- [ ] `POST /admin/teams` group: "Z" → `400`
- [ ] `POST /admin/teams/:id/eliminate` → `eliminated: true`

### Players
- [ ] `GET /players?position=GK` → მხოლოდ GK-ები
- [ ] `GET /players?position=INVALID` → `400 Bad Request`
- [ ] `GET /players?search=messi` → case-insensitive მოძებნოს
- [ ] `GET /players?tierId=1&teamId=1` → combined filters
- [ ] `POST /admin/players` არასებური `teamId` → FK constraint error
- [ ] `POST /admin/players` არასებური `tierId` → FK constraint error

### Known Edge Cases
- [ ] `coins` bigint — DB-დან string-ად მოდის, Number() კონვერტაცია სწორია?
- [ ] `user_role_enum` — PostgreSQL enum type DB-ში შეიქმნა?
- [ ] Player search SQL wildcards (`%`, `_`) — LIKE query safe-ია?
- [ ] Tier წაშლა player-ებით — error message user-friendly-ია?
