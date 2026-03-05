import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Swagger კონფიგურაცია
  // DocumentBuilder — API დოკუმენტაციის მეტა-ინფორმაცია
  const config = new DocumentBuilder()
    .setTitle('Auth-Nest Shop API')
    .setDescription('Auth + Shop სისტემის API დოკუმენტაცია')
    .setVersion('1.0')
    // addBearerAuth — Swagger UI-ში "Authorize" ღილაკი გაჩნდება
    // Bearer token-ს ჩაწერ და protected endpoint-ებს გატესტავ
    .addBearerAuth()
    .build();

  // createDocument — სკანირებს ყველა Controller-ს, DTO-ს, Entity-ს
  // ავტომატურად აგენერირებს endpoint-ების დოკუმენტაციას
  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI path: /fakeshopswagger
  SwaggerModule.setup('fakeshopswagger', app, document);

  // root path '/' → redirect to Swagger
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (req: any, res: any) => {
    res.redirect('/fakeshopswagger');
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
