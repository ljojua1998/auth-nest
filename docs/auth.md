# Auth System - სრული დოკუმენტაცია

## პროექტის სტრუქტურა

```
src/
├── main.ts                          # entry point + ValidationPipe
├── app.module.ts                    # root მოდული
├── app.controller.ts                # GET / → "Hello World!"
├── app.service.ts                   # Hello World service
├── auth/
│   ├── auth.module.ts               # Auth მოდული (JwtModule + JwtStrategy)
│   ├── auth.controller.ts           # HTTP endpoints (register, login, profile, logout, refresh)
│   ├── auth.service.ts              # ბიზნეს ლოგიკა (register, login, JWT, logout)
│   ├── dto/
│   │   ├── register.dto.ts          # რეგისტრაციის validation
│   │   └── login.dto.ts             # ავტორიზაციის validation
│   ├── guards/
│   │   └── jwt-auth.guard.ts        # JWT token-ის შემოწმების guard
│   └── strategies/
│       └── jwt.strategy.ts          # JWT token-ის validation strategy
└── users/
    ├── users.module.ts              # Users მოდული
    ├── users.service.ts             # DB ოპერაციები
    └── entities/
        └── user.entity.ts           # DB ცხრილის სტრუქტურა
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | რეგისტრაცია | No |
| POST | `/auth/login` | ავტორიზაცია → accessToken + refreshToken | No |
| POST | `/auth/refresh` | ტოკენის განახლება refreshToken-ით | No |
| GET | `/auth/profile` | პროფილის ნახვა | Yes (Bearer token) |
| POST | `/auth/logout` | გამოსვლა (refreshToken წაშლა DB-დან) | Yes (Bearer token) |

---

## Angular ↔ NestJS პარალელები

| Angular | NestJS | აღწერა |
|---------|--------|--------|
| `@Component()` | `@Controller()` | HTTP request-ების მიმღები |
| `@Injectable()` service | `@Injectable()` service | ბიზნეს ლოგიკა |
| `NgModule` | `@Module()` | კომპონენტების/სერვისების დაჯგუფება |
| `interface User` | `@Entity() class User` | მონაცემების მოდელი (Entity = DB ცხრილი) |
| `Validators.email` | `@IsEmail()` | validation |
| `Validators.required` | `@IsNotEmpty()` | validation |
| `Validators.minLength(6)` | `@MinLength(6)` | validation |
| `CanActivate` guard | `JwtAuthGuard` | route-ის დაცვა |
| `HttpInterceptor` (token-ის დამატება) | `JwtStrategy` (token-ის შემოწმება) | JWT მუშაობა |
| `HttpClient` | `Repository` | მონაცემების წყაროსთან მუშაობა |
| `environment.ts` | `.env + ConfigModule` | კონფიგურაცია |
| `localStorage.setItem('token')` | `jwtService.sign(payload)` | token-ის შენახვა/გენერაცია |
| `@Inject('API_URL')` string token | `AuthGuard('jwt')` string name | DI string token-ით |

---

## ფაილები დეტალურად

### 1. `user.entity.ts` — DB ცხრილის სტრუქტურა

Entity = DB ცხრილის TypeScript representation. Angular-ში interface მხოლოდ TypeScript-ის დონეზე არსებობს, Entity კი **რეალურ DB ცხრილს** ქმნის.

```typescript
@Entity('users')  // ქმნის 'users' ცხრილს PostgreSQL-ში
export class User {
  @PrimaryGeneratedColumn()   // auto-increment ID
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })  // დუბლიკატი email არ დაიშვება
  email: string;

  @Column()
  password: string;           // bcrypt hash (არასდროს plain text!)

  @Column({ default: true })
  isVerified: boolean;        // MVP-ში default true, მომავალში email verification

  @Column({ type: 'varchar', nullable: true })
  verificationToken: string | null;  // email verification token

  @Column({ type: 'varchar', nullable: true })
  resetToken: string | null;         // password reset token

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date | null;     // reset token-ის ვადა

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;       // JWT refresh token (hash-ირებული!)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**მნიშვნელოვანი:**
- `nullable: true` ველებს TypeScript-ში `string | null` ტიპი უნდა ჰქონდეს
- `type: 'varchar'` ექსპლიციტურად უნდა მიუთითო, თორემ TypeORM `string | null` union ტიპს ვერ ცნობს და "Data type Object not supported" error მოგცემს
- `synchronize: true` — development-ში TypeORM ავტომატურად ქმნის/ააპდეითებს ცხრილს
- **Production-ში `synchronize: false`** უნდა იყოს! migrations გამოიყენება

