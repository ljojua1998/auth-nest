# 🌍 WorldFantasy — პროექტის სპეციფიკაცია

> ქართული Fantasy Football პლატფორმა World Cup 2026-ისთვის
> Backend: NestJS + TypeORM + PostgreSQL (Neon)

---

## 📌 ვიზია

WorldFantasy არის **MVP / Launch Pad** — World Cup 2026-ით ვიწყებთ, შემდეგ Top 5 ევროპული ლიგით ვაგრძელებთ. მთავარი არსი: ქართული Fantasy Football, Virtual Coin-ებზე დაფუძნებული, Gambling-free.

**მთავარი მიზანი:** ივნისი 11, 2026-მდე მზად + 500+ რეგისტრირებული იუზერი.

---

## 🎯 პროდუქტის არსი (MVP — World Cup 2026)

```
იუზერი → რეგისტრაცია → 1,000,000 Coin
       → ირჩევს 15 ფეხბურთელს (Tier-ების მიხედვით)
       → 11 starter + 4 substitute
       → ირჩევს კაპიტანს (x2 ქულა)
       → თამაშობს 7 ეტაპზე
       → იღებს Coin Prize ყოველ ეტაპზე
```

---

## 🏆 ტურნირის ფორმატი

### 7 Leaderboard ეტაპი

```
1. ჯგუფური ეტაპი (3 ტური ჯამი)  → Top-ებს Coin Prize → Marketplace იხსნება
2. Round of 32                    → Coin Prize → Marketplace
3. Round of 16                    → Coin Prize → Marketplace
4. Quarter Finals                 → Coin Prize → Marketplace
5. Semi Finals                    → Coin Prize → Marketplace
6. Final                          → Coin Prize
7. საბოლოო ჯამი (მთელი ტურნირი)   → 🏆 Grand Prize
```

### ეტაპის ციკლი

```
ეტაპი დაიწყო (Marketplace დახურულია)
    ↓
მატჩები მიდის
    ↓
სტატისტიკა sync (API-Football)
    ↓
ქულები ითვლება
    ↓
Leaderboard ფიქსირდება
    ↓
Coin Prize ერიცხება Top-ებს
    ↓
Eliminated გუნდების ფეხბ. ამოდის → Coin ბრუნდება
    ↓
Marketplace იხსნება
    ↓
იუზერი ცვლის გუნდს / ფორმაციას / კაპიტანს
    ↓
Marketplace იხურება ახალი ეტაპის წინ
    ↓
[ციკლი მეორდება შემდეგი ეტაპისთვის]
```

---

## 🎮 Fantasy წესები

### გუნდის შემადგენლობა

```
სულ: 15 ფეხბურთელი
    ├── 11 Starter (მოედანზე)
    └── 4 Substitute (სათადარიგო)

პოზიციები:
    ├── 2 GK   (1 starter + 1 sub)
    ├── 5 DEF  (3-5 starter)
    ├── 5 MID  (2-5 starter)
    └── 3 FWD  (1-3 starter)

ბიუჯეტი: 1,000,000 Coin
ერთი ნაკრებიდან: ულიმიტო ფეხბურთელი
```

### ფორმაცია (Starter-ების განლაგება)

```
ფორმატი: GK-DEF-MID-FWD (ჯამში 11)
ნებადართული:
    3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-3-2, 5-4-1
ცვლილება: ტურნირის პაუზებზე
```

### კაპიტანი

```
კაპიტანი → x2 ქულა
Triple Captain Card → x3 ქულა (1-ჯერ მთელ ტურნირზე)
შეცვლა: ეტაპის პაუზებზე
```

### Cards სისტემა (World Cup-ისთვის)

```
🃏 Triple Captain (x1)
   → კაპიტნის ქულა x3 ერთ ეტაპზე
   → სტრატეგიული ეტაპისთვის (მაგ. Quarter Final)

🃏 Wildcard (x1)
   → ულიმიტო Marketplace ოპერაცია ერთ ეტაპზე
   → Coin შეზღუდვა მოქმედებს, მაგრამ ფეხბ. ცვლა უსაფრთხო

🃏 Limitless (x1)
   → ნებისმიერი ფეხბ. Coin-ის გარეშე ერთ ეტაპზე
   → ეტაპის ბოლოს გუნდი ბრუნდება წინა შემადგენლობაზე
```

