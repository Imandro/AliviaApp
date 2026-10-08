/**
 * Auditoría temporal de responsive (se borra tras la revisión).
 * Se ejecuta contra `npx vite preview --port 4199` (dist ya construido).
 * Auth en producción: se siembra token + caché de usuario, y getMe() cae al
 * caché si la red falla, así que la app entra directo.
 * Uso: node scripts/tmp-responsive-audit.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:4199/#';
const OUT = 'C:\\Users\\Zbook de Mario\\AppData\\Local\\Temp\\opencode\\shots';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PREVIEW_USER = {
  id: 'preview', username: 'preview', email: 'preview@local', phone: null,
  name: 'Preview', problems: [], situations: [], strategies: [],
  trusted_person: null, trusted_phone: null, wants_contact: false,
  changes: [], goals_text: null, onboarding_done: true, landing_seen: true,
  created_at: new Date().toISOString(),
};

const VIEWPORTS = [
  { name: 'tab768', w: 768, h: 1024 },
  { name: 'tab834', w: 834, h: 1194 },
  { name: 'tab1024', w: 1024, h: 1366 },
  { name: 'desk1180', w: 1180, h: 820 },
  { name: 'desk1366', w: 1366, h: 1024 },
  { name: 'desk1920', w: 1920, h: 1080 },
];

const ROUTES = [
  '/', '/chat', '/games', '/games/doblar', '/resources', '/coping', '/plans',
  '/explore', '/library', '/assessment', '/connect', '/retos', '/profile',
  '/journal', '/community', '/sos', '/breathe', '/radar',
];

const SHOT_ROUTES = new Set(['/', '/chat', '/games', '/games/doblar', '/resources', '/coping', '/library', '/assessment', '/plans']);

const audit = () => {
  const doc = document.documentElement;
  const container = document.querySelector('.app-container');
  const content = document.querySelector('.app-content');
  const nav = document.querySelector('nav');
  const navBar = nav ? nav.firstElementChild : null;
  const out = { issues: [] };
  const cr = container ? container.getBoundingClientRect() : null;
  const cc = content ? content.getBoundingClientRect() : null;

  const pageOverflowX = doc.scrollWidth - window.innerWidth;
  if (pageOverflowX > 1) out.issues.push(`scroll horizontal de página: +${pageOverflowX}px`);

  if (cr) {
    const sideDiff = Math.abs(cr.left - (window.innerWidth - cr.right));
    out.container = { w: Math.round(cr.width), left: Math.round(cr.left), right: Math.round(cr.right), centered: sideDiff <= 2 };
    if (sideDiff > 2) out.issues.push(`contenedor descentrado: izq ${Math.round(cr.left)} vs der ${Math.round(window.innerWidth - cr.right)}`);
    if (cr.width > window.innerWidth + 1) out.issues.push(`contenedor más ancho que la ventana: ${Math.round(cr.width)}`);
  } else {
    out.issues.push('sin .app-container');
  }

  if (navBar && cr) {
    const nr = navBar.getBoundingClientRect();
    out.nav = { w: Math.round(nr.width), left: Math.round(nr.left) };
    if (nr.width > 561) out.issues.push(`navbar > 560px: ${Math.round(nr.width)}`);
    if (nr.left < cr.left - 1 || nr.right > cr.right + 1) out.issues.push('navbar fuera del contenedor');
    const gap = Math.min(nr.left - cr.left, cr.right - nr.right);
    out.nav.centerGap = Math.round(gap);
  }

  if (content && cc && cr) {
    if (content.scrollWidth - content.clientWidth > 1) {
      out.issues.push(`scroll horizontal oculto en .app-content: +${content.scrollWidth - content.clientWidth}px`);
    }
    const offenders = [];
    for (const el of content.querySelectorAll('*')) {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      if (st.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const over = Math.max(cr.left - r.left, r.right - cr.right);
      if (over > 2) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.slice(0, 40) : '',
          over: Math.round(over),
          rect: `${Math.round(r.left)}..${Math.round(r.right)} w${Math.round(r.width)}`,
        });
      }
    }
    offenders.sort((a, b) => b.over - a.over);
    if (offenders.length) out.issues.push(`${offenders.length} elemento(s) recortados por el contenedor`);
    out.outOfContainer = offenders.slice(0, 6);
  }
  return out;
};

const run = async () => {
  const browser = await chromium.launch({ channel: 'chromium' });
  const rows = [];
  const log = (m) => { console.log(m); fs.appendFileSync(`${OUT}/progress.log`, m + '\n'); };

  for (const theme of ['dark', 'light']) {
    for (const vp of VIEWPORTS) {
      if (theme === 'light' && vp.name !== 'tab1024') continue;
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
      await ctx.addInitScript(([t, u]) => {
        localStorage.setItem('alivia-theme', t);
        localStorage.setItem('alivia-tour-v2', '1');
        localStorage.setItem('alivia-install-shown-v1', '1');
        localStorage.setItem('alivia:landing-v1', '1');
        localStorage.setItem('alivia_token', 'preview-token');
        localStorage.setItem('alivia_user_cache', JSON.stringify(u));
      }, [theme, PREVIEW_USER]);
      const page = await ctx.newPage();
      // Sin backend en preview: el perfil se finge para entrar a la app real.
      await page.route('**/api/auth/me', (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PREVIEW_USER),
      }));
      for (const route of ROUTES) {
        try {
          await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('.app-container', { timeout: 10000 });
        } catch (e) {
          rows.push({ theme, vp: vp.name, route, issues: [`no cargó: ${e.message.slice(0, 80)}`] });
          log(`[${theme}] ${vp.name} ${route} NO CARGÓ`);
          continue;
        }
        await page.waitForTimeout(500);
        let res;
        try {
          res = await page.evaluate(audit);
        } catch (e) {
          res = { issues: [`evaluate falló: ${e.message.slice(0, 80)}`] };
        }
        rows.push({ theme, vp: vp.name, route, ...res });
        fs.writeFileSync(`${OUT}/audit.json`, JSON.stringify(rows, null, 2));
        log(`[${theme}] ${vp.name} ${route} → ${res.issues.length ? res.issues.join(' | ') : 'ok'}`);
        if (theme === 'dark' && SHOT_ROUTES.has(route)) {
          const slug = route.replace(/\//g, '_') || 'home';
          await page.screenshot({ path: `${OUT}/${theme}-${vp.name}-${slug}-top.png` });
          await page.evaluate(() => {
            const c = document.querySelector('.app-content');
            if (c) c.scrollTop = Math.min(760, c.scrollHeight);
          });
          await page.waitForTimeout(350);
          await page.screenshot({ path: `${OUT}/${theme}-${vp.name}-${slug}-scroll.png` });
        }
      }
      await ctx.close();
    }
  }
  await browser.close();

  const bad = rows.filter(r => r.issues && r.issues.length);
  log(`\n=== ${rows.length} combinaciones, ${bad.length} con incidencias ===\n`);
  for (const r of bad) {
    log(`[${r.theme}] ${r.vp} ${r.route}`);
    for (const i of r.issues) log(`   - ${i}`);
    if (r.outOfContainer && r.outOfContainer.length) {
      for (const o of r.outOfContainer) log(`     · <${o.tag} class="${o.cls}"> sobresale ${o.over}px (${o.rect})`);
    }
  }
  const dims = {};
  for (const r of rows) {
    if (!r.container) continue;
    dims[r.vp] ??= { container: r.container.w, nav: r.nav?.w, gap: r.nav?.centerGap };
  }
  log('\n=== dimensiones por viewport ===');
  for (const [k, v] of Object.entries(dims)) log(` ${k}: contenedor ${v.container}px · navbar ${v.nav}px · hueco lateral ${v.gap}px`);
  log('FIN');
};

run().catch(e => { fs.appendFileSync(`${OUT}/progress.log`, 'FATAL ' + e.message + '\n'); process.exit(1); });
