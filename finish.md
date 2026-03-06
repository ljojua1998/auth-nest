# Auth-Nest Backend — Final Summary

## Tech Stack

- **NestJS** (v11) — TypeScript backend framework
- **TypeORM** — ORM for PostgreSQL
- **PostgreSQL** — database (Neon cloud)
- **Passport + JWT** — authentication
- **Socket.IO** — WebSocket (real-time chat)
- **Google Gemini AI** — AI chat assistant (gemini-2.0-flash)
- **Swagger** — API documentation
- **class-validator / class-transformer** — DTO validation

---

## Project Structure

```
src/
├── auth/           — Authentication (register, login, JWT, refresh token)
├── users/          — User entity & service
├── products/       — Products CRUD + seed from FakeStore API
├── cart/           — Shopping cart (add, update, remove, clear)
├── orders/         — Orders & checkout (balance-based payment)
├── chat/           — AI Chat (Gemini + WebSocket streaming)
├── app.module.ts   — Root module
└── main.ts         — Entry point
```

---

## Modules & Features

### 1. Auth (`/auth`)

| Endpoint          | Method | Auth | Description                          |
| ----------------- | ------ | ---- | ------------------------------------ |
| `/auth/register`  | POST   | No   | Register new user (name, email, password) |
| `/auth/login`     | POST   | No   | Login, returns accessToken + refreshToken |
| `/auth/refresh`   | POST   | No   | Refresh expired access token         |
| `/auth/profile`   | GET    | JWT  | Get current user profile             |
| `/auth/logout`    | POST   | JWT  | Logout (invalidate refresh token)    |

- Passwords hashed with **bcryptjs**
- JWT access token + refresh token system
- New users get **$5000 balance** automatically

### 2. Products (`/products`)

| Endpoint                      | Method | Auth | Description                  |
| ----------------------------- | ------ | ---- | ---------------------------- |
| `/products`                   | GET    | No   | Get all products             |
| `/products/:id`               | GET    | No   | Get product by ID            |
| `/products/categories`        | GET    | No   | Get all categories           |
| `/products/category/:category`| GET    | No   | Get products by category     |
| `/products/seed`              | POST   | No   | Seed DB from FakeStore API   |

- 20 products seeded from fakestoreapi.com
- Fields: title, price, description, category, image, rating

### 3. Cart (`/cart`)

| Endpoint            | Method | Auth | Description                |
| ------------------- | ------ | ---- | -------------------------- |
| `/cart`             | GET    | JWT  | Get user's cart             |
| `/cart/add`         | POST   | JWT  | Add product to cart         |
| `/cart/update/:id`  | PATCH  | JWT  | Update item quantity        |
| `/cart/remove/:id`  | DELETE | JWT  | Remove item from cart       |
| `/cart/clear`       | DELETE | JWT  | Clear entire cart           |

- Each user has their own cart
- Cart items linked to products (with relations)

### 4. Orders (`/orders`)

| Endpoint            | Method | Auth | Description                |
| ------------------- | ------ | ---- | -------------------------- |
| `/orders/checkout`  | POST   | JWT  | Create order from cart      |
| `/orders`           | GET    | JWT  | Get all my orders           |
| `/orders/:id`       | GET    | JWT  | Get order details           |

- Checkout deducts from user balance
- Payment method: `balance` (card temporarily unavailable)
- Shipping address required (city, address, zip)
- Order contains items snapshot (price at time of purchase)
- Cart is cleared after successful checkout

### 5. Chat (WebSocket)

| Event (Client → Server) | Description                    |
| ------------------------ | ------------------------------ |
| `connect` (with auth)    | Connect with JWT Bearer token  |
| `sendMessage`            | Send message `{ message: string }` |

| Event (Server → Client) | Description                    |
| ------------------------ | ------------------------------ |
| `messageChunk`           | Streaming response chunk `{ text: string }` |
| `messageEnd`             | Response complete              |
| `error`                  | Error message `{ message: string }` |

- JWT authentication on WebSocket connection
- Each user gets their own Gemini chat session
- AI knows all products from DB (system prompt with product list)
- Streaming responses (real-time, chunk by chunk)
- Session memory (AI remembers conversation history)

---

## Database Entities

### User
- id, name, email, password (hashed), balance ($5000 default)
- isVerified, verificationToken, resetToken, resetTokenExpiry
- refreshToken
- Relations: cartItems[], orders[]

### Product
- id, title, price, description, category, image
- ratingRate, ratingCount

### CartItem
- id, quantity
- Relations: user (ManyToOne), product (ManyToOne)

### Order
- id, totalAmount, paymentMethod, status (pending/completed/cancelled)
- shippingCity, shippingAddress, shippingZip
- Relations: user (ManyToOne), items[] (OneToMany)

### OrderItem
- id, quantity, priceAtPurchase, productTitle
- Relations: order (ManyToOne), product (ManyToOne)

---

## Environment Variables (`.env`)

```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## How to Run

```bash
npm install
npm run start:dev
```

Seed products (first time):
```bash
curl -X POST http://localhost:3000/products/seed
```

Swagger docs: `http://localhost:3000/api`

---

## Status

- Auth — DONE
- Products — DONE
- Cart — DONE
- Orders — DONE
- Chat (AI) — DONE (code ready, needs valid Gemini API key)
- Swagger — DONE
- All endpoints tested and working