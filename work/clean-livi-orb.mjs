import fs from 'node:fs';
const path = 'src/views/ChatView.tsx';
let source = fs.readFileSync(path, 'utf8');
source = source.replace(/const ORB_BG:[\s\S]*?(?=export const ChatView)/, '');
source = source.replace(/  orbOverlay: \{[\s\S]*?(?=  introCard:)/, '');
fs.writeFileSync(path, source);
