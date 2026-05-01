import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('WorldFantasy API')
    .setDescription('ქართული Fantasy Football პლატფორმა — World Cup 2026')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (_req: unknown, res: { redirect: (path: string) => void }) => {
    res.redirect('/api');
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`WorldFantasy API running on port ${process.env.PORT ?? 3000}`);
  console.log(`Swagger: http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