### ქულების სისტემა

#### ყველა მოთამაშისთვის
| მოვლენა | ქულა |
|---|---|
| მონაწილეობა | +1 |
| 60+ წუთი მოედანზე | +1 |
| ასისტი | +3 |
| გამომუშავებული პენალტი | +2 |
| მიღებული პენალტი | -1 |
| გაცუდებული პენალტი | -2 |
| ყვითელი ბარათი | -1 |
| წითელი ბარათი | -3 |
| 2 ყვითელი + წითელი | -4 |
| ავტოგოლი | -2 |
| წარმატებული დაცვა (ყოველ x3) | +1 |

#### პოზიციის მიხედვით
| | GK | DEF | MID | FWD |
|---|---|---|---|---|
| გოლი | +6 | +6 | +5 | +4 |
| Clean Sheet (60წთ+) | +4 | +4 | +1 | — |
| გაშვებული გოლი (ყოველ x2) | -1 | -1 | — | — |
| სეივი (ყოველ x3) | +1 | — | — | — |
| პენალტის მოგერიება | +5 | — | — | — |

### Auto-Substitution

```
თუ Starter-მა 0 წუთი ითამაშა:
    → Sub ჩადგება პოზიციის მიხედვით (ცხრილში თანმიმდევრობით)
    → თუ პოზიცია არ ემთხვევა, ფორმაცია ავტომატურად რეგულირდება
```

---

## 🛒 Marketplace წესები

```
სტატუსი: ეტაპის შუალედებში ღია, მატჩების დროს დახურული

ყიდვა:
    → Coin იკლება current_price-ით
    → ფეხბ. ემატება გუნდს
    → ერთი ფეხბ. ბევრ იუზერს შეუძლია ჰყავდეს (Unlimited)

გაყიდვა:
    → Coin ემატება current_price-ით
    → ფეხბ. გუნდიდან იშლება

შენიშვნა: MVP-ში ფასი ფიქსირებულია Tier-ის მიხედვით.
        მერე დაემატება dynamic pricing.
```

---

## 💰 Tier System (Dynamic)

```
Admin-ს შეუძლია:
    ├── ახალი Tier შექმნა
    ├── Tier-ის სახელის შეცვლა
    ├── Tier-ის ფასის რედაქტირება
    └── ფეხბურთელისთვის Tier მინიჭება

საწყისი Tier-ები (Seed):
    ├── Superstar  → 150,000 Coin
    ├── Strong     → 110,000 Coin
    ├── Average    → 80,000 Coin
    ├── Backup     → 55,000 Coin
    └── Reserve    → 35,000 Coin
```

---

## 🎁 Promotions / აქციები

```
იუზერების მოზიდვის მთავარი ინსტრუმენტი:

Promo Code:
    → Admin ქმნის კოდს
    → იუზერი ააქტივებს კოდს
    → იღებს Bonus Coins
    → შეუძლია იყიდოს ფეხბურთელი

ტიპები:
    ├── First Login Bonus     → +50,000 Coin
    ├── Promo Code Campaign   → custom Coin
    ├── Friend Referral       → +30,000 Coin (მოგვიანებით)
    └── Event Reward          → custom (Eter, Black Friday)

შეზღუდვები:
    ├── Code-ს მაქს. გამოყენება (max_uses)
    ├── ერთი იუზერი ერთხელ (one_per_user)
    └── ვადის ბოლო (expires_at)
```

---

## 🏅 Prize სისტემა

### Coin Prize (ყოველ ეტაპზე)

```
🥇 1ლი → 1,000,000 Coin
🥈 2რე → 900,000 Coin
🥉 3რე → 800,000 Coin
4რთე  → 700,000 Coin
5მე   → 600,000 Coin
```

### Tie-break

```
თანაბარი ქულებისას → Prize იყოფა თანაბრად

მაგ: ორი იუზერი იყოფს 1ლ ადგილს
    → (1,000,000 + 900,000) / 2 = 950,000 თითოეულს
    → შემდეგი იუზერი 3მე ადგილის Prize-ს იღებს
```

