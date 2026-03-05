# API Endpoints - Request/Response Guide

ყველა endpoint, რა Body უნდა გაატანო, რა დაგიბრუნებს.

---

## AUTH

### 1. POST `/auth/register` — რეგისტრაცია
**Auth:** არა

**Body:**
```json
{
  "name": "Lasha",
  "email": "lasha@test.com",
  "password": "123456"
}
```

**Validation:**
- `name` — string, სავალდებულო
- `email` — ვალიდური email ფორმატი
- `password` — string, მინიმუმ 6 სიმბოლო

**Response 201:**
```json
{
  "message": "რეგისტრაცია წარმატებით დასრულდა",
  "user": {
    "id": 1,
    "name": "Lasha",
    "email": "lasha@test.com",
    "balance": "5000.00",
    "isVerified": true,
    "createdAt": "2026-03-05T14:00:00.000Z",
    "updatedAt": "2026-03-05T14:00:00.000Z"
  }
}
```

---

### 2. POST `/auth/login` — ავტორიზაცია
**Auth:** არა

**Body:**
```json
{
  "email": "lasha@test.com",
  "password": "123456"
}
```

**Validation:**
- `email` — ვალიდური email
- `password` — string, მინიმუმ 6 სიმბოლო

**Response 200:**
```json
{
  "message": "ავტორიზაცია წარმატებით დასრულდა",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error 401:**
```json
{ "message": "არასწორი email ან პაროლი", "statusCode": 401 }
```

---

### 3. POST `/auth/refresh` — Token განახლება
**Auth:** არა

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...(ახალი)",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...(ახალი)"
}
```

---

### 4. GET `/auth/profile` — პროფილის ნახვა
**Auth:** კი — `Authorization: Bearer <accessToken>`

**Body:** არ სჭირდება

