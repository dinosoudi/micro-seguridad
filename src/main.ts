// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // descarta propiedades no declaradas en el DTO
      forbidNonWhitelisted: true, // error si mandan campos extra (evita mass-assignment raro)
      transform: true,        // convierte payloads planos a instancias de clase
    }),
  );

  app.enableCors(); // ajusta origins según tus otros servicios

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();