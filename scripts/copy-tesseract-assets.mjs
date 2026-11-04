// Tesseract.js 워커·엔진(WASM)·영문 학습데이터를 public/tesseract 로 복사합니다 (npm postinstall).
// CDN 없이 자체 호스팅 → PWA 오프라인 캐시 / Flutter WebView 에서도 동작.
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const out = join(root, 'public', 'tesseract');

function pkgDir(name) {
  try {
    return dirname(require.resolve(`${name}/package.json`));
  } catch {
    return null;
  }
}

const tesseract = pkgDir('tesseract.js');
const core = pkgDir('tesseract.js-core');
const eng = pkgDir('@tesseract.js-data/eng');
if (!tesseract || !core || !eng) {
  console.warn('[tesseract] 패키지가 없어 OCR 자산 복사를 건너뜁니다.');
  process.exit(0);
}

await mkdir(join(out, 'core'), { recursive: true });
await mkdir(join(out, 'lang'), { recursive: true });

await copyFile(join(tesseract, 'dist', 'worker.min.js'), join(out, 'worker.min.js'));

// corePath 디렉터리에는 모든 *.wasm.js 변형(기본/SIMD/relaxed SIMD × LSTM)이 있어야 합니다.
const coreFiles = (await readdir(core)).filter((f) => f.endsWith('.wasm.js'));
for (const f of coreFiles) await copyFile(join(core, f), join(out, 'core', f));

// OEM 1(LSTM) 기본값과 맞는 4.0.0_best_int (약 2.9MB)
const lang = join(eng, '4.0.0_best_int', 'eng.traineddata.gz');
if (existsSync(lang)) await copyFile(lang, join(out, 'lang', 'eng.traineddata.gz'));

console.log(`[tesseract] public/tesseract 에 워커 1개, 엔진 ${coreFiles.length}개, 언어 데이터 1개 복사`);