---

## 🗄 Database Schema

```
┌─────────────┐
│   users     │ (existing)
└──────┬──────┘
       │
       ├──► user_teams ────► players ────► tiers
       │                       │
       │                       └────► teams (ნაკრები)
       │
       ├──► user_team_history (transfer history)
       │
       ├──► user_cards (Wildcard, Limitless, Triple Captain)
       │
       ├──► transactions (Coin movement audit)
       │
       └──► promo_redemptions ────► promo_codes

┌─────────────┐
│ tournaments │
└──────┬──────┘
       │
       └──► leaderboard_snapshots ────► users

┌─────────────┐
│   matches   │
└──────┬──────┘
       │
       └──► match_stats ────► players
```

### Entity-ების ჩამონათვალი

| Entity | აღწერა | ცვლილება |
|---|---|---|
| `users` | იუზერები (existing, +coins, +subscription) | refactor |
| `tiers` | ფეხბურთელის ფასი (Superstar...) | ✨ ახალი |
| `teams` (national) | ნაკრებები (Brazil, Argentina...) | ✨ ახალი |
| `players` | ფეხბურთელები | ✨ ახალი |
| `user_teams` | იუზერის გუნდი (15 ფეხბ.) | ✨ ახალი |
| `user_team_history` | ყიდვა-გაყიდვის ისტორია | ✨ ახალი |
| `tournaments` | ეტაპები (Group, R32...) | ✨ ახალი |
| `matches` | მატჩები | ✨ ახალი |
| `match_stats` | ფეხბურთელის სტატისტიკა მატჩზე | ✨ ახალი |
| `leaderboard_snapshots` | ეტაპის Leaderboard | ✨ ახალი |
| `user_cards` | Cards (Wildcard...) | ✨ ახალი |
| `transactions` | Coin movement audit | ✨ ახალი |
| `promo_codes` | აქციების კოდები | ✨ ახალი |
| `promo_redemptions` | ვინ რომელი კოდი გამოიყენა | ✨ ახალი |

### წასაშლელი / Refactor (auth-nest-დან)

| Old Entity | რა ვუყოთ |
|---|---|
| `products` | წავშალოთ (Player-ად ვერ გადავაკეთოთ — ლოგიკა სხვაა) |
| `categories` | წავშალოთ |
| `cart` | წავშალოთ (User Team არის ახალი მოდელი) |
| `orders` | წავშალოთ (Transactions ცალკე) |
| `chat` | დროებით **გავტოვოთ** — News modul-ისთვის გამოგვადგება |

---

## 🌐 API Endpoints

