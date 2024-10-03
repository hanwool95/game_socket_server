import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'https://www.ceasar.kr', // 허용할 도메인
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 허용할 메서드
    credentials: true, // 자격 증명 포함
  });

  await app.listen(4000);
}
bootstrap();
