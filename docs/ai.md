# AI ჩატი — სრული გეგმა და ახსნა

## რა ვაკეთებთ?

საიტზე AI ჩატბოტის დამატება, რომელიც:
- მომხმარებელს საიტის შესახებ აწვდის ინფორმაციას
- DB-დან იცის პროდუქტები, კატეგორიები, ფასები
- პასუხს streaming-ით აბრუნებს (სიტყვა-სიტყვა, როგორც ChatGPT/eBazar)
- WebSocket-ით მუშაობს (real-time კომუნიკაცია)

---

## 1. რატომ Google Gemini?

| პროვაიდერი | უფასო ლიმიტი | მოდელი |
|------------|--------------|--------|
| **Google Gemini** | **15 req/წუთი, 1500 req/დღე** | gemini-2.0-flash |
| OpenAI | $5 კრედიტი (3 თვე) | gpt-3.5-turbo |
| Anthropic | არ აქვს უფასო tier | claude |

Gemini-ს აქვს ყველაზე გულუხვი უფასო tier სასწავლოდ.

### API Key-ის აღება:
1. შედი https://aistudio.google.com/apikey
2. დააჭირე "Create API Key"
3. დააკოპირე და `.env` ფაილში ჩაწერე: `GEMINI_API_KEY=შენი_გასაღები`

---

## 2. WebSocket vs REST — რატომ WebSocket?

### REST (ჩვეულებრივი HTTP):
```
მომხმარებელი → POST /chat → სერვერი ფიქრობს 5 წამი → სრული პასუხი ერთად მოდის
```
პრობლემა: მომხმარებელი 5 წამი ელოდება ცარიელ ეკრანს.

### WebSocket (რაც ჩვენ გვინდა):
```
მომხმარებელი → შეკითხვა გაგზავნა → სერვერი სიტყვა-სიტყვა აგზავნის პასუხს
  "მოგესალმებით"
  "მოგესალმებით, ჩვენს"
  "მოგესალმებით, ჩვენს მაღაზიაში"
  "მოგესალმებით, ჩვენს მაღაზიაში გვაქვს..."
```

### WebSocket-ის მუშაობის პრინციპი:
```
HTTP = წერილი (გაგზავნე → დაელოდე პასუხს → კავშირი დაიხურა)
WebSocket = სატელეფონო ზარი (კავშირი ღიაა, ორივე მხარე ნებისმიერ დროს ლაპარაკობს)
```

NestJS-ში WebSocket = **Gateway** (Angular-ში Socket.IO client-ის ანალოგი, მხოლოდ სერვერის მხარეს)

---

## 3. რა პაკეტები დაგვჭირდება?

```bash
npm install @google/generative-ai @nestjs/websockets @nestjs/platform-socket.io
```

| პაკეტი | რა არის | ანალოგია |
|--------|---------|----------|
| `@google/generative-ai` | Gemini API SDK | HttpClient, მხოლოდ AI-სთვის |
| `@nestjs/websockets` | NestJS WebSocket მხარდაჭერა | Angular-ის WebSocket module |
| `@nestjs/platform-socket.io` | Socket.IO ადაპტერი | კონკრეტული WebSocket იმპლემენტაცია |

---

## 4. ფაილების სტრუქტურა

```
src/
  chat/
    chat.module.ts        ← მოდულის რეგისტრაცია
    chat.gateway.ts       ← WebSocket Gateway (Controller-ის ანალოგი WebSocket-ისთვის)
    chat.service.ts       ← ბიზნეს ლოგიკა + Gemini API
```

Angular-თან შედარება:
```
chat.gateway.ts  ≈  Angular Component (მომხმარებლის event-ებს უსმენს)
chat.service.ts  ≈  Angular Service (ლოგიკა + API)
chat.module.ts   ≈  Angular Module (ყველაფერს აერთიანებს)
```

---

## 5. როგორ მუშაობს ნაბიჯ-ნაბიჯ

### ნაბიჯი 1: კავშირის დამყარება
```
Frontend (Next.js/React Native) → WebSocket კავშირი → Backend Gateway
```
Socket.IO client უერთდება სერვერს. Gateway-ს `handleConnection()` ეშვება.

### ნაბიჯი 2: შეკითხვის გაგზავნა
```
Frontend emit('sendMessage', { message: 'რა პროდუქტები გაქვთ?' })
         ↓
Gateway @SubscribeMessage('sendMessage') იჭერს
         ↓
ChatService.handleMessage() იძახება
```

### ნაბიჯი 3: DB კონტექსტის შეგროვება
```
ChatService → ProductsService.findAll() → DB-დან პროდუქტების წამოღება
            → ProductsService.getCategories() → კატეგორიების წამოღება
```

