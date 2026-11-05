import { IS_DEMO } from '@/lib/env';
import { createDemoRepo } from './demoRepo';
import { createNeonRepo } from './neonRepo';
import type { Repo } from './types';

let repo: Repo | null = null;

/** 브라우저에서만 호출하세요 (데모 저장소는 localStorage, Neon 저장소는 쿠키 세션 + /api/repo 사용) */
export function getRepo(): Repo {
  if (!repo) repo = IS_DEMO ? createDemoRepo() : createNeonRepo();
  return repo;
}

export * from './types';
