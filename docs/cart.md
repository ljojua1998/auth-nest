# Cart System - დოკუმენტაცია

## პროექტის სტრუქტურა

```
src/cart/
├── cart.module.ts              # Cart მოდული (imports: CartItem + ProductsModule)
├── cart.controller.ts          # HTTP endpoints (ყველა protected JwtAuthGuard-ით)
├── cart.service.ts             # ბიზნეს ლოგიკა (CRUD + ფასის დათვლა)
├── dto/
│   ├── add-to-cart.dto.ts      # { productId: number, quantity?: number }
│   └── update-cart.dto.ts      # { quantity: number }
└── entities/
    └── cart-item.entity.ts     # DB ცხრილი (userId, productId, quantity)
```

---

## API Endpoints

| Method | Endpoint | Description | Auth | Body |
|--------|----------|-------------|------|------|
| GET | `/cart` | კალათის ნახვა | Yes | - |
| POST | `/cart/add` | პროდუქტის დამატება | Yes | `{ productId, quantity? }` |
| PATCH | `/cart/update/:id` | რაოდენობის შეცვლა | Yes | `{ quantity }` |
| DELETE | `/cart/remove/:id` | ერთი ნივთის წაშლა | Yes | - |
| DELETE | `/cart/clear` | კალათის გასუფთავება | Yes | - |

---

## ფაილები დეტალურად

### 1. `cart-item.entity.ts` — DB ცხრილის სტრუქტურა

```typescript
@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  // ManyToOne — ბევრი CartItem ეკუთვნის ერთ User-ს
  // onDelete: 'CASCADE' — User წაიშალა → მისი CartItem-ებიც წაიშლება
  @ManyToOne(() => User, (user) => user.cartItems, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  // eager: true — CartItem-ის წამოღებისას Product ავტომატურად მოყვება (JOIN)
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

**ManyToOne vs OneToMany:**
- `@ManyToOne` — "ბევრი CartItem → ერთი User". DB-ში FOREIGN KEY (userId) ქმნის
- `@OneToMany` — "ერთი User → ბევრი CartItem". DB-ში არაფერს ქმნის, მხოლოდ TypeORM-ის კავშირია
- ორივე ერთად ქმნის bidirectional relation-ს

**eager: true vs false:**
- `eager: true` — `find()` ავტომატურად JOIN-ს აკეთებს. კალათაში პროდუქტის სახელი/ფასი ყოველთვის გვჭირდება
- `eager: false` (default) — მხოლოდ `relations: ['product']` პარამეტრით ჩაიტვირთება

**onDelete: 'CASCADE':**
- User წაიშალა → მისი cart_items ჩანაწერებიც წაიშლება
- Product წაიშალა → შესაბამისი cart_items წაიშლება
- ალტერნატივა: `'SET NULL'` — FK = null, ჩანაწერი რჩება

**გასაუბრებისთვის:** "ManyToOne relation FOREIGN KEY-ს ქმნის DB-ში. eager: true ავტომატურად LEFT JOIN-ს აკეთებს. CASCADE delete-ით parent-ის წაშლა child ჩანაწერებსაც წაშლის."

---

### 2. DTOs — Request Validation

```typescript
// add-to-cart.dto.ts
export class AddToCartDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;  // default 1
}