### 🔐 Auth (existing — შენარჩუნება)
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/profile
```

### 👤 Users
```
GET    /users/me                    → ჩემი პროფილი + Coin balance
GET    /users/me/stats              → ჩემი ჯამური ქულა, rank
PATCH  /users/me                    → username, avatar განახლება
```

### 🏆 Tiers
```
GET    /tiers                       → ყველა Tier (Public)
POST   /admin/tiers                 → ახალი Tier (Admin)
PATCH  /admin/tiers/:id             → ფასის/სახელის შეცვლა (Admin)
DELETE /admin/tiers/:id             → წაშლა (Admin)
```

### 🌍 Teams (ნაკრები)
```
GET    /teams                       → ყველა ნაკრები
GET    /teams/:id                   → ნაკრების დეტალები + ფეხბურთელები
GET    /teams/:id/players           → ნაკრების ფეხბურთელები
POST   /admin/teams/sync            → API-Football-დან sync
```

### ⚽ Players
```
GET    /players                     → ყველა ფეხბ. (filters: position, tier, team, search, available)
GET    /players/:id                 → დეტალები + სტატისტიკა
GET    /players/:id/stats           → მატჩების სტატისტიკა
POST   /admin/players/sync          → API-Football-დან sync
PATCH  /admin/players/:id           → Tier-ის შეცვლა (Admin)
```

### 🛒 Marketplace
```
GET    /market                      → ხელმისაწვდომი ფეხბ. (Marketplace ღია?)
GET    /market/status               → ღია/დახურული + open/close დრო
POST   /market/buy                  → ფეხბ. ყიდვა (body: playerId)
POST   /market/sell                 → ფეხბ. გაყიდვა (body: playerId)
```

### 👥 My Team
```
GET    /my-team                     → ჩემი 15 ფეხბ. + formation
POST   /my-team/formation           → ფორმაცია შეცვლა (3-4-3, 4-4-2...)
POST   /my-team/captain             → კაპიტნის არჩევა
POST   /my-team/lineup              → starter/sub განლაგება
GET    /my-team/history             → ყიდვა-გაყიდვის ისტორია
```

### 🃏 Cards
```
GET    /cards                       → ჩემი Cards (გამოყენებული/არ)
POST   /cards/triple-captain        → Triple Captain აქტივაცია
POST   /cards/wildcard              → Wildcard აქტივაცია
POST   /cards/limitless             → Limitless აქტივაცია
```

### 🏅 Tournament & Leaderboard
```
GET    /tournaments                 → ყველა ეტაპი + სტატუსი
GET    /tournaments/current         → მიმდინარე ეტაპი
GET    /leaderboard/:tournamentId   → Top 100 + own rank
GET    /leaderboard/global          → მთავარი (საბოლოო ჯამი)
```

### ⚽ Matches
```
GET    /matches                     → მიმდინარე/მომავალი მატჩები
GET    /matches/:id                 → მატჩის დეტალები + სტატისტიკა
GET    /matches/live                → Live მატჩები
```

### 🎁 Promotions
```
POST   /promo/redeem                → კოდის გააქტივება (body: code)
GET    /promo/my-redemptions        → ჩემი გამოყენებული კოდები
POST   /admin/promo                 → ახალი Promo Code (Admin)
GET    /admin/promo                 → ყველა Promo Code (Admin)
PATCH  /admin/promo/:id             → კოდის რედაქტირება
DELETE /admin/promo/:id             → წაშლა
```

### 💸 Transactions
```
GET    /transactions/me             → ჩემი Coin movement ისტორია
```

### ⚙️ Admin Operations (Postman-ით გასაშვები)
```
POST   /admin/sync-match-stats      → API-Football → DB
POST   /admin/calculate-points      → ქულების დარიცხვა
POST   /admin/process-elimination   → გავარდნილების ამოშლა
POST   /admin/distribute-prizes     → Coin Prize დარიცხვა
POST   /admin/open-marketplace      → Marketplace გახსნა
POST   /admin/close-marketplace     → Marketplace დახურვა
POST   /admin/snapshot-leaderboard  → Leaderboard ფიქსაცია
```

---

## 🤖 Background Agents / Services (NestJS)

### MVP-ისთვის (Postman-ით)
1. **MatchSyncService** — API-Football → matches + match_stats
2. **ScoringService** — match_stats → user-ების ქულები
3. **LeaderboardService** — ეტაპის snapshot, rank-ები
4. **PrizeDistributionService** — Top-ებისთვის Coin
5. **EliminationService** — გავარდნილი გუნდი → ფეხბ. ამოშლა + Coin დაბრუნება
6. **MarketplaceService** — open/close logic
7. **PromoService** — code validation + bonus coin

### მოგვიანებით (Cron / BullMQ)
8. **PriceUpdateService** — dynamic price calculation
9. **NotificationService** — push notifications
10. **NewsBotService** — AI ნიუსების გენერაცია (Gemini)

---

## 🛠 Tech Stack

```
✅ NestJS v11           (already)
✅ TypeORM              (already)
✅ PostgreSQL (Neon)    (already)
✅ JWT Auth             (already)
✅ Socket.IO            (already — News-ისთვის გამოგვადგება)
✅ Google Gemini        (already — News-ისთვის)
✅ Swagger              (already)
✅ class-validator      (already)
✅ bcryptjs             (already)

