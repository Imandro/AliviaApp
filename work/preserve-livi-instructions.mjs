import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const original = execFileSync('git', ['show', 'HEAD:AGENTS.md'], { encoding: 'utf8' });
const preferences = fs.readFileSync('AGENTS.md', 'utf8');
fs.writeFileSync('AGENTS.md', original.trimEnd() + '\n\n' + preferences);
