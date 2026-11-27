// 배포용 public/ 폴더를 만든다: 화면 파일만 복사하고 학교 로고·문서 그림·시험·도구는 뺀다
import { readdirSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
const files = readdirSync(root).filter((f) => /\.(html|js|css)$/.test(f));
for (const f of files) copyFileSync(join(root, f), join(out, f));
console.log('public/ ' + files.length + '개: ' + files.join(' '));