➕ axios                (API-Football call-ებისთვის)
➕ @nestjs/schedule     (Cron — მერე)
➕ @nestjs/throttler    (Rate limiting)
```

---

## 📁 Module სტრუქტურა

```
src/
├── auth/                    ✅ existing
├── users/                   🔄 refactor (+coins, +subscription)
├── tiers/                   ✨ ახალი
├── teams/                   ✨ ახალი (ნაკრები)
├── players/                 ✨ ახალი
├── user-teams/              ✨ ახალი (იუზერის გუნდი)
├── marketplace/             ✨ ახალი
├── cards/                   ✨ ახალი
├── tournaments/             ✨ ახალი
├── matches/                 ✨ ახალი
├── leaderboard/             ✨ ახალი
├── transactions/            ✨ ახალი
├── promotions/              ✨ ახალი
├── admin/                   ✨ ახალი (Operations)
├── integrations/
│   └── api-football/        ✨ ახალი
├── chat/                    ✅ existing (News-ისთვის)
└── common/
    ├── decorators/          (Roles, etc.)
    ├── guards/              (JwtAuthGuard, RolesGuard)
    ├── interceptors/
    └── utils/
```

---

## 🚀 Build Plan (Sprint-ები)

### Sprint 1: Foundation (1 კვირა)
- [ ] auth-nest-დან products/cart/orders/categories წაშლა
- [ ] users entity refactor (+coins, +role)
- [ ] tiers entity + module + CRUD
- [ ] teams entity + module
- [ ] players entity + module
- [ ] Seed scripts (test data)

### Sprint 2: Fantasy Core (1 კვირა)
- [ ] user-teams entity + service
- [ ] Marketplace buy/sell logic
- [ ] Race condition დაცვა (transactions)
- [ ] Formation/Captain logic
- [ ] Cards entity + service

### Sprint 3: Tournament & Scoring (1 კვირა)
- [ ] tournaments + matches + match_stats entities
- [ ] API-Football integration
- [ ] Scoring engine (ქულების სქემა)
- [ ] Auto-substitution logic
- [ ] Leaderboard service

### Sprint 4: Operations (1 კვირა)
- [ ] Elimination service
- [ ] Prize distribution
- [ ] Transactions audit
- [ ] Admin endpoints

### Sprint 5: Promotions & Polish (1 კვირა)
- [ ] Promo codes + redemption
- [ ] First Login Bonus
- [ ] Swagger სრული დოკუმენტაცია
- [ ] Rate limiting
- [ ] Error handling

### Sprint 6: Beta (მაისი)
- [ ] 10-20 მეგობრით ტესტი
- [ ] Bug fixes
- [ ] Performance tuning

---

## ⚠️ კრიტიკული საკითხები

### 1. Race Condition (Marketplace)
```
პრობლემა: ორი იუზერი ერთდროულად ყიდულობს ერთსა და იმავე ფეხბურთელს

გამოსავალი (Unlimited model-ში):
    → Coin balance row-level lock-ით (PESSIMISTIC_WRITE)
    → SERIALIZABLE transaction
    → ერთდროული ყიდვა შესაძლებელია, მაგრამ Coin ბალანსი დაცულია
```

### 2. Coin ბალანსი მინუსში
```
ვალიდაცია 3 layer:
    1. Frontend (UI)
    2. DTO validator (class-validator)
    3. Service (DB transaction-ში)
```

### 3. Scoring დასახვეწი (პოსტ-მატჩი)
```
update.md წერილი: 2 საათიანი window
    → მატჩი დასრულდა
    → API-Football-ი სტატისტიკას ახალისებს 1-2 საათში
    → ჩვენ ყოველ X წუთში re-sync და re-calculate
    → 2 საათის მერე ქულა ფიქსირდება
```

### 4. Eliminated ფეხბ. გასაყიდი listing-ი
```
Unlimited model-ში listing არ გვაქვს — direct buy/sell from system pool
ე.ი. ეს პრობლემა აღარ გვექნება
```

---

## 📊 Success Metrics

```
ივნისი 11   → 500+ რეგისტრირებული
ივლისი 19   → 2,000+ რეგისტრირებული
წელიწადი 1  → პირველი სპონსორი + Subscription
```

---

## 📝 შენიშვნები

- ყველა Coin ოპერაცია წერია `transactions` ცხრილში → audit
- ყველა Critical action transaction-ში → ATOMIC
- API-Football quota — Paid plan-ი ($20/თვე) ივნისიდან
- WebSocket — News real-time-ისთვის (chat module უკვე არის)

---

*WorldFantasy — განახლდა 2026-05-01*
