import { chromium } from 'playwright';
for (const opts of [{ channel: 'chromium' }, { headless: false }]) {
  try {
    const b = await chromium.launch(opts);
    const p = await b.newPage();
    await p.setContent('<h1>ok</h1>');
    console.log('OK', JSON.stringify(opts));
    await b.close();
  } catch (e) { console.log('FAIL', JSON.stringify(opts), e.message.split('\n')[0]); }
}
