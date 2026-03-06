import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

// ============================
// INTERFACES — ტიპების განსაზღვრა
// ============================
// რატომ? Socket.IO-ს auth და data ობიექტები `any` ტიპისაა
// ESLint არ გვაძლევს `any`-ზე წვდომას (no-unsafe-member-access)
// ამიტომ interface-ებით ვეუბნებით TypeScript-ს: "აი, ამ ობიექტში ეს ველები არის"

// handshake.auth-ის ტიპი — Frontend-იდან რა მოდის connect-ისას
interface SocketAuth {
  token?: string;
}

// jwtService.verify()-ის პასუხის ტიპი — JWT payload-ში რა ინახება
interface JwtPayload {
  sub: number; // userId (sub = subject, JWT სტანდარტი)
  email: string;
}

// client.data-ის ტიპი — socket-ზე რა ვინახავთ
interface SocketData {

  userId: number;
}

// @WebSocketGateway — Controller-ის ანალოგი WebSocket-ისთვის
// cors: true — Frontend-იდან კავშირის ნებართვა (როგორც HTTP-ზე CORS)
@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // @WebSocketServer — Socket.IO სერვერის ინსტანცი
  // ეს საშუალებას გაძლევს ყველა client-ზე broadcast გააკეთო
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  // ============================
  // CONNECTION — მომხმარებელი უკავშირდება
  // ============================
  // OnGatewayConnection interface — handleConnection მეთოდი სავალდებულოა
  // ეშვება ყოველ ახალ WebSocket კავშირზე
  handleConnection(client: Socket) {
    try {
      // 1. Token-ის ამოღება — Frontend-იდან auth ობიექტით მოდის
      //    client.handshake = კავშირის დამყარების მონაცემები
      //    .auth = { token: 'Bearer eyJhbGci...' }
      //    as SocketAuth — TypeScript-ს ვეუბნებით auth-ის ტიპს (თორემ any-ა)
      const auth = client.handshake.auth as SocketAuth;
      const token = auth.token?.replace('Bearer ', '');

      if (!token) {
        // token არ გამოაგზავნა → გათიშე
        client.emit('error', { message: 'ავტორიზაცია სავალდებულოა' });
        client.disconnect();
        return;
      }

      // 2. JWT ვერიფიკაცია — იგივე რასაც JwtAuthGuard აკეთებს HTTP-ზე
      //    verify() — token-ს ამოწმებს secret-ით, payload-ს აბრუნებს
      //    as JwtPayload — verify() any-ს აბრუნებს, ჩვენ ვიცით რომ { sub, email } არის
      const payload = this.jwtService.verify<JwtPayload>(token);

      // 3. userId-ს ვინახავთ socket-ზე — შემდეგ message-ებში გამოვიყენებთ
      //    client.data = ობიექტი სადაც ნებისმიერ მონაცემს შეინახავ
      //    as SocketData — ვეუბნებით რა ტიპის data ვინახავთ
      (client.data as SocketData).userId = payload.sub;

      // 4. Chat session-ის შექმნა — Gemini-სთან ახალი საუბრის დაწყება
      this.chatService.createSession(client.id);

      console.log(
        `მომხმარებელი ${String(payload.sub)} დაუკავშირდა ჩატს (socket: ${client.id})`,
      );
    } catch {
      // JWT არავალიდურია (expired, wrong secret, tampered)
      client.emit('error', { message: 'არავალიდური token' });
      client.disconnect();
    }
  }

  // ============================
  // DISCONNECT — მომხმარებელი გაითიშა
  // ============================
  // OnGatewayDisconnect interface — handleDisconnect სავალდებულოა
  handleDisconnect(client: Socket) {
    // სესიის წაშლა — მეხსიერების გათავისუფლება
    this.chatService.removeSession(client.id);
    console.log(`Socket ${client.id} გაითიშა`);
  }

  // ============================
  // MESSAGE — მომხმარებელმა შეკითხვა გამოაგზავნა
  // ============================
  // @SubscribeMessage('sendMessage') — event listener
  // Frontend-იდან: socket.emit('sendMessage', { message: '...' })
  // Backend-ში: ეს მეთოდი გაეშვება
  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { message: string }) {
    try {
      // Streaming — ნაწილ-ნაწილ ვაგზავნით პასუხს
      // for await ... of — Async Generator-ს iterate აკეთებს
      // ყოველი yield-ზე ახალი chunk მოდის
      for await (const chunk of this.chatService.streamResponse(
        client.id,
        payload.message,
      )) {
        // client.emit — კონკრეტულ მომხმარებელს უგზავნის (არა ყველას!)
        // 'messageChunk' — event-ის სახელი, Frontend-ზე ამ სახელით მოისმენს
        client.emit('messageChunk', { text: chunk });
      }

      // პასუხი დასრულდა — Frontend-მა იცის რომ ტექსტი სრულია
      client.emit('messageEnd');
    } catch (error) {
      // Gemini API error → Frontend-ს ვაცნობებთ
      console.error('Chat error:', error);
      client.emit('error', {
        message: 'AI პასუხის გენერაცია ვერ მოხერხდა',
      });
    }
  }
}
