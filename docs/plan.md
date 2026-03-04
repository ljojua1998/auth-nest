# Auth-Nest - სრული სასწავლო გეგმა

## პროექტის მიზანი
NestJS-ზე სრული Auth სისტემის აწყობა: Register, Login, JWT, Email Verification, Password Reset

## ტექნოლოგიები
- NestJS + TypeORM + PostgreSQL
- bcryptjs (პაროლის hash)
- @nestjs/jwt + passport-jwt (ტოკენები)
- Nodemailer (მეილები)
- class-validator (DTO validation)

---

## ეტაპი 1 — User Entity + DB კავშირის ტესტი
- [x] app.module.ts - TypeORM + ConfigModule კონფიგურაცია
- [x] User Entity შექმნა (id, name, email, password, isVerified, verificationToken, resetToken, resetTokenExpiry, refreshToken)
- [ ] სერვერის გაშვება და DB-სთან კავშირის შემოწმება
- [ ] users ცხრილის შექმნის დადასტურება

**Angular პარალელი:** Entity = interface/model, მაგრამ DB ცხრილთან დაკავშირებული

---

## ეტაპი 2 — Register (რეგისტრაცია)
- [ ] RegisterDto შექმნა (class-validator-ით: @IsEmail, @MinLength, etc.)
- [ ] UsersModule + UsersService შექმნა
- [ ] AuthModule + AuthService + AuthController შექმნა
- [ ] bcryptjs-ით პაროლის hash-ირება
- [ ] POST /auth/register endpoint
- [ ] Postman-ში ტესტი

**Angular პარალელი:** DTO = interface + validation, Module = NgModule, Service = Angular Service, Controller = Route Handler

---

## ეტაპი 3 — Email Verification (მეილის დადასტურება)
- [ ] Nodemailer კონფიგურაცია (Gmail App Password ან Mailtrap)
- [ ] MailModule + MailService შექმნა
- [ ] verification token-ის გენერაცია (uuid)
- [ ] რეგისტრაციისას verification მეილის გაგზავნა
- [ ] GET /auth/verify?token=xxx endpoint
- [ ] isVerified = true განახლება DB-ში

**Angular პარალელი:** MailService = HttpClient service რომელიც external API-ს უკავშირდება

---

## ეტაპი 4 — Login + JWT (ავტორიზაცია)
- [ ] LoginDto შექმნა (email + password)
- [ ] bcrypt.compare - პაროლის შემოწმება
- [ ] Access Token გენერაცია (15 წუთი)
- [ ] Refresh Token გენერაცია (7 დღე)
- [ ] Refresh Token-ის hash DB-ში შენახვა
- [ ] POST /auth/login endpoint
- [ ] POST /auth/refresh endpoint
- [ ] Postman-ში ტესტი

**Angular პარალელი:** JWT = localStorage-ში შენახული token, Refresh = HttpInterceptor-ით ავტომატური განახლება

---

## ეტაპი 5 — Password Reset (პაროლის აღდგენა)
- [ ] POST /auth/forgot-password endpoint
- [ ] reset token-ის გენერაცია + DB-ში შენახვა
- [ ] reset მეილის გაგზავნა ლინკით
- [ ] POST /auth/reset-password endpoint
- [ ] ახალი პაროლის hash + შენახვა
- [ ] resetToken-ის წაშლა გამოყენების შემდეგ

**Angular პარალელი:** forgot-password form → API call → მეილი → reset form → API call

---

## ეტაპი 6 — Guards + Protected Routes
- [ ] JwtStrategy შექმნა (passport-jwt)
- [ ] JwtAuthGuard შექმნა
- [ ] GET /auth/profile - protected endpoint
- [ ] @UseGuards(JwtAuthGuard) დეკორატორი
- [ ] Postman-ში ტესტი Authorization header-ით

**Angular პარალელი:** JwtAuthGuard = CanActivate guard, JwtStrategy = HttpInterceptor რომელიც token-ს ამოწმებს

---

## ეტაპი 7 — Deploy (Render.com)
- [ ] Environment Variables Render-ზე დამატება
- [ ] start:prod script-ის კონფიგურაცია
- [ ] Render-ზე deploy
- [ ] საბოლოო ტესტი Postman-ში production URL-ით

---

## API Endpoints (საბოლოო)

| Method | Endpoint              | Description              | Auth |
|--------|-----------------------|--------------------------|------|
| POST   | /auth/register        | რეგისტრაცია              | No   |
| GET    | /auth/verify?token=x  | მეილის დადასტურება       | No   |
| POST   | /auth/login           | ავტორიზაცია              | No   |
| POST   | /auth/refresh         | Token განახლება          | No   |
| POST   | /auth/forgot-password | პაროლის აღდგენის მეილი  | No   |
| POST   | /auth/reset-password  | ახალი პაროლის დაყენება   | No   |
| GET    | /auth/profile         | პროფილის ნახვა           | Yes  |

## ფაილების სტრუქტურა (საბოლოო)

```
src/
├── main.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   └── reset-password.dto.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   └── entities/
│       └── user.entity.ts
└── mail/
    ├── mail.module.ts
    └── mail.service.ts
```
