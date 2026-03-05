# Orders + Checkout System - სრული დოკუმენტაცია

## პროექტის სტრუქტურა

```
src/orders/
├── orders.module.ts              # Orders მოდული (imports: Order, OrderItem, CartModule)
├── orders.controller.ts          # HTTP endpoints (ყველა protected)
├── orders.service.ts             # ბიზნეს ლოგიკა (checkout Transaction-ით)
├── dto/
│   └── checkout.dto.ts           # { paymentMethod: 'balance' | 'card' }
└── entities/
    ├── order.entity.ts           # შეკვეთის "თავი" (totalPrice, status, paymentMethod)
    └── order-item.entity.ts      # შეკვეთის ნივთი (productId, quantity, priceAtPurchase)
```

---

## API Endpoints

| Method | Endpoint | Description | Auth | Body |
|--------|----------|-------------|------|------|
| POST | `/orders/checkout` | კალათიდან შეკვეთის გაფორმება | Yes | `{ paymentMethod: "balance" }` |
| GET | `/orders` | ჩემი ყველა შეკვეთა | Yes | - |
| GET | `/orders/:id` | კონკრეტული შეკვეთის დეტალები | Yes | - |

---

## ფაილები დეტალურად

### 1. `order.entity.ts` — შეკვეთის "თავი"

Order = შეკვეთის ზოგადი ინფორმაცია. ერთ Order-ს აქვს ბევრი OrderItem (ნივთი).

```typescript
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  // ვის ეკუთვნის შეკვეთა
  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  // შეკვეთის ჯამი
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  // სტატუსი — 'completed', მომავალში 'cancelled'
  @Column({ default: 'completed' })
  status: string;

  // გადახდის მეთოდი — 'balance' (მუშა) ან 'card' (disabled)
  @Column({ default: 'balance' })
  paymentMethod: string;

  // eager: true — Order-ს წამოიღებ → items ავტომატურად მოყვება
  // cascade: true — Order-ს save() → items-იც შეინახება
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    eager: true,
    cascade: true,
  })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}
```

**cascade: true — რას ნიშნავს?**

cascade-ის გარეშე:
```typescript
// ცალ-ცალკე უნდა შეინახო
const order = await orderRepo.save(orderData);
const item1 = await orderItemRepo.save({ orderId: order.id, ... });
const item2 = await orderItemRepo.save({ orderId: order.id, ... });
```

cascade: true-ით:
```typescript
// ერთი save()-ით ყველაფერი შეინახება!
const order = orderRepo.create({
  ...orderData,
  items: [item1Data, item2Data],  // ← items-იც მიაწოდე
});
await orderRepo.save(order);  // ← Order + 2 OrderItem ერთად შეინახება
```

**გასაუბრებისთვის:** "cascade: true ნიშნავს რომ parent entity-ს (Order) save()-ისას child entity-ებიც (OrderItems) ავტომატურად შეინახება. ეს ამარტივებს კოდს და Transaction-თან ერთად უზრუნველყოფს მონაცემთა მთლიანობას."

---

### 2. `order-item.entity.ts` — შეკვეთის ნივთი

```typescript
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  orderId: number;

  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Column()
  productId: number;

  @Column()
  quantity: number;

  // ყიდვის დროინდელი ფასი!
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtPurchase: number;
}
```

**რატომ priceAtPurchase და არა product.price?**

წარმოიდგინე:
1. დღეს ჯაკეტი $55.99-ად იყიდე
2. ხვალ მაღაზიამ ფასი $49.99-ზე შეამცირა
3. შენ orders ისტორიაში რა ფასი უნდა ჩანდეს? **$55.99** — რამდენიც გადაიხადე

თუ product.price-ს გამოვიყენებდით:
- ფასი შეიცვლება → შენი ძველი შეკვეთა "არასწორ" ფასს აჩვენებს
- ბუღალტრულად არასწორია

