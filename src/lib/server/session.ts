import 'server-only';
import { headers } from 'next/headers';
import { auth } from './auth';

export interface SessionUser {
  id: string;
  email: string;
}

/** 요청의 세션 사용자. 로그인하지 않았으면 null */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: headers() });
  return session ? { id: session.user.id, email: session.user.email } : null;
}
