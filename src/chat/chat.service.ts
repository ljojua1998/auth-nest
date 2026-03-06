import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  ChatSession,
} from '@google/generative-ai';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ChatService implements OnModuleInit {
  // genAI — SDK-ს მთავარი ინსტანცი (API key-ით)
  private genAI: GoogleGenerativeAI;

  // model — Gemini მოდელი system prompt-ით (DB კონტექსტით)
  // onModuleInit-ში ინიციალიზდება, რადგან DB-დან პროდუქტების წამოღება ასინქრონულია
  private model: GenerativeModel;

  // ყოველი მომხმარებლის chat session — socketId-ით ვარჩევთ
  private chatSessions = new Map<string, ChatSession>();

  constructor(
    private configService: ConfigService,
    private productsService: ProductsService,
  ) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY', ''),
    );
  }

  // OnModuleInit — მოდულის ინიციალიზაციისას ეშვება
  // აქ DB-დან პროდუქტებს ვიღებთ და მოდელს ვქმნით system prompt-ით
  async onModuleInit() {
    const products = await this.productsService.findAll();
    const categories = await this.productsService.getCategories();

    const systemPrompt = `შენ ხარ FakeShop ონლაინ მაღაზიის AI ასისტენტი.

შენი ამოცანაა მომხმარებელს დაეხმარო საიტის შესახებ ინფორმაციის მიწოდებაში.

საიტის შესახებ:
- ეს არის ონლაინ მაღაზია სადაც შეგიძლია პროდუქტების ნახვა, კალათაში დამატება და შეკვეთის გაფორმება
- გადახდა შესაძლებელია ბალანსით (ბარათი დროებით მიუწვდომელია)
- რეგისტრაციისას მომხმარებელს ავტომატურად ერიცხება $1000 ბალანსი

კატეგორიები: ${categories.join(', ')}

პროდუქტების სია:
${products.map((p) => `- ${p.title} | ფასი: $${p.price} | კატეგორია: ${p.category} | რეიტინგი: ${p.ratingRate}/5`).join('\n')}

წესები:
- უპასუხე მოკლედ და გასაგებად
- თუ პროდუქტზე გკითხავენ, მიეცი ზუსტი ინფორმაცია (ფასი, კატეგორია, რეიტინგი)
- თუ შეკითხვა საიტს არ ეხება, თავაზიანად უთხარი რომ მხოლოდ მაღაზიის საკითხებში შეგიძლია დახმარება`;

    // getGenerativeModel — მოდელის შექმნა systemInstruction-ით
    // systemInstruction აქ გადაეცემა (არა startChat-ში!)
    // ეს ნიშნავს რომ ყველა chat session-ს ერთი და იგივე კონტექსტი ექნება
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });
  }

  // ახალი chat session-ის შექმნა (WebSocket connect-ზე)
  createSession(socketId: string) {
    // startChat — ახალი საუბრის დაწყება
    // systemInstruction უკვე მოდელშია ჩაშენებული, აქ აღარ გჭირდება
    // history ავტომატურად ივსება ყოველი message-ით
    const chat = this.model.startChat();

    this.chatSessions.set(socketId, chat);
  }

  // streaming პასუხის გენერაცია
  // async * = Async Generator — ნაწილ-ნაწილ აბრუნებს მნიშვნელობებს
  async *streamResponse(socketId: string, userMessage: string) {
    const chat = this.chatSessions.get(socketId);

    if (!chat) {
      yield 'სესია ვერ მოიძებნა. გთხოვთ, გადატვირთოთ ჩატი.';
      return;
    }

    // sendMessageStream — შეკითხვას აგზავნის და streaming-ით აბრუნებს პასუხს
    // ისტორია ავტომატურად ახსოვს! არ გჭირდება ხელით მართვა
    const result = await chat.sendMessageStream(userMessage);

    // result.stream — async iterable, ნაწილ-ნაწილ მოდის ტექსტი
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text; // ყოველი ნაწილი → Gateway → Frontend
      }
    }
  }

  // სესიის წაშლა (WebSocket disconnect-ზე)
  removeSession(socketId: string) {
    this.chatSessions.delete(socketId);
  }
}