**გასაუბრებისთვის:** "Entity არის კლასი რომელიც TypeORM-ის დეკორატორებით აღწერს DB ცხრილის სტრუქტურას. synchronize: true development-ში ავტომატურად ქმნის ცხრილს, production-ში migrations გამოიყენება."

---

### 2. DTOs — Request Validation

**DTO = Data Transfer Object** — განსაზღვრავს რა ფორმატით უნდა მოვიდეს მონაცემები.

```typescript
// register.dto.ts
export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'სახელი სავალდებულოა' })
  name: string;

  @IsEmail({}, { message: 'არასწორი email ფორმატი' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' })
  password: string;
}

// login.dto.ts
export class LoginDto {
  @IsEmail({}, { message: 'არასწორი email ფორმატი' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' })
  password: string;
}
```

**ValidationPipe (main.ts):**
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```
- validation ვერ გაიარა → ავტომატურად 400 Bad Request + error messages
- `whitelist: true` → DTO-ში არ არსებულ ველებს ავტომატურად წაშლის (უსაფრთხოება)

**გასაუბრებისთვის:** "DTO class-validator-ის დეკორატორებით ავალიდირებთ request body-ს. ValidationPipe გლობალურად რთავს validation-ს. whitelist: true წაშლის DTO-ში არ არსებულ ველებს — ეს injection attack-ების პრევენციაა."

---

### 3. `users.service.ts` — DB ოპერაციები

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)          // TypeORM Repository inject
    private usersRepository: Repository<User>,
  ) {}

  // SELECT * FROM users WHERE email = ?
  async findByEmail(email: string): Promise<User | null>

  // SELECT * FROM users WHERE id = ?
  async findById(id: number): Promise<User | null>

  // INSERT INTO users ... (+ duplicate email check)
  async create(userData: Partial<User>): Promise<User>

  // UPDATE users SET refreshToken = ? WHERE id = ?
  async updateRefreshToken(userId: number, refreshToken: string | null)
}
```

**Repository მეთოდები:**
- `findOne({ where: { email } })` — ერთი ჩანაწერის პოვნა
- `create(data)` — entity-ს შექმნა მეხსიერებაში (DB-ში ჯერ არ ინახავს!)
- `save(entity)` — DB-ში შენახვა (INSERT)
- `update(id, data)` — DB-ში განახლება (UPDATE)

**ConflictException (409):** თუ email უკვე არსებობს → HTTP 409

**გასაუბრებისთვის:** "Repository pattern-ს ვიყენებთ. TypeORM-ის Repository გვაძლევს CRUD ოპერაციებს: findOne, create, save, update. create მხოლოდ მეხსიერებაში ქმნის entity-ს, save ინახავს DB-ში."

---

### 4. `auth.service.ts` — ძირითადი ბიზნეს ლოგიკა

#### Register Flow:
```typescript
async register(registerDto: RegisterDto) {
  // 1. პაროლის hash-ირება (plain text არასდროს ინახება!)
  const hashedPassword = await hash(password, 10);
  // "123456" → "$2a$10$X7jK..." (one-way, ვერ გაშიფრავ უკან)

  // 2. DB-ში შენახვა
  const user = await this.usersService.create({ name, email, password: hashedPassword });

  // 3. response-ში password hash არ ბრუნდება!
  const { password: _, ...result } = user;
  return { message: '...', user: result };
}
```