ეს ინფორმაცია Gemini-ს system prompt-ში ჩაემატება:
```
"შენ ხარ FakeShop მაღაზიის ასისტენტი.
 გვაქვს 20 პროდუქტი შემდეგ კატეგორიებში: electronics, jewelery, men's clothing, women's clothing.
 აი პროდუქტების სია: [{ title: '...', price: 109.95, ... }, ...]"
```

### ნაბიჯი 4: Gemini API-სთან streaming კომუნიკაცია
```
ChatService → Gemini API (generateContentStream)
           ← chunk 1: "ჩვენს"
           ← chunk 2: " მაღაზიაში"
           ← chunk 3: " გვაქვს"
           ← chunk 4: " 20 პროდუქტი..."
```

### ნაბიჯი 5: თითოეული chunk მომხმარებელს ეგზავნება
```
ყოველი chunk → Gateway → emit('messageChunk', { text: "..." }) → Frontend
საბოლოო      → Gateway → emit('messageEnd') → Frontend-მა იცის რომ დასრულდა
```

---

## 6. Chat History — კონტექსტის შენარჩუნება

### პრობლემა:
```
მომხმარებელი: "რა პროდუქტები გაქვთ?"
AI: "გვაქვს 20 პროდუქტი..."
მომხმარებელი: "რომელია ყველაზე იაფი?"
AI: "??? რა იყო იაფი? არაფერი ახსოვს"  ← ცუდი!
```

### გადაწყვეტა — Gemini `startChat()`:

Gemini SDK-ს აქვს ჩაშენებული chat session, რომელიც ავტომატურად ინახავს ისტორიას:

```typescript
// ცუდი — ყოველ შეკითხვაზე კონტექსტი იკარგება:
model.generateContent("რომელია ყველაზე იაფი?")  // არ იცის რაზეა საუბარი

// კარგი — chat session ყველაფერს ახსოვს:
const chat = model.startChat({
  history: [],  // თავიდან ცარიელი, შემდეგ ავტომატურად ივსება
  systemInstruction: "შენ ხარ მაღაზიის ასისტენტი..."
});
chat.sendMessageStream("რა პროდუქტები გაქვთ?")   // → "გვაქვს 20 პროდუქტი..."
chat.sendMessageStream("რომელია ყველაზე იაფი?")    // → ახსოვს! "ყველაზე იაფია..."
chat.sendMessageStream("რამდენი ღირს?")             // → ახსოვს ორივე! "მისი ფასია $7.95"
```

### როგორ ვმართავთ სესიებს — Map:

ყოველ WebSocket client-ს (მომხმარებელს) თავისი chat session აქვს:

```typescript
// სერვისში ვინახავთ Map-ს:
private chatSessions = new Map<string, ChatSession>();
//                          socketId → ChatSession

// კავშირის დამყარებისას:
handleConnection(client: Socket) {
  const chat = model.startChat({ systemInstruction: "..." });
  this.chatSessions.set(client.id, chat);  // ახალი სესია
}

// შეკითხვისას:
handleMessage(client: Socket, message: string) {
  const chat = this.chatSessions.get(client.id);  // მისი სესია
  const result = await chat.sendMessageStream(message);  // ისტორია ახსოვს!
}

// გათიშვისას:
handleDisconnect(client: Socket) {
  this.chatSessions.delete(client.id);  // მეხსიერების გათავისუფლება
}
```

### ვიზუალური დიაგრამა:

```
იუზერი A (socket: abc123)              იუზერი B (socket: xyz789)
    │                                       │
    │── connect ──→ Map.set("abc123", chatA) │── connect ──→ Map.set("xyz789", chatB)
    │                                       │
    │── "რა გაქვთ?" → chatA ახსოვს         │── "ფასები?" → chatB ახსოვს
    │── "რომელია იაფი?" → chatA ახსოვს ორივე│── "electronics?" → chatB ახსოვს ორივე
    │                                       │
    │── disconnect → Map.delete("abc123")    │── disconnect → Map.delete("xyz789")
    │   chatA მეხსიერებიდან წაიშალა          │   chatB მეხსიერებიდან წაიშალა
```

### სესიის ხანგრძლივობა:

```
ტაბი ღიაა, ჩატი გახსნილი → სესია ცოცხალია (ისტორია ახსოვს)
გვერდი გადატვირთა         → disconnect → სესია წაიშალა → ახალი ჩატი
ინტერნეტი გაითიშა         → disconnect → სესია წაიშალა → ახალი ჩატი
ტაბი დახურა               → disconnect → სესია წაიშალა
```

