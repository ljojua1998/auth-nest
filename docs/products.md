# Shop System - სრული გეგმა

## რას ვაკეთებთ?

არსებულ Auth სისტემაზე ვამატებთ მაღაზიის ფუნქციონალს:
- 20 პროდუქტის ჩაწერა DB-ში (FakeStore API-დან)
- იუზერს აქვს ბალანსი ($5000 რეგისტრაციისას)
- კალათა (Cart) — პროდუქტების დამატება/წაშლა
- შეკვეთა (Order) — კალათიდან ყიდვა ბალანსით
- შეკვეთების ისტორია პროფილში

## მონაცემთა წყარო

FakeStore API: `https://fakestoreapi.com/products` — 20 პროდუქტი.
იუზერი პროდუქტებს არ ამატებს — მხოლოდ ეს 20 პროდუქტია მაღაზიაში.

## გადახდის ოფციები

- **ბალანსიდან (Balance)** — default, მუშა ოფცია
- **ბარათით (Card)** — ფრონტში გამოჩნდება, მაგრამ disabled იქნება (მომავლისთვის)

---

## DB ცხრილები (Entities)

### Product Entity
```typescript
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'text' })
  description: string;

  @Column()
  category: string;

  @Column()
  image: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  ratingRate: number;

  @Column({ default: 0 })
  ratingCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

### User Entity (განახლება)
```typescript
// არსებულ User entity-ში ემატება:
@Column({ type: 'decimal', precision: 10, scale: 2, default: 5000 })
balance: number;
```

### CartItem Entity
```typescript
@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.cartItems, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE' })
  product: Product;

  @Column()
  productId: number;

  @Column({ default: 1 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Order Entity
```typescript
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.orders, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ default: 'completed' })
  status: string;  // 'completed' | 'cancelled'

  @Column({ default: 'balance' })
  paymentMethod: string;  // 'balance' | 'card'

  @OneToMany(() => OrderItem, orderItem => orderItem.order, { eager: true, cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}
```

### OrderItem Entity
```typescript
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  orderId: number;

  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Column()
  productId: number;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtPurchase: number;  // ყიდვის დროინდელი ფასი (ფასი შეიძლება შეიცვალოს)
}
```

### User Entity-ს relations (განახლება)
```typescript
// user.entity.ts-ში ემატება:
@OneToMany(() => CartItem, cartItem => cartItem.user)
cartItems: CartItem[];

@OneToMany(() => Order, order => order.user)
orders: Order[];
```

---

## API Endpoints

### Products
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/products` | ყველა პროდუქტის ნახვა | No |
| GET | `/products/:id` | ერთი პროდუქტის ნახვა | No |
| GET | `/products/category/:category` | კატეგორიით ფილტრი | No |
| POST | `/products/seed` | FakeStore API-დან DB-ში ჩაწერა (ერთხელ) | No |

### Cart
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cart` | კალათის ნახვა | Yes |
| POST | `/cart/add` | პროდუქტის დამატება | Yes |
| PATCH | `/cart/update/:id` | რაოდენობის შეცვლა | Yes |
| DELETE | `/cart/remove/:id` | პროდუქტის წაშლა კალათიდან | Yes |
| DELETE | `/cart/clear` | კალათის გასუფთავება | Yes |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/orders/checkout` | კალათიდან შეკვეთის გაფორმება | Yes |
| GET | `/orders` | ჩემი შეკვეთები | Yes |
| GET | `/orders/:id` | კონკრეტული შეკვეთის დეტალები | Yes |

---

## ფაილების სტრუქტურა

```
src/
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── entities/
│       └── product.entity.ts
├── cart/
│   ├── cart.module.ts
│   ├── cart.controller.ts
│   ├── cart.service.ts
│   ├── dto/
│   │   ├── add-to-cart.dto.ts
│   │   └── update-cart.dto.ts
│   └── entities/
│       └── cart-item.entity.ts
├── orders/
│   ├── orders.module.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── dto/
│   │   └── checkout.dto.ts
│   └── entities/
│       ├── order.entity.ts
│       └── order-item.entity.ts
└── users/
    └── entities/
        └── user.entity.ts  (+ balance, relations)
```

---

## ეტაპები (ნაბიჯ-ნაბიჯ)

---

## ეტაპი 1 — Product Entity + Seed (FakeStore API-დან ჩაწერა)

### რას ვისწავლით:
- NestJS-ში HTTP request გაგზავნა (HttpModule / fetch)
- Entity შექმნა + DB-ში მონაცემების bulk insert
- External API-დან მონაცემების მიღება და ტრანსფორმაცია

### ნაბიჯები:
1. **Product Entity შექმნა** — `src/products/entities/product.entity.ts`
2. **ProductsModule შექმნა** — `src/products/products.module.ts`
3. **ProductsService შექმნა** — `src/products/products.service.ts`
   - `seed()` — FakeStore API-დან 20 პროდუქტის წამოღება და DB-ში ჩაწერა
   - `findAll()` — ყველა პროდუქტი
   - `findOne(id)` — ერთი პროდუქტი
   - `findByCategory(category)` — კატეგორიით ფილტრი
4. **ProductsController შექმნა** — `src/products/products.controller.ts`
5. **AppModule-ში დამატება**
6. **ტესტი:** `POST /products/seed` → DB-ში 20 პროდუქტი ჩაიწერება
7. **ტესტი:** `GET /products` → 20 პროდუქტი დაბრუნდება

### Seed Flow:
```
POST /products/seed
    │
    ▼
ProductsService.seed()
    ├── fetch('https://fakestoreapi.com/products') → 20 პროდუქტი
    ├── თითოეულის transform (rating.rate → ratingRate, rating.count → ratingCount)
    ├── repository.save(products) → INSERT INTO products
    ▼
Response 201: { message: "20 პროდუქტი წარმატებით ჩაიწერა" }
```

**Angular პარალელი:** seed = HttpClient.get() + .subscribe(), მაგრამ backend-ზე DB-ში ინახება

### ფაილები:
- [x] `src/products/entities/product.entity.ts`
- [x] `src/products/products.service.ts`
- [x] `src/products/products.controller.ts`
- [x] `src/products/products.module.ts`
- [x] `app.module.ts` — ProductsModule import

---

## ეტაპი 2 — User Balance (ბალანსის დამატება)

### რას ვისწავლით:
- არსებული Entity-ის განახლება (migration-ის გარეშე, synchronize: true)
- Default values DB-ში

### ნაბიჯები:
1. **User Entity-ში balance ველის დამატება** — default: 5000
2. **UsersService-ში balance მეთოდები:**
   - `getBalance(userId)` — ბალანსის ნახვა
   - `deductBalance(userId, amount)` — თანხის გამოკლება
3. **AuthService.register()-ში** — ბალანსი ავტომატურად 5000 დაესეტება (Entity default-ით)
4. **Profile endpoint-ში** — ბალანსი ჩანს response-ში
5. **ტესტი:** ახალი იუზერის რეგისტრაცია → profile-ში balance: 5000

### ფაილები:
- [x] `src/users/entities/user.entity.ts` — balance ველი
- [x] `src/users/users.service.ts` — balance მეთოდები

---

## ეტაპი 3 — Cart System (კალათა)

### რას ვისწავლით:
- ManyToOne / OneToMany relations (TypeORM)
- ერთი entity-ს კავშირი რამდენიმე entity-სთან
- JwtAuthGuard-ის გამოყენება ყველა endpoint-ზე

### ნაბიჯები:
1. **CartItem Entity შექმნა** — `src/cart/entities/cart-item.entity.ts`
   - ManyToOne → User (ვის ეკუთვნის)
   - ManyToOne → Product (რა პროდუქტია)
   - quantity — რაოდენობა
2. **User Entity-ში relation დამატება** — `@OneToMany(() => CartItem, ...)`
3. **DTOs შექმნა:**
   - `AddToCartDto` — { productId: number, quantity?: number }
   - `UpdateCartDto` — { quantity: number }
4. **CartService შექმნა:**
   - `getCart(userId)` — კალათის ნახვა (პროდუქტებით + ჯამი)
   - `addToCart(userId, dto)` — დამატება (თუ უკვე არის → quantity++)
   - `updateQuantity(cartItemId, userId, dto)` — რაოდენობის შეცვლა
   - `removeFromCart(cartItemId, userId)` — წაშლა
   - `clearCart(userId)` — კალათის გასუფთავება
5. **CartController შექმნა** — ყველა endpoint @UseGuards(JwtAuthGuard)
6. **CartModule შექმნა + AppModule-ში დამატება**

### Cart Flow:
```
POST /cart/add { productId: 3, quantity: 2 }
Headers: Authorization: Bearer <token>
    │
    ▼
JwtAuthGuard → req.user = { id: 1, email: "..." }
    ▼
CartService.addToCart(userId: 1, { productId: 3, quantity: 2 })
    ├── Product არსებობს? → არა → 404
    ├── უკვე კალათაშია? → კი → quantity += 2
    │                    → არა → ახალი CartItem შექმნა
    ▼
Response 201: { message: "პროდუქტი კალათაში დაემატა", cartItem: {...} }
```

```
GET /cart
Headers: Authorization: Bearer <token>
    │
    ▼
CartService.getCart(userId: 1)
    ├── SELECT cart_items + products WHERE userId = 1
    ▼
Response 200: {
  items: [
    { id: 1, product: { title: "Mens Cotton Jacket", price: 55.99 }, quantity: 2 },
    { id: 2, product: { title: "...", price: 22.3 }, quantity: 1 }
  ],
  totalPrice: 134.28,
  totalItems: 3
}
```

### ფაილები:
- [x] `src/cart/entities/cart-item.entity.ts`
- [x] `src/cart/dto/add-to-cart.dto.ts`
- [x] `src/cart/dto/update-cart.dto.ts`
- [x] `src/cart/cart.service.ts`
- [x] `src/cart/cart.controller.ts`
- [x] `src/cart/cart.module.ts`
- [x] `src/users/entities/user.entity.ts` — cartItems relation
- [x] `app.module.ts` — CartModule import

---

## ეტაპი 4 — Orders + Checkout (შეკვეთა + ყიდვა)

### რას ვისწავლით:
- Transaction-ები (ატომარული ოპერაცია — ან ყველაფერი მოხდება, ან არაფერი)
- OneToMany + cascade save
- ბიზნეს ლოგიკის validation (საკმარისი ბალანსი?)

### ნაბიჯები:
1. **Order Entity შექმნა** — `src/orders/entities/order.entity.ts`
2. **OrderItem Entity შექმნა** — `src/orders/entities/order-item.entity.ts`
3. **User Entity-ში orders relation დამატება**
4. **CheckoutDto შექმნა** — { paymentMethod: 'balance' | 'card' }
5. **OrdersService შექმნა:**
   - `checkout(userId, dto)` — მთავარი ლოგიკა
   - `getMyOrders(userId)` — ჩემი შეკვეთები
   - `getOrderById(orderId, userId)` — კონკრეტული შეკვეთა
6. **OrdersController შექმნა**
7. **OrdersModule შექმნა + AppModule-ში დამატება**

### Checkout Flow (ყველაზე მნიშვნელოვანი!):
```
POST /orders/checkout { paymentMethod: "balance" }
Headers: Authorization: Bearer <token>
    │
    ▼
JwtAuthGuard → req.user = { id: 1, email: "..." }
    ▼
OrdersService.checkout(userId: 1, { paymentMethod: "balance" })
    │
    ├── 1. paymentMethod === 'card' → 400 "ბარათით გადახდა დროებით მიუწვდომელია"
    │
    ├── 2. კალათის წამოღება
    │   └── ცარიელია → 400 "კალათა ცარიელია"
    │
    ├── 3. ჯამური ფასის დათვლა
    │   └── totalPrice = sum(item.product.price * item.quantity)
    │
    ├── 4. ბალანსის შემოწმება
    │   └── balance < totalPrice → 400 "არასაკმარისი ბალანსი"
    │
    ├── 5. Transaction START
    │   ├── Order შექმნა (totalPrice, paymentMethod, status: 'completed')
    │   ├── OrderItem-ები შექმნა (თითოეული cart item → order item)
    │   ├── ბალანსის განახლება (balance -= totalPrice)
    │   ├── კალათის გასუფთავება
    │   └── Transaction COMMIT
    │
    ▼
Response 201: {
  message: "შეკვეთა წარმატებით გაფორმდა",
  order: {
    id: 1,
    totalPrice: 134.28,
    paymentMethod: "balance",
    status: "completed",
    items: [...],
    createdAt: "2024-..."
  },
  remainingBalance: 4865.72
}
```

### რატომ Transaction?
```
წარმოიდგინე Transaction-ის გარეშე:
1. ბალანსი შემცირდა ✓
2. Order შეიქმნა ✓
3. კალათის წაშლა — ERROR! ❌
შედეგი: ფული წავიდა, მაგრამ შეკვეთა არასრულია

Transaction-ით:
1. ბალანსი შემცირდა ✓
2. Order შეიქმნა ✓
3. კალათის წაშლა — ERROR! ❌
Transaction ROLLBACK → ყველაფერი უკან დაბრუნდა, თითქოს არაფერი მომხდარა
```

**Angular პარალელი:** Transaction = forkJoin() — ან ყველა request წარმატებით დასრულდება, ან არცერთი

### ფაილები:
- [ ] `src/orders/entities/order.entity.ts`
- [ ] `src/orders/entities/order-item.entity.ts`
- [ ] `src/orders/dto/checkout.dto.ts`
- [ ] `src/orders/orders.service.ts`
- [ ] `src/orders/orders.controller.ts`
- [ ] `src/orders/orders.module.ts`
- [ ] `src/users/entities/user.entity.ts` — orders relation
- [ ] `app.module.ts` — OrdersModule import

---

## ეტაპი 5 — Profile გაფართოება

### რას ვისწავლით:
- არსებული endpoint-ის გაფართოება
- Relations-ის eager/lazy loading

### ნაბიჯები:
1. **Profile response-ში დამატება:**
   - balance — მიმდინარე ბალანსი
   - orders — შეკვეთების ისტორია (ბოლო 10)
2. **ტესტი:** რეგისტრაცია → ყიდვა → profile-ში ჩანს ახალი ბალანსი + შეკვეთა

### განახლებული Profile Response:
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
      "totalPrice": 134.28,
      "status": "completed",
      "paymentMethod": "balance",
      "createdAt": "2024-...",
      "items": [
        {
          "product": { "title": "Mens Cotton Jacket", "image": "..." },
          "quantity": 2,
          "priceAtPurchase": 55.99
        }
      ]
    }
  ],
  "createdAt": "2024-...",
  "updatedAt": "2024-..."
}
```

### ფაილები:
- [ ] `src/auth/auth.service.ts` — getProfile() განახლება

---

## სრული Request Flow (End-to-End)

```
1. POST /auth/register → balance: 5000
2. POST /auth/login → accessToken + refreshToken
3. POST /products/seed → 20 პროდუქტი DB-ში (ერთხელ)
4. GET /products → პროდუქტების ნახვა
5. POST /cart/add { productId: 3, quantity: 2 } → კალათაში დამატება
6. POST /cart/add { productId: 5, quantity: 1 } → კიდევ ერთი
7. GET /cart → კალათის ნახვა (items + totalPrice)
8. POST /orders/checkout { paymentMethod: "balance" } → ყიდვა!
9. GET /orders → შეკვეთების ისტორია
10. GET /auth/profile → balance: 4865.72 + orders
```

---

## DB ცხრილების კავშირები (Relations)

```
users (1) ──── (*) cart_items (*) ──── (1) products
  │
  └── (1) ──── (*) orders (1) ──── (*) order_items (*) ──── (1) products
```

- User-ს აქვს ბევრი CartItem (OneToMany)
- User-ს აქვს ბევრი Order (OneToMany)
- Order-ს აქვს ბევრი OrderItem (OneToMany)
- CartItem → Product (ManyToOne)
- OrderItem → Product (ManyToOne)

---

## მნიშვნელოვანი კონცეფციები გასაუბრებისთვის

### Transaction
"Checkout-ში Transaction ვიყენებთ რომ ბალანსის შემცირება, Order-ის შექმნა და კალათის წაშლა ატომარულად მოხდეს. თუ რომელიმე ნაბიჯი ვერ შესრულდება — ყველაფერი rollback ხდება."

### priceAtPurchase
"OrderItem-ში ვინახავთ ყიდვის დროინდელ ფასს, არა მიმდინარეს. თუ პროდუქტის ფასი შეიცვლება, ისტორიული შეკვეთა მაინც სწორ ფასს აჩვენებს."

### Eager vs Lazy Loading
"eager: true — relation ავტომატურად ჩაიტვირთება query-სთან ერთად. Lazy — მხოლოდ საჭიროებისას. Cart-ში product eager-ია რადგან ყოველთვის გვჭირდება."

### paymentMethod
"ორი ოფცია: balance (მუშა) და card (disabled). ეს მომავალი Stripe ინტეგრაციისთვისაა მომზადებული. Backend validation-ით card-ს ბლოკავთ."