#### Login Flow:
```typescript
async login(loginDto: LoginDto) {
  // 1. მომხმარებლის პოვნა email-ით
  const user = await this.usersService.findByEmail(email);
  if (!user) throw new UnauthorizedException();

  // 2. პაროლის შემოწმება
  // compare("123456", "$2a$10$X7jK...") → true/false
  const isPasswordValid = await compare(password, user.password);
  if (!isPasswordValid) throw new UnauthorizedException();

  // 3. ტოკენების გენერაცია
  const tokens = this.generateTokens(user.id, user.email);

  // 4. refresh token hash → DB-ში
  const hashedRefreshToken = await hash(tokens.refreshToken, 10);
  await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

  return { message: '...', ...tokens };
}
```

#### Token Generation:
```typescript
private generateTokens(userId: number, email: string) {
  const payload = { sub: userId, email };

  // Access Token — 15 წუთი, ყოველ request-ში იგზავნება
  const accessToken = this.jwtService.sign(payload);

  // Refresh Token — 7 დღე, მხოლოდ token განახლებისას
  const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}
```

#### Refresh Flow:
```typescript
async refresh(refreshToken: string) {
  // 1. token-ის verify (გაშიფვრა + ვადის შემოწმება)
  const payload = this.jwtService.verify<JwtPayload>(refreshToken, { secret });

  // 2. მომხმარებლის პოვნა
  const user = await this.usersService.findById(payload.sub);

  // 3. DB-ში შენახულ hash-თან შედარება
  const isValid = await compare(refreshToken, user.refreshToken);

  // 4. ახალი ტოკენების გენერაცია
  const tokens = this.generateTokens(user.id, user.email);

  // 5. ახალი refresh token hash → DB
  return tokens;
}
```

#### Logout:
```typescript
async logout(userId: number) {
  // refresh token-ს წაშლა DB-დან → ახალი token-ების გენერაცია ვეღარ მოხდება
  await this.usersService.updateRefreshToken(userId, null);
}
```

#### Profile:
```typescript
async getProfile(userId: number) {
  const user = await this.usersService.findById(userId);
  // password და refreshToken არ ბრუნდება response-ში
  const { password: _, refreshToken: __, ...result } = user;
  return result;
}
```

**bcrypt-ის შესახებ:**
- `hash(password, 10)` — 10 = salt rounds (რაც მეტია, უფრო უსაფრთხო მაგრამ ნელი)
- `compare(plain, hashed)` — ადარებს plain text-ს hash-ს → true/false
- one-way: hash-იდან plain text-ის აღდგენა შეუძლებელია

**გასაუბრებისთვის:** "პაროლს bcrypt-ით ვაჰეშირებთ salt rounds=10-ით. Login-ისას bcrypt.compare ადარებს. JWT-ს ორი token-ით ვმუშაობთ: access (15წთ) მოკლევადიანი ყოველი request-ისთვის, refresh (7დღე) გრძელვადიანი token-ების განახლებისთვის. Refresh token hash-ირებული ინახება DB-ში."

---

### 5. `auth.controller.ts` — HTTP Endpoints

```typescript
@Controller('auth')  // ყველა route = /auth/...
export class AuthController {

  // ===== PUBLIC ROUTES =====

  @Post('register')
  register(@Body() registerDto: RegisterDto) { ... }

  @Post('login')
  login(@Body() loginDto: LoginDto) { ... }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) { ... }

  // ===== PROTECTED ROUTES (JWT Guard) =====

  @UseGuards(JwtAuthGuard)  // ← token-ის გარეშე → 401
  @Get('profile')
  getProfile(@Request() req) { ... }
  // req.user = { id, email } — JwtStrategy-ს validate() მეთოდიდან მოდის

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Request() req) { ... }
}
```

**დეკორატორები:**
- `@Controller('auth')` — route prefix
- `@Post('register')` / `@Get('profile')` — HTTP method + path
- `@Body()` — request body-დან მონაცემების ამოღება
- `@Body('refreshToken')` — body-დან კონკრეტული ველის ამოღება
- `@Request()` — სრული request ობიექტი (req.user Guard-იდან მოდის)
- `@UseGuards(JwtAuthGuard)` — endpoint-ის დაცვა

