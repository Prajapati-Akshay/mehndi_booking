import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

const server = express();

let bootstrapped: Promise<void> | undefined;

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  configureApp(app);

  await app.init();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!bootstrapped) {
    bootstrapped = bootstrap();
  }

  await bootstrapped;

  server(req, res);
}