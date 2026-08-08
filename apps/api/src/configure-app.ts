import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

/**
 * Shared between the traditional entrypoint (main.ts, used for local dev and any
 * long-running host like Render/Railway) and the Vercel serverless entrypoint
 * (api/index.ts) so both expose identical middleware, validation, error handling and
 * Swagger docs — the only difference between them is how the resulting app is served.
 */
export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Mehndi By Dhara API')
    .setDescription('Booking and appointment management API for Mehndi By Dhara')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    // Vercel's serverless bundler doesn't ship swagger-ui-dist's static assets,
    // so load them from a CDN instead of relying on local static file serving.
    customCssUrl:
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });

  return app;
}