Socket.IO-ს აქვს auto-reconnect (ინტერნეტი რომ დაბრუნდა, თავიდან უკავშირდება),
მაგრამ reconnect = ახალი socketId = ახალი სესია = ისტორია აღარ ახსოვს.
ეს ნორმალურია სასწავლო პროექტისთვის (ChatGPT-იც ასე მუშაობს ახალ ჩატში).

---

## 6.1. JWT Authentication — მხოლოდ დალოგინებული იუზერებისთვის

### პრობლემა:
ჩატს ნებისმიერი ადამიანი შეძლებს გამოიყენოს — არაავტორიზებულიც. გვინდა რომ
მხოლოდ დალოგინებული მომხმარებლები შეძლონ AI ჩატით სარგებლობა.

### გადაწყვეტა:
HTTP-ზე JWT Guard-ს იყენებ (`@UseGuards(JwtAuthGuard)`).
WebSocket-ზეც იგივე JWT token-ს გამოვიყენებთ, მხოლოდ გადაცემის გზა განსხვავდება:

```
HTTP:      headers: { Authorization: 'Bearer eyJhbGci...' }
WebSocket: auth:    { token: 'Bearer eyJhbGci...' }
```

### Frontend-ის მხარე:
```typescript
import { io } from 'socket.io-client';

// დალოგინებისას მიღებული token
const token = localStorage.getItem('access_token');

const socket = io('http://localhost:3000', {
  auth: {
    token: `Bearer ${token}`  // JWT token WebSocket-ით გადაეცემა
  }
});
```

### Backend Gateway-ში შემოწმება:
```typescript
@WebSocketGateway({ cors: true })
export class ChatGateway {

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      // 1. token-ის ამოღება
      const token = client.handshake.auth?.token?.replace('Bearer ', '');

      // 2. JWT ვალიდაცია (იგივე secret-ით რაც HTTP auth-ში)
      const payload = this.jwtService.verify(token);

      // 3. userId-ს შევინახავთ socket-ზე (შემდეგ გამოვიყენებთ)
      client.data.userId = payload.sub;

      // 4. chat session-ის შექმნა
      this.chatService.createSession(client.id);

    } catch (error) {
      // token არავალიდურია → გათიშე!
      client.disconnect();
    }
  }
}
```

**Angular-თან შედარება:**
- HTTP-ზე: `HttpInterceptor` ამატებს token-ს ყველა request-ს
- WebSocket-ზე: `auth` ობიექტით ერთხელ გადაეცემა connect-ისას
- ორივე შემთხვევაში იგივე JWT token და იგივე secret გამოიყენება

### ვიზუალური ნაკადი:
```
[Frontend]                          [Backend Gateway]
    │                                      │
    │── connect (auth: { token }) ──────→  │
    │                                      │── jwtService.verify(token)
    │                                      │   ✓ ვალიდურია → userId = 5
    │                                      │   → createSession(socketId)
    │                                      │   → client.data.userId = 5
    │                                      │
    │── sendMessage("რა გაქვთ?") ────────→ │── session ნაპოვნია → Gemini-ს გაგზავნა
    │←── messageChunk ──────────────────── │
    │                                      │
    │                                      │
[არაავტორიზებული]                          │
    │── connect (token არ აქვს) ─────────→ │
    │                                      │── verify() fails
    │←── disconnect() ←────────────────── │   → გათიშვა!
```

---

### რატომ `Map` და არა DB?

| მიდგომა | როდის გამოიყენო |
|---------|-----------------|
| **Map (მეხსიერებაში)** | სესიის დროს. სწრაფია, სერვერის restart-ზე იშლება |
| **DB (PostgreSQL)** | თუ გინდა ისტორიის შენახვა restart-ის შემდეგაც. ჩვენთვის ზედმეტია |

ჩვენს შემთხვევაში Map საკმარისია — სანამ მომხმარებელი ჩატშია, ახსოვს. გავიდა — დაივიწყა. სწორედ ისე, როგორც ChatGPT-ს ახალ ჩატში.

---

## 7. კოდის ახსნა (რას დავწერთ)

### chat.gateway.ts — WebSocket "Controller"
```typescript
@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;  // Socket.IO სერვერის ინსტანცი

  // როცა მომხმარებელი 'sendMessage' event-ს გამოაგზავნის
  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { message: string }) {
    // Gemini-სგან streaming პასუხის მიღება
    // თითოეული ნაწილი client-ს ეგზავნება
  }
}
```

**Angular-თან შედარება:**
- `@SubscribeMessage('sendMessage')` ≈ `@HostListener('click')` — event-ს უსმენს
- `client.emit(...)` ≈ `EventEmitter.emit()` — event-ს აგზავნის კონკრეტულ client-ზე
- `@WebSocketServer()` ≈ ყველა დაკავშირებულ client-ზე broadcasting