priceAtPurchase-ით:
- ყიდვის მომენტის ფასი "იყინება" OrderItem-ში
- პროდუქტის ფასი შეიცვალოს, შეკვეთა მაინც სწორ ფასს აჩვენებს

**გასაუბრებისთვის:** "priceAtPurchase ყიდვის დროინდელ ფასს ინახავს. ეს e-commerce-ის სტანდარტული პრაქტიკაა — Amazon, Shopify ყველა ასე აკეთებს. თუ product.price-ს გამოვიყენებდით, ფასის ცვლილება ისტორიულ შეკვეთებსაც შეცვლიდა."

---

### 3. `checkout.dto.ts` — Validation

```typescript
export class CheckoutDto {
  @IsIn(['balance', 'card'], {
    message: 'paymentMethod უნდა იყოს "balance" ან "card"',
  })
  paymentMethod: string;
}
```

**@IsIn():**
- მხოლოდ მითითებული მნიშვნელობები დაიშვება
- `"cash"` ან `"crypto"` → 400 Bad Request
- DTO-ში 'card' ვალიდურია, მაგრამ Service-ში ბლოკავთ

**რატომ DTO-ში დაიშვება 'card'?**
- DTO = ფორმატის validation ("რა ტიპისაა?")
- Service = ბიზნეს validation ("შეიძლება თუ არა?")
- მომავალში Stripe ინტეგრაციისას Service-ის ბლოკს მოხსნი, DTO-ში არაფერი შეიცვლება

---

### 4. `orders.service.ts` — Checkout (Transaction)

**ეს ყველაზე მნიშვნელოვანი ფაილია მთელ პროექტში.**

#### რა არის Transaction?

Transaction = DB ოპერაციების ჯგუფი, რომელიც ატომარულად სრულდება.
**ატომარული** = ან ყველაფერი მოხდება, ან არაფერი.

რეალური მაგალითი — ბანკის გადარიცხვა:
```
ლაშას ანგარიში: $1000 → $900  (გამოაკლო $100)
ნიკას ანგარიში: $500  → $600  (დაუმატა $100)
```
თუ პირველი ოპერაცია მოხდა, მაგრამ მეორე ჩაფეილდა:
- Transaction-ის გარეშე: ლაშას $100 გაქრა, ნიკას არ მიუვიდა
- Transaction-ით: ROLLBACK → ორივე ანგარიში ძველ მდგომარეობაში დაბრუნდა

#### QueryRunner — როგორ მუშაობს:

```typescript
// 1. QueryRunner-ის შექმნა — Transaction-ის "მართვის პანელი"
const queryRunner = this.dataSource.createQueryRunner();

// 2. DB-სთან დაკავშირება
await queryRunner.connect();

// 3. Transaction-ის დაწყება — აქედან ყველა ოპერაცია "დროებითია"
await queryRunner.startTransaction();

try {
  // 4. ოპერაციები queryRunner.manager-ით (არა repository-ით!)
  //    repository Transaction-ის გარეთ მუშაობს
  //    queryRunner.manager Transaction-ის შიგნით მუშაობს
  await queryRunner.manager.save(Order, order);
  await queryRunner.manager.update(User, userId, { balance: newBalance });
  await queryRunner.manager.delete('cart_items', { userId });

  // 5. ყველაფერი OK → COMMIT (შეინახე DB-ში სამუდამოდ)
  await queryRunner.commitTransaction();

} catch (error) {
  // 6. რამე ჩაფეილდა → ROLLBACK (ყველაფერი უკან)
  await queryRunner.rollbackTransaction();
  throw error;

} finally {
  // 7. QueryRunner-ის გათავისუფლება (მეხსიერების გაწმენდა)
  //    finally ყოველთვის გაეშვება — success-ისას ან error-ისას
  await queryRunner.release();
}
```

**რატომ queryRunner.manager და არა repository?**