// update-cart.dto.ts
export class UpdateCartDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
```

**@IsOptional():**
- თუ ველი body-ში არ არის → validation-ს გამოტოვებს
- `quantity?: number` + `@IsOptional()` = არასავალდებულო
- Service-ში `const { quantity = 1 } = dto` — default 1

**გასაუბრებისთვის:** "IsOptional class-validator-ის დეკორატორია. თუ ველი არ არის request-ში, validation-ს არ ამოწმებს. Destructuring default-ით service-ში ვანიჭებთ default მნიშვნელობას."

---

### 3. `cart.service.ts` — ბიზნეს ლოგიკა

#### addToCart — პროდუქტის დამატება:
```typescript
async addToCart(userId: number, dto: AddToCartDto) {
  // 1. პროდუქტის არსებობის შემოწმება
  await this.productsService.findOne(productId);  // არ არსებობს → 400

  // 2. უკვე კალათაშია?
  const existingItem = await this.cartRepository.findOne({
    where: { userId, productId },
  });

  if (existingItem) {
    // 3a. კი → რაოდენობას ვზრდით
    existingItem.quantity += quantity;
    await this.cartRepository.save(existingItem);
  } else {
    // 3b. არა → ახალი ჩანაწერი
    const cartItem = this.cartRepository.create({ userId, productId, quantity });
    await this.cartRepository.save(cartItem);
  }
}
```

#### getCart — კალათის ნახვა:
```typescript
async getCart(userId: number) {
  const items = await this.cartRepository.find({ where: { userId } });

  // reduce — მასივს ერთ მნიშვნელობამდე "ამცირებს"
  const totalPrice = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity, 0
  );
  // Number() — decimal DB-დან string-ად მოდის, number-ად ვაბრუნებთ

  return { items, totalPrice, totalItems };
}
```

**userId შემოწმება ყველგან:**
```typescript
// update, remove — userId-ს ამოწმებს
const item = await this.cartRepository.findOne({
  where: { id: cartItemId, userId },  // ← userId!
});
```
- სხვა იუზერის კალათას ვერ შეცვლის
- userId JWT token-იდან მოდის (req.user.id), არა body-დან
- ეს ნიშნავს რომ ვერ გააყალბებ — token-ში შენი ID-ა

**გასაუბრებისთვის:** "addToCart-ში ჯერ ვამოწმებთ პროდუქტი არსებობს თუ არა, მერე უკვე კალათაშია თუ არა. თუ კი — quantity-ს ვზრდით, თუ არა — ახალ ჩანაწერს ვქმნით. userId ყოველთვის JWT token-იდან მოდის, ვერ გააყალბებ."

---

### 4. `cart.controller.ts` — HTTP Endpoints

```typescript
@Controller('cart')
@UseGuards(JwtAuthGuard)  // ← კლასის დონეზე! ყველა endpoint protected-ია
export class CartController {

  @Get()
  getCart(@Request() req: { user: { id: number } }) { ... }

  @Post('add')
  addToCart(@Request() req, @Body() dto: AddToCartDto) { ... }

  @Patch('update/:id')
  updateQuantity(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() dto) { ... }

  @Delete('remove/:id')
  removeFromCart(@Request() req, @Param('id', ParseIntPipe) id: number) { ... }

  @Delete('clear')
  clearCart(@Request() req) { ... }
}
```

**@UseGuards კლასის დონეზე:**
- Angular-ში Route-ზე `canActivate` guard-ს ადებ
- აქ Controller კლასზე ერთხელ ადებ → ყველა endpoint-ი protected-ია
- თითოეულ მეთოდზე ცალ-ცალკე `@UseGuards` წერა აღარ გჭირდება

**@Request() req:**
- `req.user` = JwtStrategy-ს validate() მეთოდის return: `{ id, email }`
- JWT token-იდან მოდის, სანდოა (სერვერმა თავად გამოსცა)

**ParseIntPipe:**
- URL-ის `:id` პარამეტრი string-ია ("3")
- ParseIntPipe number-ად გარდაქმნის (3)
- თუ არავალიდურია ("abc") → 400 Bad Request

**გასაუბრებისთვის:** "@UseGuards კლასის დონეზე ერთხელ ადებ და ყველა endpoint-ი protected-ია. req.user JWT token-იდან მოდის — JwtStrategy-ს validate() აბრუნებს."

---

### 5. `cart.module.ts` — მოდულის კონფიგურაცია

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([CartItem]),  // CartItem Repository
    ProductsModule,                        // ProductsService-ს იმპორტავს
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],  // OrdersModule-ს დასჭირდება
})
```

**ProductsModule import:**
- CartService-ში ProductsService inject-ია (პროდუქტის არსებობის შესამოწმებლად)
- ეს მუშაობს რადგან ProductsModule-ში `exports: [ProductsService]` გვაქვს
- Angular-ში: imports: [SharedModule] — SharedModule-ის exports-ში რაცაა, ხელმისაწვდომია

**exports: [CartService]:**
- OrdersModule-ს დასჭირდება CartService (checkout-ისას კალათის წამოღება + გასუფთავება)
- თუ exports-ში არ ჩაწერ → OrdersModule-ში inject ვერ მოხდება

---

## Request Flows

### Add to Cart:
```
POST /cart/add { productId: 3, quantity: 2 }
Headers: Authorization: Bearer eyJhbGci...
    │
    ▼
JwtAuthGuard → JwtStrategy.validate() → req.user = { id: 1, email: "..." }
    ▼
ValidationPipe → AddToCartDto validation
    │ ✗ → 400 Bad Request
    │ ✓
    ▼
CartService.addToCart(userId: 1, { productId: 3, quantity: 2 })
    │
    ├── ProductsService.findOne(3) → Product არსებობს? ✓
    │
    ├── findOne({ userId: 1, productId: 3 }) → უკვე კალათაშია?
    │   ├── კი → quantity += 2 → save()
    │   └── არა → create() → save()
    │
    ▼
Response: { message: "...", cartItem: { id, product: {...}, quantity } }
```