**Response 200:**
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
          "id": 1,
          "productId": 3,
          "quantity": 2,
          "priceAtPurchase": "55.99",
          "product": {
            "id": 3,
            "title": "Mens Cotton Jacket",
            "price": "55.99",
            "image": "https://fakestoreapi.com/img/..."
          }
        }
      ],
      "createdAt": "2026-03-05T14:10:00.000Z"
    }
  ],
  "createdAt": "2026-03-05T14:00:00.000Z",
  "updatedAt": "2026-03-05T14:10:00.000Z"
}
```

**Error 401:**
```json
{ "message": "Unauthorized", "statusCode": 401 }
```

---

### 5. POST `/auth/logout` — გამოსვლა
**Auth:** კი — `Authorization: Bearer <accessToken>`

**Body:** არ სჭირდება

**Response 200:**
```json
{ "message": "გამოსვლა წარმატებით დასრულდა" }
```

---

## PRODUCTS

### 6. POST `/products/seed` — 20 პროდუქტის ჩაწერა DB-ში
**Auth:** არა

**Body:** არ სჭირდება (ცარიელი POST)

**Response 201:**
```json
{ "message": "20 პროდუქტი წარმატებით ჩაიწერა DB-ში" }
```

**Error 400 (მეორედ გაშვებისას):**
```json
{ "message": "პროდუქტები უკვე ჩაწერილია DB-ში (20 ცალი)" }
```

---

### 7. GET `/products` — ყველა პროდუქტი
**Auth:** არა

**Body:** არ სჭირდება

**Response 200:**
```json
[
  {
    "id": 1,
    "title": "Fjallraven - Foldsack No. 1 Backpack",
    "price": "109.95",
    "description": "Your perfect pack for everyday use...",
    "category": "men's clothing",
    "image": "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg",
    "ratingRate": "3.9",
    "ratingCount": 120,
    "createdAt": "2026-03-05T..."
  },
  ...
]
```

---

### 8. GET `/products/categories` — კატეგორიების სია
**Auth:** არა

**Body:** არ სჭირდება

**Response 200:**
```json
["electronics", "jewelery", "men's clothing", "women's clothing"]
```

---

### 9. GET `/products/category/:category` — კატეგორიით ფილტრი
**Auth:** არა

**Body:** არ სჭირდება

**URL მაგალითი:** `GET /products/category/electronics`

**Response 200:**
```json
[
  {
    "id": 9,
    "title": "WD 2TB Elements Portable External Hard Drive",
    "price": "64.00",
    "category": "electronics",
    ...
  },
  ...
]
```

---

### 10. GET `/products/:id` — ერთი პროდუქტი
**Auth:** არა

**Body:** არ სჭირდება

**URL მაგალითი:** `GET /products/3`

**Response 200:**
```json
{
  "id": 3,
  "title": "Mens Cotton Jacket",
  "price": "55.99",
  "description": "great outerwear jackets...",
  "category": "men's clothing",
  "image": "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_.jpg",
  "ratingRate": "4.7",
  "ratingCount": 500,
  "createdAt": "2026-03-05T..."
}
```

**Error 400:**
```json
{ "message": "პროდუქტი ვერ მოიძებნა" }
```

---

## CART (ყველა endpoint-ს Bearer token სჭირდება!)

### 11. POST `/cart/add` — კალათაში დამატება
**Auth:** კი — `Authorization: Bearer <accessToken>`

**Body:**
```json
{
  "productId": 3,
  "quantity": 2
}
```

**Validation:**
- `productId` — integer, სავალდებულო, დადებითი
- `quantity` — integer, არასავალდებულო (default: 1), მინიმუმ 1

**მინიმალური Body (quantity default 1):**
```json
{
  "productId": 3
}
```

**Response 201 (ახალი):**
```json
{
  "message": "პროდუქტი კალათაში დაემატა",
  "cartItem": {
    "id": 1,
    "userId": 1,
    "productId": 3,
    "quantity": 2,
    "createdAt": "2026-03-05T...",
    "product": {
      "id": 3,
      "title": "Mens Cotton Jacket",
      "price": "55.99",
      "image": "https://..."
    }
  }
}
```

**Response 200 (უკვე კალათაში იყო → quantity გაიზარდა):**
```json
{
  "message": "პროდუქტის რაოდენობა განახლდა",
  "cartItem": {
    "id": 1,
    "quantity": 4,
    ...
  }
}
```

---

### 12. GET `/cart` — კალათის ნახვა
**Auth:** კი — `Authorization: Bearer <accessToken>`

**Body:** არ სჭირდება

**Response 200:**
```json
{
  "items": [
    {
      "id": 1,
      "userId": 1,
      "productId": 3,
      "quantity": 2,
      "createdAt": "2026-03-05T...",
      "product": {
        "id": 3,
        "title": "Mens Cotton Jacket",
        "price": "55.99",
        "description": "great outerwear...",
        "category": "men's clothing",
        "image": "https://...",
        "ratingRate": "4.7",
        "ratingCount": 500
      }
    },
    {
      "id": 2,
      "userId": 1,
      "productId": 5,
      "quantity": 1,
      "product": {
        "id": 5,
        "title": "Women's T-Shirt",
        "price": "22.30",
        ...
      }
    }
  ],
  "totalPrice": 134.28,
  "totalItems": 3
}
```

**Response 200 (ცარიელი კალათა):**
```json
{
  "items": [],
  "totalPrice": 0,
  "totalItems": 0
}
```

---

### 13. PATCH `/cart/update/:id` — რაოდენობის შეცვლა
**Auth:** კი — `Authorization: Bearer <accessToken>`

**URL მაგალითი:** `PATCH /cart/update/1` (1 = cartItem ID, არა productId!)

**Body:**
```json
{
  "quantity": 5
}
```

**Validation:**
- `quantity` — integer, სავალდებულო, მინიმუმ 1

**Response 200:**
```json
{
  "message": "რაოდენობა განახლდა",
  "cartItem": {
    "id": 1,
    "quantity": 5,
    ...
  }
}
```

**Error 404:**
```json
{ "message": "ეს ნივთი შენს კალათაში არ არის" }
```

---

### 14. DELETE `/cart/remove/:id` — ერთი ნივთის წაშლა
**Auth:** კი — `Authorization: Bearer <accessToken>`

**URL მაგალითი:** `DELETE /cart/remove/1` (1 = cartItem ID)

**Body:** არ სჭირდება

**Response 200:**
```json
{ "message": "ნივთი კალათიდან წაიშალა" }
```

---

### 15. DELETE `/cart/clear` — კალათის გასუფთავება
**Auth:** კი — `Authorization: Bearer <accessToken>`

**Body:** არ სჭირდება

**Response 200:**
```json
{ "message": "კალათა გასუფთავდა" }
```

---

## ORDERS (ყველა endpoint-ს Bearer token სჭირდება!)

### 16. POST `/orders/checkout` — ყიდვა
**Auth:** კი — `Authorization: Bearer <accessToken>`

**Body:**
```json
{
  "paymentMethod": "balance"
}
```

**Validation:**
- `paymentMethod` — სავალდებულო, მხოლოდ `"balance"` ან `"card"`

**Response 201:**
```json
{
  "message": "შეკვეთა წარმატებით გაფორმდა",
  "order": {
    "id": 1,
    "userId": 1,
    "totalPrice": "134.28",
    "status": "completed",
    "paymentMethod": "balance",
    "items": [
      {
        "id": 1,
        "productId": 3,
        "quantity": 2,
        "priceAtPurchase": "55.99",
        "product": {
          "id": 3,
          "title": "Mens Cotton Jacket",
          "price": "55.99",
          "image": "https://..."
        }
      },
      {
        "id": 2,
        "productId": 5,
        "quantity": 1,
        "priceAtPurchase": "22.30",
        "product": { ... }
      }
    ],
    "createdAt": "2026-03-05T..."
  },
  "remainingBalance": 4865.72
}
```

**Error 400 (ცარიელი კალათა):**
```json
{ "message": "კალათა ცარიელია" }
```

**Error 400 (არასაკმარისი ბალანსი):**
```json
{ "message": "არასაკმარისი ბალანსი. გაქვთ: $100, საჭიროა: $134.28" }
```

**Error 400 (ბარათი):**
```json
{ "message": "ბარათით გადახდა დროებით მიუწვდომელია" }
```

---

### 17. GET `/orders` — ჩემი შეკვეთები
**Auth:** კი — `Authorization: Bearer <accessToken>`

**Body:** არ სჭირდება

**Response 200:**
```json
[
  {
    "id": 2,
    "userId": 1,
    "totalPrice": "22.30",
    "status": "completed",
    "paymentMethod": "balance",
    "items": [ ... ],
    "createdAt": "2026-03-05T14:30:00.000Z"
  },
  {
    "id": 1,
    "userId": 1,
    "totalPrice": "134.28",
    "status": "completed",
    "paymentMethod": "balance",
    "items": [ ... ],
    "createdAt": "2026-03-05T14:10:00.000Z"
  }
]
```

---

### 18. GET `/orders/:id` — კონკრეტული შეკვეთა
**Auth:** კი — `Authorization: Bearer <accessToken>`

**URL მაგალითი:** `GET /orders/1`

**Body:** არ სჭირდება

**Response 200:**
```json
{
  "id": 1,
  "userId": 1,
  "totalPrice": "134.28",
  "status": "completed",
  "paymentMethod": "balance",
  "items": [
    {
      "id": 1,
      "productId": 3,
      "quantity": 2,
      "priceAtPurchase": "55.99",
      "product": {
        "id": 3,
        "title": "Mens Cotton Jacket",
        "price": "55.99",
        "image": "https://..."
      }
    }
  ],
  "createdAt": "2026-03-05T..."
}
```

**Error 404:**
```json
{ "message": "შეკვეთა ვერ მოიძებნა" }
```

---

## სწრაფი ტესტის თანმიმდევრობა

```
1.  POST /products/seed                              → 20 პროდუქტი DB-ში
2.  POST /auth/register   { name, email, password }   → იუზერი + balance: 5000
3.  POST /auth/login      { email, password }          → accessToken + refreshToken
    ──── Swagger: Authorize ღილაკში ჩაწერე: Bearer <accessToken> ────
4.  GET  /auth/profile                                 → balance: 5000, orders: []
5.  GET  /products                                     → 20 პროდუქტი
6.  GET  /products/categories                          → 4 კატეგორია
7.  POST /cart/add         { "productId": 3, "quantity": 2 }
8.  POST /cart/add         { "productId": 5 }
9.  GET  /cart                                         → 2 ნივთი, totalPrice
10. POST /orders/checkout  { "paymentMethod": "balance" }  → ყიდვა!
11. GET  /cart                                         → ცარიელი (გაიწმინდა)
12. GET  /orders                                       → 1 შეკვეთა
13. GET  /orders/1                                     → შეკვეთის დეტალები
14. GET  /auth/profile                                 → balance შემცირებული + orders
15. POST /auth/logout                                  → გამოსვლა
```
