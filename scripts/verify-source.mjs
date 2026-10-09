import { createHash } from 'node:crypto';
import { readFileSync, lstatSync, readlinkSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const revision = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(revision || '')) throw new Error('Pass a complete Git commit SHA');
const root = process.cwd();
async function github(path) {
  const response = await fetch(`https://api.github.com/repos/Imandro/AliviaApp/${path}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Alivia-source-verification' },
  });
  if (!response.ok) throw new Error(`GitHub source verification: HTTP ${response.status}`);
  return response.json();
}
const commit = await github(`git/commits/${revision}`);
const tree = await github(`git/trees/${commit.tree.sha}?recursive=1`);
if (tree.truncated) throw new Error('GitHub returned an incomplete tree');
let checked = 0;
for (const item of tree.tree) {
  if (item.type !== 'blob') continue;
  const path = resolve(root, item.path);
  if (!path.startsWith(root + sep)) throw new Error('Invalid source path');
  const bytes = lstatSync(path).isSymbolicLink()
    ? Buffer.from(readlinkSync(path)) : readFileSync(path);
  const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (hash !== item.sha) throw new Error(`Source differs from GitHub: ${item.path}`);
  checked++;
}
const proof = { revision, tree: commit.tree.sha, checkedFiles: checked, result: 'match', checkedAt: new Date().toISOString() };
writeFileSync('SOURCE_VERIFICATION.json', JSON.stringify(proof, null, 2) + '\n');
console.log(JSON.stringify(proof));
