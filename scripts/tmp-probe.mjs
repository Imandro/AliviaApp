import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ viewport: { width: 1024, height: 1366 } });
await ctx.addInitScript(() => {
  localStorage.setItem('alivia-theme', 'dark');
  localStorage.setItem('alivia-tour-v2', '1');
  localStorage.setItem('alivia_token', 'preview-token');
  localStorage.setItem('alivia_user_cache', JSON.stringify({ id: 'p', username: 'p', email: 'p@l', phone: null, name: 'Preview', problems: [], situations: [], strategies: [], trusted_person: null, trusted_phone: null, wants_contact: false, changes: [], goals_text: null, onboarding_done: true, landing_seen: true, created_at: new Date().toISOString() }));
});
const page = await ctx.newPage();
page.on('console', m => console.log('[console]', m.type(), m.text().slice(0, 120)));
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));
await page.goto('http://localhost:4199/#/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
console.log('app-container:', await page.locator('.app-container').count());
console.log('html head:', (await page.locator('body').innerHTML()).slice(0, 300));
await b.close();
