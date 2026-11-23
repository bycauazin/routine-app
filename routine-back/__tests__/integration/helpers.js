import request from "supertest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/database/prisma.js";
import UserService from "../../src/services/UserService.js";

export const ORIGIN = "http://localhost:5174";
export const app = createApp();

/** Removes every row from the test database (keeps the schema). */
export async function resetDatabase() {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let counter = 0;

/**
 * Creates a user and returns a supertest agent already logged in (cookie kept
 * between requests). All mutating calls send the allowed Origin header.
 */
export async function createLoggedInUser(overrides = {}) {
  counter += 1;
  const credentials = {
    email: overrides.email ?? `user${counter}-${Date.now()}@example.com`,
    name: overrides.name ?? `User ${counter}`,
    password: overrides.password ?? "senha-super-segura-123",
  };
  const user = await UserService.create(credentials);
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").set("Origin", ORIGIN).send(credentials);
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { user, agent, credentials };
}
