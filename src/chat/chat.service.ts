import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  ChatSession,
} from '@google/generative-ai';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private chatSessions = new Map<string, ChatSession>();

  constructor(private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY', ''),
    );

    const systemPrompt = `შენ ხარ WorldFantasy-ის AI ასისტენტი — ქართული Fantasy Football პლატფორმა World Cup 2026-ისთვის.

შენი ამოცანაა მომხმარებელს დაეხმარო:
- Fantasy Football წესების გაგებაში
- ფეხბურთელების არჩევაში
- Coin სტრატეგიაში
- World Cup 2026-ის ახალი ამბების მიწოდებაში

WorldFantasy-ის მთავარი წესები:
- თითოეული მომხმარებელი იწყებს 1,000,000 Coin-ით
- გუნდი: 15 ფეხბურთელი (11 starter + 4 sub)
- პოზიციები: 2 GK, 5 DEF, 5 MID, 3 FWD
- კაპიტანი იღებს x2 ქულას
- Triple Captain Card — x3 ქულა (ერთჯერადი)
- Marketplace-ი იხსნება ეტაპებს შორის

უპასუხე მოკლედ, ქართულად.`;

    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });
  }

  createSession(socketId: string) {
    const chat = this.model.startChat();
    this.chatSessions.set(socketId, chat);
  }

  async *streamResponse(socketId: string, userMessage: string) {
    const chat = this.chatSessions.get(socketId);

    if (!chat) {
      yield 'სესია ვერ მოიძებნა. გთხოვთ, გადატვირთოთ ჩატი.';
      return;
    }

    const result = await chat.sendMessageStream(userMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  removeSession(socketId: string) {
    this.chatSessions.delete(socketId);
  }
}