### View Cart:
```
GET /cart
Headers: Authorization: Bearer eyJhbGci...
    │
    ▼
JwtAuthGuard → req.user = { id: 1 }
    ▼
CartService.getCart(1)
    │
    ├── find({ where: { userId: 1 } })
    │   └── eager: true → Product-ებიც მოყვება (LEFT JOIN)
    │
    ├── reduce() → totalPrice = 134.28
    ├── reduce() → totalItems = 3
    │
    ▼
Response: {
  items: [
    { id: 1, product: { title: "...", price: 55.99, image: "..." }, quantity: 2 },
    { id: 2, product: { title: "...", price: 22.3, image: "..." }, quantity: 1 }
  ],
  totalPrice: 134.28,
  totalItems: 3
}
```

---

## User Entity-ში დამატებული relation

```typescript
// user.entity.ts
@OneToMany(() => CartItem, (cartItem) => cartItem.user)
cartItems: CartItem[];
```

- ეს DB-ში სვეტს **არ** ქმნის
- TypeORM-ს ეუბნება: "User-ს აქვს ბევრი CartItem"
- `user.cartItems` — lazy/eager loading-ით წამოიღებს
- Bidirectional relation: User ↔ CartItem (ორივე მხრიდან წვდომა)

---

## User Entity-ში balance (ეტაპი 2-დან)

```typescript
@Column({ type: 'decimal', precision: 10, scale: 2, default: 5000 })
balance: number;
```

- რეგისტრაციისას ყველას $5000 ერიცხება (Entity default)
- `decimal` — ზუსტი ფულადი მნიშვნელობა (არა float!)
- DB-დან string-ად მოდის → `Number()` გარდაქმნა საჭიროა
- `precision: 10` = მაქსიმუმ 10 ციფრი (99,999,999.99)
- `scale: 2` = წერტილის შემდეგ 2 ციფრი

---

## გამოყენებული კონცეფციები

### TypeORM Relations
| Relation | DB-ში | მაგალითი |
|----------|-------|---------|
| `@ManyToOne` | FOREIGN KEY სვეტს ქმნის | CartItem.userId → users.id |
| `@OneToMany` | არაფერს ქმნის (inverse side) | User.cartItems |
| `@ManyToMany` | junction ცხრილს ქმნის | (ამ პროექტში არ გვაქვს) |

### NestJS Pipes
| Pipe | რას აკეთებს |
|------|------------|
| `ValidationPipe` | DTO validation (გლობალური, main.ts) |
| `ParseIntPipe` | string → number + validation |

### HTTP Methods
| Method | დანიშნულება | იდემპოტენტური? |
|--------|------------|----------------|
| GET | წაკითხვა | კი (იგივე შედეგი) |
| POST | შექმნა | არა (ყოველ ჯერზე ახალი) |
| PATCH | ნაწილობრივი განახლება | კი |
| DELETE | წაშლა | კი |

---

## Products (ეტაპი 1-დან)

### Seed — FakeStore API-დან ჩაწერა
```
POST /products/seed → fetch('https://fakestoreapi.com/products')
  → 20 პროდუქტის transform (rating flatten)
  → bulk INSERT DB-ში
  → ერთხელ გაეშვება, მეორედ → 400 "უკვე ჩაწერილია"
```

### Products Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/products/seed` | FakeStore-დან 20 პროდუქტის ჩაწერა |
| GET | `/products` | ყველა პროდუქტი |
| GET | `/products/categories` | კატეგორიების სია |
| GET | `/products/category/:category` | კატეგორიით ფილტრი |
| GET | `/products/:id` | ერთი პროდუქტი |

### 4 კატეგორია:
- electronics
- jewelery
- men's clothing
- women's clothing

### ParseIntPipe `:id` route-ზე:
```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) { ... }
```
- "categories" string `:id`-ში რომ არ შევიდეს → ParseIntPipe ბლოკავს
- კონკრეტული route-ები (`categories`, `category/:cat`) dynamic-ის (`:id`) ზემოთ უნდა იყოს

---

## შემდეგი ეტაპი: Orders + Checkout (ეტაპი 4)

რაც დაგვრჩა:
- [ ] Order + OrderItem Entity-ები
- [ ] CheckoutDto
- [ ] OrdersService (Transaction-ით checkout)
- [ ] OrdersController
- [ ] OrdersModule
- [ ] Profile-ში orders ისტორია
