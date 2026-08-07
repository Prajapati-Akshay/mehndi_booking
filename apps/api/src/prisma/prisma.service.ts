import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import * as path from 'path';

/**
 * Same SQLite schema everywhere; only the connection differs.
 *
 * - Local dev / a traditional host (Render, Railway, a VPS): DATABASE_URL="file:./dev.db"
 *   is a normal on-disk file that persists across requests.
 * - Vercel: serverless functions get a fresh, read-only-except-/tmp filesystem on every
 *   invocation, so a local file can't hold real data there. Instead, set TURSO_DATABASE_URL
 *   (libsql://...) and TURSO_AUTH_TOKEN to point at a Turso database (hosted, SQLite-wire
 *   compatible) — see README "Deploying to Vercel" for the one-time setup.
 */
// The Prisma CLI (migrate/db push) resolves a relative sqlite `url` against
// prisma/schema.prisma's directory, i.e. apps/api/prisma/dev.db. @libsql/client has no
// knowledge of that convention and would instead resolve "file:./dev.db" against
// process.cwd() — a different file. All of our npm scripts run with cwd = apps/api, so
// pointing directly at prisma/dev.db here keeps both tools looking at the same database.
const LOCAL_DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');

function buildAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const client = tursoUrl
    ? createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN })
    : createClient({ url: `file:${LOCAL_DB_PATH}` });
  return new PrismaLibSQL(client);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: buildAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
