import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    // ProductsModule — ChatService-ს ProductsService სჭირდება (DB-დან პროდუქტები)
    // exports-ში ProductsService უნდა იყოს ProductsModule-ში
    ProductsModule,

    // JwtModule — ChatGateway-ში JWT ვერიფიკაციისთვის
    // registerAsync — ConfigService-დან JWT_SECRET-ს იღებს
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  // Gateway = WebSocket Controller, Provider-ადაც რეგისტრირდება
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