```typescript
// ეს Transaction-ის გარეთ მუშაობს!
await this.ordersRepository.save(order);  // ❌ არ არის Transaction-ში

// ეს Transaction-ის შიგნით მუშაობს!
await queryRunner.manager.save(Order, order);  // ✓ Transaction-შია
```

repository = ცალკე DB connection
queryRunner.manager = Transaction-ის connection

თუ repository-ს გამოიყენებ Transaction-ის შიგნით — ის სხვა connection-ზე იმუშავებს და rollback-ი მას არ წაშლის.

**Angular პარალელი:**
```typescript
// Angular — forkJoin: ან ყველა request წარმატებული, ან error
forkJoin([
  this.http.post('/deduct-balance', ...),
  this.http.post('/create-order', ...),
  this.http.delete('/clear-cart', ...),
]).subscribe({
  next: () => console.log('ყველაფერი OK'),
  error: () => console.log('რამე ჩაფეილდა, მაგრამ rollback ვერ მოხდება!')
});
// ⚠️ განსხვავება: forkJoin-ში rollback არ არის!
// Backend Transaction-ში კი rollback ავტომატურია
```

**გასაუბრებისთვის:** "Checkout-ში QueryRunner-ით Transaction ვიყენებთ. startTransaction()-ით ვიწყებთ, queryRunner.manager-ით ოპერაციებს ვასრულებთ, commitTransaction()-ით ვინახავთ. თუ error → rollbackTransaction() ყველაფერს აბრუნებს. ეს უზრუნველყოფს მონაცემთა მთლიანობას — ან სრულდება ბალანსის შემცირება + Order-ის შექმნა + კალათის წაშლა, ან არაფერი."

---

#### Checkout Flow დეტალურად:

```
POST /orders/checkout { paymentMethod: "balance" }
Headers: Authorization: Bearer eyJhbGci...
    │
    ▼
JwtAuthGuard → req.user = { id: 1, email: "lasha@test.com" }
    │
    ▼
ValidationPipe → CheckoutDto → paymentMethod ვალიდურია? ("balance"/"card")
    │ ✗ → 400 "paymentMethod უნდა იყოს balance ან card"
    │ ✓
    ▼
OrdersService.checkout(userId: 1, { paymentMethod: "balance" })
    │
    ├── 1. paymentMethod === 'card'?
    │   └── კი → 400 "ბარათით გადახდა დროებით მიუწვდომელია"
    │   └── არა → გაგრძელება ✓
    │
    ├── 2. CartService.getCart(1) → კალათის წამოღება
    │   └── items.length === 0 → 400 "კალათა ცარიელია"
    │   └── items: [ჯაკეტი x2, მაისური x1] → გაგრძელება ✓
    │
    ├── 3. totalPrice = $55.99*2 + $22.30*1 = $134.28
    │
    ├── 4. Transaction START (queryRunner.startTransaction())
    │   │
    │   ├── User-ის წამოღება → balance: $5000
    │   │   └── $5000 < $134.28? → არა → გაგრძელება ✓
    │   │
    │   ├── Order შექმნა:
    │   │   {
    │   │     userId: 1,
    │   │     totalPrice: 134.28,
    │   │     status: "completed",
    │   │     paymentMethod: "balance",
    │   │     items: [
    │   │       { productId: 3, quantity: 2, priceAtPurchase: 55.99 },
    │   │       { productId: 5, quantity: 1, priceAtPurchase: 22.30 }
    │   │     ]
    │   │   }
    │   │   → cascade: true → Order + 2 OrderItem ერთი save()-ით
    │   │
    │   ├── ბალანსის განახლება: $5000 - $134.28 = $4865.72
    │   │   → UPDATE users SET balance = 4865.72 WHERE id = 1
    │   │
    │   ├── კალათის გასუფთავება
    │   │   → DELETE FROM cart_items WHERE userId = 1
    │   │
    │   └── COMMIT → ყველაფერი შეინახა DB-ში
    │
    ▼
Response 201: {
  message: "შეკვეთა წარმატებით გაფორმდა",
  order: {
    id: 1,
    totalPrice: "134.28",
    status: "completed",
    paymentMethod: "balance",
    items: [
      {
        id: 1,
        productId: 3,
        quantity: 2,
        priceAtPurchase: "55.99",
        product: { id: 3, title: "Mens Cotton Jacket", ... }
      },
      ...
    ],
    createdAt: "2026-03-05T..."
  },
  remainingBalance: 4865.72
}
```

