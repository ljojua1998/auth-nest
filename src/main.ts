import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ValidationPipe - გლობალურად რთავს DTO validation-ს
  // Angular-ში Reactive Forms-ის validation ავტომატურად მუშაობს
  // NestJS-ში ეს pipe უნდა ჩართო რომ @IsEmail(), @MinLength() და სხვა იმუშაოს
  // whitelist: true - DTO-ში არ არსებულ ველებს ავტომატურად წაშლის (უსაფრთხოება)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
