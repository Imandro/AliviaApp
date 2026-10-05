import fs from 'node:fs';
const file='src/components/LiviVoice.css';
let css=fs.readFileSync(file,'utf8');
// The requested mascot animation must survive the app-wide reduced-motion reset.
css=css.replace(/animation(-duration)?: ([^;]+);/g,(_,suffix,value)=>`animation${suffix||''}: ${value.replace(/ !important/g,'')} !important;`);
css=css.replace('livi-attentive 3.8s','livi-attentive 2.4s').replace('livi-head-listen 4.4s','livi-head-listen 2.4s').replace(/3.4s/g,'2.2s');
fs.writeFileSync(file,css);