---

### 5. `orders.controller.ts`

```typescript
@Controller('orders')
@UseGuards(JwtAuthGuard)  // ყველა endpoint protected
export class OrdersController {

  @Post('checkout')
  checkout(@Request() req, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(req.user.id, dto);
  }

  @Get()
  getMyOrders(@Request() req) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  @Get(':id')
  getOrderById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderById(id, req.user.id);
  }
}
```

**userId ყოველთვის req.user.id-დან:**
- სხვის შეკვეთებს ვერ ნახავ
- userId JWT token-იდან მოდის — ვერ გააყალბებ
- `getOrderById(id, req.user.id)` — ორ პირობას ამოწმებს: orderId + userId

---

### 6. `orders.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),  // ორი Entity
    CartModule,  // CartService-ს იმპორტავს (კალათის წამოსაღებად)
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
```

**Module-ების კავშირი:**
```
OrdersModule
  ├── imports: CartModule → CartService (კალათის წამოღება)
  │             └── imports: ProductsModule → ProductsService (პროდუქტის არსებობა)
  ├── DataSource → inject ხდება ავტომატურად (TypeORM-ის გლობალური კონფიგურაცია)
  └── User Entity → queryRunner.manager-ით პირდაპირ მიწვდება (არა Module import-ით)
```

---

## Profile-ში Orders ისტორია

### UsersService-ში ახალი მეთოდი:
```typescript
async findByIdWithOrders(id: number): Promise<User | null> {
  return this.usersRepository.findOne({
    where: { id },
    relations: ['orders'],  // ← orders relation-ით ტვირთავს (LEFT JOIN)
    order: { orders: { createdAt: 'DESC' } },  // ახალი შეკვეთები პირველი
  });
}
```

**relations: ['orders'] vs eager: true:**
- `eager: true` (Entity-ზე) — **ყოველთვის** ჩაიტვირთება. ზედმეტი query-ები
- `relations: ['orders']` (find-ში) — **მხოლოდ საჭიროებისას** ჩაიტვირთება
- Profile-ში გვჭირდება orders, login-ში არ გვჭირდება → relations უკეთესია

### AuthService.getProfile():
```typescript
async getProfile(userId: number) {
  const user = await this.usersService.findByIdWithOrders(userId);
  const { password: _, refreshToken: __, ...result } = user;
  return { ...result, balance: Number(user.balance) };
}
```

Profile Response:
```json
{
  "id": 1,
  "name": "Lasha",
  "email": "lasha@test.com",
  "balance": 4865.72,
  "isVerified": true,
  "orders": [
    {
      "id": 1,
      "totalPrice": "134.28",
      "status": "completed",
      "paymentMethod": "balance",
      "items": [
        {
          "productId": 3,
          "quantity": 2,
          "priceAtPurchase": "55.99",
          "product": { "title": "Mens Cotton Jacket", "image": "https://..." }
        }
      ],
      "createdAt": "2026-03-05T..."
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## DB ცხრილები და კავშირები

### ცხრილების სტრუქტურა:
```
users                    orders                  order_items
─────────────           ──────────────          ──────────────
id (PK)         ←──┐   id (PK)         ←──┐   id (PK)
name                │   userId (FK) ────┘   │   orderId (FK) ──┘
email               │   totalPrice          │   productId (FK) ──┐
password            │   status              │   quantity          │
balance             │   paymentMethod       │   priceAtPurchase   │
...                 │   createdAt           │                     │
                    │                       │                     │
cart_items          │   products            │                     │
──────────────      │   ──────────────      │                     │
id (PK)             │   id (PK)    ←───────┴─────────────────────┘
userId (FK) ────────┘   title
productId (FK) ─────────price
quantity                description
createdAt               category
                        image
                        ratingRate
                        ratingCount
```

### Relations:
| Relation | Entity A | Entity B | DB-ში |
|----------|----------|----------|-------|
| ManyToOne | CartItem.user | User | cart_items.userId FK |
| ManyToOne | CartItem.product | Product | cart_items.productId FK |
| ManyToOne | Order.user | User | orders.userId FK |
| ManyToOne | OrderItem.order | Order | order_items.orderId FK |
| ManyToOne | OrderItem.product | Product | order_items.productId FK |
| OneToMany | User.cartItems | CartItem | (inverse, DB-ში არაფერი) |
| OneToMany | User.orders | Order | (inverse, DB-ში არაფერი) |
| OneToMany | Order.items | OrderItem | (inverse, DB-ში არაფერი) |

---

## გასაუბრებისთვის — ძირითადი კითხვები და პასუხები

### 1. "როგორ მუშაობს Checkout?"
"კალათიდან ნივთებს ვიღებთ, ჯამს ვითვლით, ვამოწმებთ ბალანსი საკმარისია თუ არა. მერე Transaction-ში ვქმნით Order-ს OrderItem-ებით, ვამცირებთ ბალანსს და ვასუფთავებთ კალათას. თუ რამე ჩაფეილდება — rollback ხდება."

### 2. "რა არის Transaction და რატომ გჭირდება?"
"Transaction DB ოპერაციების ჯგუფია რომელიც ატომარულად სრულდება — ან ყველაფერი, ან არაფერი. Checkout-ში 3 ოპერაციაა: Order შექმნა, ბალანსის შემცირება, კალათის წაშლა. Transaction-ის გარეშე, თუ მეორე ოპერაცია ჩაფეილდება — ფული წავა, მაგრამ შეკვეთა არ შეიქმნება. Transaction ROLLBACK ამას აგვარებს."

### 3. "რატომ priceAtPurchase?"
"ყიდვის დროინდელ ფასს ვინახავთ OrderItem-ში. თუ product.price-ს გამოვიყენებდით და ფასი შეიცვლებოდა, ისტორიული შეკვეთა არასწორ ფასს აჩვენებდა. ეს ყველა e-commerce სისტემაში სტანდარტია."

### 4. "რა განსხვავებაა eager და relations-ს შორის?"
"eager: true Entity-ზე — ყოველთვის ჩაიტვირთება, ყოველ query-ზე JOIN გააკეთებს. relations find()-ში — მხოლოდ იქ ჩაიტვირთება სადაც მიუთითებ. Order.items eager-ია რადგან შეკვეთას ნივთების გარეშე აზრი არ აქვს. User.orders eager არ არის რადგან login-ისას არ გვჭირდება."

### 5. "რა არის cascade: true?"
"Order-ს save()-ისას OrderItem-ებიც ავტომატურად შეინახება. cascade-ის გარეშე ცალ-ცალკე save() უნდა გააკეთო. ეს კოდს ამარტივებს და მონაცემთა მთლიანობას უზრუნველყოფს."

### 6. "QueryRunner.manager vs Repository — რა განსხვავებაა?"
"Repository Transaction-ის გარეთ მუშაობს, ცალკე connection-ით. queryRunner.manager Transaction-ის connection-ს იყენებს. თუ repository-ს გამოიყენებ Transaction-ში — rollback მას არ წაშლის, რადგან სხვა connection-ზეა."

### 7. "Card payment რატომ არის disabled?"
"DTO-ში 'card' ვალიდურია (ფორმატის validation), მაგრამ Service-ში ბლოკავთ (ბიზნეს validation). მომავალში Stripe ინტეგრაციისას Service-ის ბლოკს მოვხსნით, DTO-ში არაფერი შეიცვლება. ეს Open/Closed principle-ია — გაფართოებისთვის ღია, ცვლილებისთვის დახურული."

---

## სრული API Endpoints (მთელი პროექტი)

### Auth (არსებული)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | რეგისტრაცია (balance: $5000) | No |
| POST | `/auth/login` | ავტორიზაცია → tokens | No |
| POST | `/auth/refresh` | Token განახლება | No |
| GET | `/auth/profile` | პროფილი + balance + orders | Yes |
| POST | `/auth/logout` | გამოსვლა | Yes |

### Products
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/products/seed` | 20 პროდუქტი FakeStore-დან | No |
| GET | `/products` | ყველა პროდუქტი | No |
| GET | `/products/categories` | კატეგორიების სია | No |
| GET | `/products/category/:cat` | კატეგორიით ფილტრი | No |
| GET | `/products/:id` | ერთი პროდუქტი | No |

### Cart
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cart` | კალათის ნახვა | Yes |
| POST | `/cart/add` | დამატება | Yes |
| PATCH | `/cart/update/:id` | რაოდენობის შეცვლა | Yes |
| DELETE | `/cart/remove/:id` | ერთის წაშლა | Yes |
| DELETE | `/cart/clear` | გასუფთავება | Yes |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/orders/checkout` | ყიდვა | Yes |
| GET | `/orders` | ჩემი შეკვეთები | Yes |
| GET | `/orders/:id` | შეკვეთის დეტალები | Yes |

---

## End-to-End Flow

```
1.  POST /auth/register → { balance: 5000 }
2.  POST /auth/login → { accessToken, refreshToken }
3.  POST /products/seed → 20 პროდუქტი DB-ში
4.  GET /products → პროდუქტების სია
5.  GET /products/categories → ["electronics", "jewelery", ...]
6.  POST /cart/add { productId: 3, quantity: 2 } → კალათაში
7.  POST /cart/add { productId: 5 } → კიდევ ერთი
8.  GET /cart → { items: [...], totalPrice: 134.28, totalItems: 3 }
9.  POST /orders/checkout { paymentMethod: "balance" } → ყიდვა!
10. GET /cart → { items: [], totalPrice: 0, totalItems: 0 } (გაიწმინდა)
11. GET /orders → შეკვეთების სია
12. GET /orders/1 → პირველი შეკვეთის დეტალები
13. GET /auth/profile → { balance: 4865.72, orders: [...] }
```

---

## Module-ების სრული არქიტექტურა

```
AppModule
  ├── ConfigModule.forRoot({ isGlobal: true })     ← .env ფაილი
  ├── TypeOrmModule.forRootAsync(...)               ← PostgreSQL კავშირი
  │
  ├── UsersModule
  │     ├── TypeOrmModule.forFeature([User])
  │     ├── providers: [UsersService]
  │     └── exports: [UsersService]                 ← AuthModule-ს, OrdersModule-ს
  │
  ├── AuthModule
  │     ├── imports: [UsersModule, JwtModule]
  │     ├── controllers: [AuthController]
  │     └── providers: [AuthService, JwtStrategy]
  │
  ├── ProductsModule
  │     ├── TypeOrmModule.forFeature([Product])
  │     ├── controllers: [ProductsController]
  │     ├── providers: [ProductsService]
  │     └── exports: [ProductsService]              ← CartModule-ს
  │
  ├── CartModule
  │     ├── imports: [TypeOrmModule([CartItem]), ProductsModule]
  │     ├── controllers: [CartController]
  │     ├── providers: [CartService]
  │     └── exports: [CartService]                  ← OrdersModule-ს
  │
  └── OrdersModule
        ├── imports: [TypeOrmModule([Order, OrderItem]), CartModule]
        ├── controllers: [OrdersController]
        └── providers: [OrdersService]
```
