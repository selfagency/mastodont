import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export async function createTempFileWithContent(content: string) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mastodont-test-'));
  const tmpFile = path.join(tmpDir, `mastodont-${Date.now()}.txt`);
  await fs.writeFile(tmpFile, content);
  return { tmpDir, tmpFile };
}

export async function cleanupTempDir(tmpDir?: string) {
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
}
