import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function hashMasterResume(filePath: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex')
    .toUpperCase();
}

export async function assertMasterUnchanged(
  filePath: string,
  expectedSha256: string,
): Promise<void> {
  const actual = await hashMasterResume(filePath);
  if (actual !== expectedSha256.toUpperCase())
    throw new Error(
      `Master resume hash changed: expected ${expectedSha256}, got ${actual}`,
    );
}