### chat.service.ts — ბიზნეს ლოგიკა
```typescript
@Injectable()
export class ChatService {
  private model: GenerativeModel;
  private chatSessions = new Map<string, ChatSession>();  // socketId → სესია

  constructor(private productsService: ProductsService) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  // ახალი სესიის შექმნა (connect-ზე)
  async createSession(socketId: string) {
    const products = await this.productsService.findAll();
    const categories = await this.productsService.getCategories();

    const chat = this.model.startChat({
      systemInstruction: `შენ ხარ FakeShop მაღაზიის ასისტენტი.
        კატეგორიები: ${categories.join(', ')}.
        პროდუქტები: ${JSON.stringify(products)}
        უპასუხე ქართულად, მოკლედ და გასაგებად.`,
    });

    this.chatSessions.set(socketId, chat);
  }

  // შეკითხვაზე streaming პასუხი (ისტორია ახსოვს!)
  async *streamResponse(socketId: string, userMessage: string) {
    const chat = this.chatSessions.get(socketId);
    const result = await chat.sendMessageStream(userMessage);

    for await (const chunk of result.stream) {
      yield chunk.text();  // "ჩვენს" → " მაღაზიაში" → " გვაქვს"...
    }
  }

  // სესიის წაშლა (disconnect-ზე)
  removeSession(socketId: string) {
    this.chatSessions.delete(socketId);
  }
}
```

**რა არის `async *` (Async Generator)?**
ჩვეულებრივი ფუნქცია ერთ მნიშვნელობას აბრუნებს. Generator რამდენიმეს, ეტაპობრივად:
```typescript
// ჩვეულებრივი: return "სრული პასუხი" (ელოდები ბოლომდე)
// Generator:   yield "ნაწილი 1" → yield "ნაწილი 2" → yield "ნაწილი 3"
```

---

## 7. Frontend-ის მხარე (მოკლედ)

Next.js ან React Native-ში Socket.IO client:
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// შეკითხვის გაგზავნა
socket.emit('sendMessage', { message: 'რა პროდუქტები გაქვთ?' });

// პასუხის მიღება ნაწილ-ნაწილ
socket.on('messageChunk', (data) => {
  // state-ში ტექსტის დამატება → UI განახლდება ყოველ chunk-ზე
  setResponse(prev => prev + data.text);
});

socket.on('messageEnd', () => {
  // პასუხი დასრულდა
});
```

---

## 8. მონაცემთა ნაკადის დიაგრამა

```
[Frontend]                    [Backend]                      [Gemini API]
    │                             │                               │
    │── WebSocket connect ──────→ │                               │
    │                             │ handleConnection()            │
    │                             │                               │
    │── sendMessage ────────────→ │                               │
    │   "რა ფასი აქვს jacket-ს?"  │                               │
    │                             │── DB Query ──→ [PostgreSQL]   │
    │                             │←── products ──┘               │
    │                             │                               │
    │                             │── generateContentStream() ──→ │
    │                             │←── chunk: "Fjallraven" ──────┘│
    │←── messageChunk ───────────│                               │
    │                             │←── chunk: " jacket-ის" ──────┘│
    │←── messageChunk ───────────│                               │
    │                             │←── chunk: " ფასია $109.95" ──┘│
    │←── messageChunk ───────────│                               │
    │                             │                               │
    │←── messageEnd ─────────────│                               │
    │                             │                               │
```

---

## 9. .env-ში დასამატებელი

```env
GEMINI_API_KEY=შენი_api_key_აქ
```

---

## 10. იმპლემენტაციის თანმიმდევრობა

1. პაკეტების დაყენება (`@google/generative-ai`, `@nestjs/websockets`, `@nestjs/platform-socket.io`)
2. `chat.service.ts` — Gemini + DB კონტექსტის ლოგიკა
3. `chat.gateway.ts` — WebSocket gateway (event-ების მოსმენა/გაგზავნა)
4. `chat.module.ts` — მოდულის რეგისტრაცია
5. `app.module.ts`-ში ChatModule-ის დამატება
6. ტესტირება (Postman WebSocket ან frontend)

---

## შეჯამება

| კონცეფცია | რა არის | Angular ანალოგი |
|-----------|---------|-----------------|
| Gateway | WebSocket endpoint | Component + Socket.IO |
| @SubscribeMessage | Event listener | @HostListener |
| client.emit() | პასუხის გაგზავნა | EventEmitter |
| Async Generator | ნაწილ-ნაწილ მიწოდება | Observable stream |
| System Prompt | AI-ს ინსტრუქცია | — |
| Streaming | ტექსტი სიტყვა-სიტყვა | — |