**გასაუბრებისთვის:** "Controller იღებს HTTP request-ებს და delegate აკეთებს Service-ზე. @UseGuards დეკორატორი ამოწმებს JWT token-ს — Angular-ის CanActivate-ის ანალოგია."

---

### 6. `jwt.strategy.ts` — JWT Token-ის Validation

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Authorization: Bearer <token> header-იდან ამოიღებს token-ს
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,   // ვადაგასულ token-ს არ მიიღებს
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // token ვალიდურია → validate() გაეშვება
  // return = req.user-ში ჩაიწერება
  validate(payload: { sub: number; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

**როგორ მუშაობს Strategy-ის სახელი:**
- `passport-jwt` პაკეტის Strategy-ს default სახელი = `'jwt'`
- `PassportStrategy(Strategy)` ამ სახელით არეგისტრირებს
- `AuthGuard('jwt')` ამ სახელით ეძებს strategy-ს
- სხვა passport პაკეტებს სხვა სახელი აქვთ: `'google'`, `'local'`, `'facebook'`

**გასაუბრებისთვის:** "JwtStrategy Passport-ის strategy-ა. Authorization header-იდან ამოიღებს Bearer token-ს, ამოწმებს secret-ით და ვადას. validate() მეთოდის return request.user-ში ჩაიწერება."

---

### 7. `jwt-auth.guard.ts` — Route Protection

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**ერთი ხაზია, მაგრამ ძალიან ბევრს აკეთებს:**
1. Request-იდან ამოიღებს Authorization header-ს
2. Bearer token-ს გადასცემს JwtStrategy-ს
3. Strategy ამოწმებს token-ის ვალიდურობას
4. ვალიდურია → request გაგრძელდება, req.user = validate()-ის return
5. არავალიდურია → 401 Unauthorized

**Angular-ის CanActivate-თან შედარება:**
```typescript
// Angular
canActivate(): boolean {
  if (this.authService.isLoggedIn()) return true;
  this.router.navigate(['/login']);
  return false;
}

// NestJS — იგივე კონცეფცია, მაგრამ JWT token-ით
@UseGuards(JwtAuthGuard)  // token არასწორია → 401
```

---

### 8. `auth.module.ts` — მოდულის კონფიგურაცია

```typescript
@Module({
  imports: [
    UsersModule,                    // UsersService-ს იმპორტავს
    JwtModule.registerAsync({       // JWT კონფიგურაცია
      useFactory: (configService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },  // default access token ვადა
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],  // JwtStrategy provider-ად!
})
```

**NestJS Module-ის სტრუქტურა:**
- `imports` — სხვა მოდულები რომელთა service-ებიც გჭირდება
- `controllers` — HTTP endpoint-ების handler-ები
- `providers` — service-ები + strategies (ბიზნეს ლოგიკა)
- `exports` — რა გახადო ხელმისაწვდომი სხვა მოდულებისთვის

---

## Request Flows

### Register Flow:
```
POST /auth/register { name: "Lasha", email: "lasha@test.com", password: "123456" }
    │
    ▼
ValidationPipe — DTO validation
    │ ✗ → 400 Bad Request { message: ["პაროლი მინიმუმ 6 სიმბოლო"] }
    │ ✓
    ▼
AuthController.register()
    ▼
AuthService.register()
    ├── hash("123456", 10) → "$2a$10$X7jK..."
    ▼
UsersService.create()
    │ ✗ → 409 Conflict "email უკვე რეგისტრირებულია"
    │ ✓ → INSERT INTO users
    ▼
Response 201: { message, user: { id, name, email, isVerified, createdAt } }
```

### Login Flow:
```
POST /auth/login { email: "lasha@test.com", password: "123456" }
    │
    ▼
ValidationPipe → AuthController.login() → AuthService.login()
    │
    ├── findByEmail("lasha@test.com") → User ან null
    │   └── null → 401 "არასწორი email ან პაროლი"
    │
    ├── compare("123456", "$2a$10$X7jK...") → true/false
    │   └── false → 401 "არასწორი email ან პაროლი"
    │
    ├── generateTokens(userId, email) → { accessToken, refreshToken }
    │
    ├── hash(refreshToken, 10) → DB-ში შენახვა
    │
    ▼
Response 200: { message, accessToken, refreshToken }
```

### Protected Route Flow (Profile):
```
GET /auth/profile
Headers: Authorization: Bearer eyJhbGci...
    │
    ▼
JwtAuthGuard → JwtStrategy
    │
    ├── token-ის ამოღება header-იდან
    ├── verify(token, secret) — ხელმოწერის შემოწმება
    ├── ვადის შემოწმება (15 წუთი გასულია?)
    │   └── გასულია → 401 Unauthorized
    │
    ├── validate({ sub: 1, email: "lasha@test.com" })
    │   └── return { id: 1, email: "lasha@test.com" } → req.user
    │
    ▼
AuthController.getProfile(req.user.id)
    ▼
AuthService.getProfile(1) → findById(1) → User (password-ის გარეშე)
    ▼
Response 200: { id, name, email, isVerified, createdAt, updatedAt }
```

### Refresh Flow:
```
POST /auth/refresh { refreshToken: "eyJhbGci..." }
    │
    ▼
AuthService.refresh()
    │
    ├── verify(refreshToken) — ვალიდურია? ვადა?
    │   └── არა → 401
    │
    ├── findById(payload.sub) — user DB-ში?
    │   └── არა → 401
    │
    ├── compare(refreshToken, user.refreshToken) — DB-ში შენახულთან ემთხვევა?
    │   └── არა → 401
    │
    ├── generateTokens() — ახალი accessToken + refreshToken
    ├── hash(newRefreshToken) → DB-ში განახლება
    │
    ▼
Response 200: { accessToken, refreshToken }
```

### Logout Flow:
```
POST /auth/logout
Headers: Authorization: Bearer eyJhbGci...
    │
    ▼
JwtAuthGuard → req.user = { id: 1, email: "..." }
    ▼
AuthService.logout(1)
    ├── updateRefreshToken(1, null) → DB-ში refreshToken = null
    ▼
Response 200: { message: "გამოსვლა წარმატებით დასრულდა" }
```

---

## JWT — გასაუბრებისთვის მნიშვნელოვანი

### რა არის JWT?
JSON Web Token — base64-ით encode-ირებული JSON, ხელმოწერილი secret key-ით.

```
eyJhbGci...    .    eyJzdWIi...    .    R-P2qULP...
   │                    │                    │
 Header              Payload             Signature
 (algorithm)      (sub, email,        (HMAC SHA256)
                   iat, exp)
```

### რატომ ორი Token?
| | Access Token | Refresh Token |
|--|--|--|
| **ვადა** | 15 წუთი | 7 დღე |
| **გამოყენება** | ყოველ API request-ში | მხოლოდ token განახლებისას |
| **შენახვა (Frontend)** | memory / httpOnly cookie | httpOnly cookie |
| **შენახვა (Backend)** | არსად (stateless) | DB-ში hash-ირებული |
| **მოპარვის რისკი** | დაბალი (15წთ ვადა) | DB-დან წაშლით გააუქმებ |

### Logout-ის შეზღუდვა (გასაუბრებაზე კითხავენ!)
JWT **stateless**-ია — სერვერი ყოველ request-ზე DB-ს არ ეკითხება.
- Logout-ისას refreshToken იშლება DB-დან ✅
- მაგრამ accessToken ჯერ კიდევ ვალიდურია 15 წუთი ❌
- **გამოსავალი:** Token Blacklist (Redis) ან access token-ის ვადის შემცირება

**გასაუბრებაზე პასუხი:** "JWT stateless-ია, logout-ისას refresh token-ს ვშლით DB-დან. Access token მოკლევადიანია (15წთ). სრულ invalidation-ისთვის token blacklist Redis-ში დაგვჭირდება."

### რატომ hash-ირდება Refresh Token DB-ში?
თუ DB-ს გატეხენ და refresh token-ები plain text-ით წერია — ჰაკერს ყველა user-ის session-ზე ექნება წვდომა. Hash-ით შენახვისას — ვერ გამოიყენებს.

---

## bcrypt — გასაუბრებისთვის

### რა არის bcrypt?
პაროლის hash-ირების ალგორითმი. **One-way** — hash-იდან პაროლის აღდგენა შეუძლებელია.

```
hash("password123", 10) → "$2a$10$X7jK9Z..."
compare("password123", "$2a$10$X7jK9Z...") → true
compare("wrong", "$2a$10$X7jK9Z...") → false
```

### რატომ bcrypt და არა MD5/SHA256?
- bcrypt **ნელია** (salt rounds-ით კონტროლდება) → brute force რთულია
- MD5/SHA256 **სწრაფია** → brute force ადვილია
- bcrypt ავტომატურად ამატებს **salt**-ს → rainbow table attack არ მუშაობს

### Salt Rounds?
- `10` = default, კარგია development + production-ისთვის
- რაც მეტია, მით ნელი და უსაფრთხო
- ყოველ +1 ორჯერ ანელებს

---

## NestJS Module System — გასაუბრებისთვის

### Module-ის სტრუქტურა:
```
@Module({
  imports: [],      // რა მოდულები გჭირდება
  controllers: [],  // HTTP endpoints
  providers: [],    // Services, Strategies
  exports: [],      // რა გასცე სხვა მოდულებისთვის
})
```

### Module-ების კავშირი ამ პროექტში:
```
AppModule
  ├── imports: ConfigModule, TypeOrmModule, UsersModule, AuthModule
  │
  ├── UsersModule
  │     ├── imports: TypeOrmModule.forFeature([User])  ← User Repository
  │     ├── providers: UsersService
  │     └── exports: UsersService  ← AuthModule-მა რომ გამოიყენოს
  │
  └── AuthModule
        ├── imports: UsersModule, JwtModule
        ├── controllers: AuthController
        └── providers: AuthService, JwtStrategy
```

**მნიშვნელოვანი:** თუ Module-ს service-ს `exports`-ში არ ჩაწერ, სხვა მოდული ვერ გამოიყენებს — Angular-შიც ზუსტად ასეა.

---

## გამოყენებული პაკეტები

| პაკეტი | დანიშნულება |
|--------|------------|
| `@nestjs/common` | NestJS core (დეკორატორები, pipes, exceptions, guards) |
| `@nestjs/typeorm` + `typeorm` | DB ORM |
| `pg` | PostgreSQL driver |
| `@nestjs/config` | .env ფაილის წაკითხვა |
| `bcryptjs` | პაროლის hash-ირება |
| `@nestjs/jwt` | JWT token-ების გენერაცია/ვერიფიკაცია |
| `@nestjs/passport` + `passport` | authentication framework |
| `passport-jwt` | JWT strategy Passport-ისთვის |
| `class-validator` | DTO validation დეკორატორები |
| `class-transformer` | DTO ტრანსფორმაცია |

---

## Environment Variables (.env)

```
DATABASE_URL=postgresql://user:pass@host/dbname
JWT_SECRET=your-secret-key
```

**Production-ში JWT_SECRET უნდა იყოს:**
- გრძელი (32+ სიმბოლო)
- რანდომული (`openssl rand -hex 32`)
- არასდროს git-ში!

---

## შესაძლო გაუმჯობესებები (მომავალი)

- [ ] Email Verification (Nodemailer + verification token)
- [ ] Password Reset (forgot-password + reset-password)
- [ ] Token Blacklist (Redis) — მყისიერი logout
- [ ] Rate Limiting — brute force prevention
- [ ] Swagger Documentation — API docs
- [ ] migrations — production DB schema management
