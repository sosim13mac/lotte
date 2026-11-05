import 'server-only';
import { betterAuth } from 'better-auth';
import { getPool } from './db';

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : undefined;

/** Better Auth 서버 (사용자/세션은 Neon 의 user, session, account, verification 테이블) */
export const auth = betterAuth({
  database: getPool(),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders: google,
});
