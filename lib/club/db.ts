import { env } from 'cloudflare:workers';
type ClubEnv = { DB: D1Database; ADMIN_EMAIL?: string; ADMIN_PHONE?: string };
export function config() {
  return env as unknown as ClubEnv;
}
export function db() {
  const binding = config().DB;
  if (!binding) throw new Error('قاعدة البيانات غير متاحة. حاول لاحقًا.');
  return binding;
}
export const statement = (sql: string, ...args: unknown[]) =>
  db()
    .prepare(sql)
    .bind(...args);
export async function all<T>(sql: string, ...args: unknown[]) {
  return (await statement(sql, ...args).all<T>()).results;
}
export async function one<T>(sql: string, ...args: unknown[]) {
  return statement(sql, ...args).first<T>();
}
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export const randomToken = () =>
  crypto.randomUUID().replaceAll('-', '') +
  crypto.randomUUID().replaceAll('-', '');
