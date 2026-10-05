import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
fs.writeFileSync('src/utils/tts.ts',execFileSync('git',['show','HEAD:src/utils/tts.ts']));
