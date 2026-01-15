import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger 설정 객체 생성
  const config = new DocumentBuilder()
    .setTitle("Code Galaxy API")
    .setDescription("Github 데이터를 이용한 API 문서")
    .setVersion('1.0')
    .addTag('Galaxy')
    .build();

  // Swagger 문서 생성 및 경로 설정
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:3000/api`);
}
bootstrap();
