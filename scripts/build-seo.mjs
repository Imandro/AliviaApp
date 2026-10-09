/**
 * Genera las paginas estaticas que Google puede indexar.
 *
 * Por que hace falta esto: la app usa HashRouter, asi que para un crawler
 * /#/breathe, /#/journal y / son la misma URL. Todo el contenido de la
 * biblioteca (33 guias) y las 33 lineas de crisis verificadas viven detras de
 * ese hash y no existen para un buscador. Este script las saca a HTML plano,
 * que es lo unico que se puede posicionar de verdad.
 *
 * Las paginas se generan desde la MISMA fuente que consume la app (GUIDES,
 * LIBRARY, OFFICIAL_RESOURCES), no se copian a mano: si editas una guia en
 * src/utils/libraryContent.ts, esta pagina cambia en el siguiente build y no
 * puede quedar contando una version vieja de un telefono de crisis.
 *
 * Uso: node scripts/build-seo.mjs
 */

import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { updateDownloadPage } from './download-page.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outSeoDir = join(root, 'public', 'seo');

const SITE = 'https://alivia.lat';

/* ------------------------------------------------------------------ */
/* 1. Traer el contenido real de la app                              */
/* ------------------------------------------------------------------ */

// Bundling a un ESM temporal para poder importar los .ts desde Node.
const bridgeDir = join(root, 'node_modules', '.cache', 'seo-bridge');
rmSync(bridgeDir, { recursive: true, force: true });
mkdirSync(bridgeDir, { recursive: true });

const entry = join(bridgeDir, 'entry.ts');
writeFileSync(
  entry,
  [
    "export { GUIDES, GUIDE_MINUTES } from '../../../src/utils/libraryContent';",
    "export { LIBRARY } from '../../../src/utils/libraryItems';",
    "export { OFFICIAL_RESOURCES, CRISIS_COUNTRIES, COUNTRY_MAP } from '../../../src/utils/officialResources';",
    "export { CRISIS_LINES } from '../../../src/utils/crisisLines';",
  ].join('\n'),
  'utf8',
);

const bundlePath = join(bridgeDir, 'bundle.mjs');
await build({
  entryPoints: [entry],
  outfile: bundlePath,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Los iconos de lucide son componentes de React: esta pagina no los usa,
  // pero libraryItems.ts los importa, asi que se dejan fuera.
  external: ['react', 'react-dom', 'lucide-react'],
  logLevel: 'silent',
});

const { GUIDES, GUIDE_MINUTES, LIBRARY, OFFICIAL_RESOURCES, CRISIS_COUNTRIES, CRISIS_LINES } =
  await import(`file://${bundlePath.replace(/\\/g, '/')}`);

/* ------------------------------------------------------------------ */
/* 2. Utilidades                                                      */
/* ------------------------------------------------------------------ */

const esc = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** JSON-LD: si el texto lleva < o &, un script normal se rompe al parsearlo. */
const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const slugify = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const BASE_CSS = `
:root{
  --fondo-0:#0D1810; --fondo-1:#1A2A20; --vidrio:#16241C;
  --linea:rgba(233,243,238,.10);
  --texto:#EAF3EE; --texto-2:#A9BFB2; --texto-3:#7C948A;
  --oro:#F2E3A0; --salvia:#8CB08D; --lavanda:#B9A8E6; --coral:#E57373;
}
*{box-sizing:border-box}
body{
  margin:0;background:var(--fondo-0);color:var(--texto);
  font-family:Lato,system-ui,-apple-system,sans-serif;font-size:17px;line-height:1.7;
  -webkit-font-smoothing:antialiased;
}
.wrap{width:min(860px,90vw);margin-inline:auto}
h1,h2,h3{font-family:Quicksand,system-ui,sans-serif;font-weight:600;line-height:1.18;margin:0 0 .6em;letter-spacing:-.01em}
h1{font-size:clamp(1.9rem,5vw,3rem);max-width:22ch}
h2{font-size:clamp(1.35rem,3vw,1.9rem);margin-top:2.2em;max-width:26ch}
h3{font-size:1.15rem;margin-top:1.8em}
p{margin:0 0 1.05em}
a{color:var(--oro)}
.migas{font-size:.85rem;color:var(--texto-3);padding:22px 0 0}
.migas a{color:var(--texto-2)}
.lead{font-size:1.1rem;color:var(--texto-2);max-width:62ch}
.cradle{
  background:radial-gradient(900px 500px at 50% -10%,rgba(44,83,61,.5),transparent 60%),
             radial-gradient(600px 400px at 100% 10%,rgba(140,176,141,.12),transparent 60%),
             var(--fondo-0);
}
.nota{
  border:1px solid var(--linea);border-left:3px solid var(--salvia);
  background:var(--vidrio);border-radius:10px;padding:16px 18px;margin:1.6em 0;
  color:var(--texto-2);font-size:.95rem;
}
.peligro{
  border:1px solid rgba(229,115,115,.35);border-left:3px solid var(--coral);
  background:rgba(229,115,115,.08);border-radius:10px;padding:16px 18px;margin:1.6em 0;
}
.peligro strong{color:var(--coral)}
.tarjeta{
  display:block;text-decoration:none;color:inherit;
  background:var(--vidrio);border:1px solid var(--linea);border-radius:14px;
  padding:20px 22px;transition:border-color .18s,transform .18s;
}
.tarjeta:hover{border-color:rgba(233,200,107,.4);transform:translateY(-2px)}
.tarjeta h3{margin:0 0 .35em;font-size:1.08rem}
.tarjeta p{margin:0;color:var(--texto-2);font-size:.95rem}
.meta{font-size:.8rem;color:var(--texto-3);text-transform:uppercase;letter-spacing:.09em;margin:0 0 .5em}
.rejilla{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));margin:1.6em 0}
.pill{
  display:inline-block;font-size:.75rem;padding:2px 10px;border-radius:999px;
  border:1px solid var(--linea);color:var(--texto-2);margin-left:6px;vertical-align:middle;
}
.pill.ok{color:var(--salvia);border-color:rgba(140,176,141,.4)}
.cta{
  display:inline-block;margin:1.4em 0;padding:14px 26px;border-radius:999px;
  background:linear-gradient(135deg,var(--oro),var(--oro-vivo,#E9C86B));
  color:#0c1810;font-family:Quicksand,sans-serif;font-weight:700;text-decoration:none;
}
footer{border-top:1px solid var(--linea);margin-top:3.5em;padding:26px 0 60px;color:var(--texto-3);font-size:.88rem}
footer a{color:var(--texto-2)}
ul.chk{list-style:none;padding:0;margin:1em 0}
ul.chk li{padding-left:30px;position:relative;margin-bottom:.7em}
ul.chk li::before{content:"\\2713";position:absolute;left:0;color:var(--salvia);font-weight:700}
ol.pasos{padding-left:22px}
ol.pasos li{margin-bottom:.8em}
.cita{
  border-left:2px solid var(--lavanda);padding:4px 0 4px 18px;margin:1.6em 0;
  color:var(--texto-2);font-style:italic;
}
.cita footer{border:0;margin:6px 0 0;padding:0;font-size:.85rem;font-style:normal}
.paso{display:flex;gap:14px;margin:1.5em 0}
.paso .emo{font-size:1.7rem;line-height:1.2;flex:0 0 auto}
.paso h3{margin:0 0 .2em}
.paso p{margin:0}
@media (max-width:560px){body{font-size:16px}}
`;

/** Envoltura comun: head completo, migas, pie y datos estructurados. */
function page({ title, description, canonical, jsonLdBlocks = [], body, crumbName }) {
  const crumbs = [{ name: 'Inicio', url: `${SITE}/` }];
  if (crumbName) crumbs.push({ name: crumbName, url: canonical });

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="theme-color" content="#0D1810">
<meta name="google-site-verification" content="X7CJ_RKRPrpAP2DtYNzhUA3fNdIbILOIgXFiwHscnAI">

<meta property="og:type" content="website">
<meta property="og:site_name" content="ALIVIA">
<meta property="og:locale" content="es_419">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${SITE}/icon-512.png">
<meta property="og:image:alt" content="ALIVIA, espacio de calma para j\u00F3venes">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/icon-512.png">

<link rel="icon" type="image/png" href="/icon-128.png">
<link rel="preconnect" href="${SITE}">
<link rel="preload" as="font" type="font/woff2" href="/fonts/lato-400.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/fonts/quicksand-600.woff2" crossorigin>
<link rel="stylesheet" href="/seo/estilos.css">
${jsonLdBlocks.map(jsonLd).join('\n')}
${jsonLd(breadcrumbLd)}
</head>
<body class="cradle">
<nav class="wrap migas" aria-label="Migas de pan"><a href="/">ALIVIA</a>${crumbName ? ` &rsaquo; <span>${esc(crumbName)}</span>` : ''}</nav>
<main class="wrap">
${body}
</main>
<footer class="wrap">
  <p><strong>ALIVIA</strong> es un espacio de bienestar emocional. Esta informaci&oacute;n es orientativa y
  no sustituye a un profesional de la salud mental ni a la atenci&oacute;n de urgencias.</p>
  <p>
    <a href="/">Abrir la app</a> &middot;
    <a href="/seo/guias.html">Gu&iacute;as</a> &middot;
    <a href="/seo/lineas-de-crisis.html">L&iacute;neas de crisis</a> &middot;
    <a href="/landing.html">Sobre ALIVIA</a> &middot;
    <a href="/descarga.html">Descargar para Android</a>
  </p>
</footer>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* 3. Preparacion de las guias ( slugs )                              */
/* ------------------------------------------------------------------ */

// Va antes de la pagina de crisis: esa pagina enlaza a guias concretas, y
// guideUrl es un const que aun no existiria si se declarase mas abajo.
const guides = LIBRARY.filter((item) => GUIDES[item.id]).map((item) => ({
  ...item,
  slug: slugify(item.title),
  // GUIDES[].minutes es la fuente real; si faltara, 3 es un supuesto honesto.
  // Usar la longitud de la descripcion daria "28 min" sin ningun sentido.
  minutes: GUIDE_MINUTES[item.id] ?? 3,
  guide: GUIDES[item.id],
}));

// Slugs unicos: dos titulos podrian normalizar al mismo texto. El mapa se
// consulta tambien al montar los enlaces cruzados, que si no apuntarian al
// slug "limpio" en vez del deduplicado.
const seenSlugs = new Set();
for (const g of guides) {
  let slug = g.slug;
  let n = 2;
  while (seenSlugs.has(slug)) slug = `${g.slug}-${n++}`;
  seenSlugs.add(slug);
  g.slug = slug;
}
const slugById = new Map(guides.map((g) => [g.id, g.slug]));
const guideUrl = (id) => (slugById.has(id) ? `/seo/guia/${slugById.get(id)}.html` : '/seo/guias.html');

/* ------------------------------------------------------------------ */
/* 4. Pagina de lineas de crisis                                     */
/* ------------------------------------------------------------------ */

const COUNTRY_LABEL = {
  NI: 'Nicaragua',
  SV: 'El Salvador',
  GT: 'Guatemala',
  HN: 'Honduras',
  CR: 'Costa Rica',
  PA: 'Panam&aacute;',
};
const PLAIN_LABEL = { NI: 'Nicaragua', SV: 'El Salvador', GT: 'Guatemala', HN: 'Honduras', CR: 'Costa Rica', PA: 'Panamá' };

function resourceRow(r) {
  const badges = [];
  if (r.free) badges.push('<span class="pill ok">gratis</span>');
  if (r.youthFriendly) badges.push('<span class="pill ok">para j&oacute;venes</span>');
  if (r.inPerson) badges.push('<span class="pill">presencial</span>');
  if (r.virtual) badges.push('<span class="pill">en l&iacute;nea</span>');

  const contacto = [];
  if (r.phone) contacto.push(`<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`);
  if (r.website) contacto.push(`<a href="${esc(r.website)}" rel="nofollow noopener">web</a>`);

  const meta = [r.hours ? esc(r.hours) : null, r.city ? esc(r.city) : null, `verificado ${esc(r.lastVerified)}`]
    .filter(Boolean)
    .join(' &middot; ');

  return `<article class="tarjeta">
  <h3>${esc(r.name)}${badges.join('')}</h3>
  <p>${contacto.join(' &middot; ') || 'Consultar en la web'}</p>
  ${meta ? `<p style="font-size:.8rem;color:var(--texto-3);margin:.5em 0 0">${meta}</p>` : ''}
</article>`;
}

const crisisBody = (() => {
  const sections = [];

  sections.push(`<h1 style="margin-top:1.4em">L&iacute;neas de crisis y salud mental en Nicaragua y seis pa&iacute;ses m&aacute;s</h1>
<p class="lead">N&uacute;meros p&uacute;blicos y verificados para pedir ayuda en una crisis de salud mental, con
tel&eacute;fono, horario y web de cada uno. Sin registro, sin costo y sin explicar qui&eacute;n eres.</p>

<div class="peligro">
  <p style="margin:0"><strong>Si hay riesgo inmediato para tu vida, llama primero a emergencias.</strong>
  Si est&aacute;s en Nicaragua, <a href="tel:911">911</a> o <a href="tel:128">128</a>. La l&iacute;nea 128
  es el n&uacute;mero de salud mental del MINSA y funciona tambi&eacute;n fuera de una crisis aguda.</p>
</div>`);

  for (const country of CRISIS_COUNTRIES) {
    const resources = OFFICIAL_RESOURCES.filter((r) => r.country === country.country);
    if (!resources.length) continue;
    const html = resources.map(resourceRow).join('\n');
    sections.push(`<h2 id="${country.country.toLowerCase()}">${COUNTRY_LABEL[country.country]}</h2>
<p>Emergencias: <strong>${esc(country.emergency)}</strong></p>
<div class="rejilla">
${html}
</div>`);
  }

  const intl = OFFICIAL_RESOURCES.filter((r) => r.country === 'INTL');
  sections.push(`<h2 id="internacional">Directorios internacionales</h2>
<p>Si est&aacute;s fuera de Centroam&eacute;rica, o necesitas un l&iacute;nea distinta a las de tu pa&iacute;s:</p>
<div class="rejilla">
${intl.map(resourceRow).join('\n')}
</div>`);

  sections.push(`<div class="nota">
  <p style="margin:0"><strong>C&oacute;mo se verifica esta lista.</strong> Cada n&uacute;mero lleva la fecha
  en que se confirm&oacute; por &uacute;ltima vez. Quando un contacto no se pudo confirmar, el recurso no se
  publica: es preferible cinco l&iacute;neas que funcionan a treinta que nadie contesta. Si alg&uacute;n
  n&uacute;mero de aqu&iacute; dej&oacute; de responder, escr&iacute;benos y lo quitamos.</p>
</div>

<h2>Qu&eacute; hacer mientras esperas</h2>
<ol class="pasos">
  <li><strong>No te quedes solo con esto.</strong> Avisa a alguien de confianza: un familiar, un amigo, un profesor. El isolation en crisis es el factor de riesgo m&aacute;s pesado que existe.</li>
  <li><strong>Respira con salida m&aacute;s larga.</strong> Inhala 4 segundos, exhala 6. La exhalaci&oacute;n larga es la que activa el sistema de calma; hacerla al rev&eacute;s no.</li>
  <li><strong>Mueve el cuerpo.</strong> Salir a caminar r&aacute;pido unos minutos baja la activaci&oacute;n fisiol&oacute;gica m&aacute;s que cualquier t&eacute;cnica de respiraci&oacute;n.</li>
  <li><strong>Escribe lo que piensas.</strong> Pasarlo a papel baja la rumiaci&oacute;n. El diario de ALIVIA est&aacute; dise&ntilde;ado para borrarse despu&eacute;s, si prefieres que no quede nada.</li>
</ol>

<h2>Gu&iacute;as para este momento</h2>
<div class="rejilla">
${LIBRARY.filter((i) => ['l4', 'l3', 'l8'].includes(i.id))
  .map((i) => `<a class="tarjeta" href="${guideUrl(i.id)}"><h3>${esc(i.title)}</h3><p>${esc(i.desc)}</p></a>`)
  .join('\n')}
</div>

<p style="margin-top:2em"><a class="cta" href="/">Abrir ALIVIA</a></p>`);

  return sections.join('\n');
})();

const crisisLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: 'Líneas de crisis y salud mental en Nicaragua y Centroamérica',
    description:
      'Números públicos y verificados de líneas de crisis de salud mental en Nicaragua, El Salvador, Guatemala, Honduras, Costa Rica y Panamá, con teléfono, horario y web.',
    url: `${SITE}/seo/lineas-de-crisis.html`,
    inLanguage: 'es',
    isPartOf: { '@type': 'WebSite', name: 'ALIVIA', url: `${SITE}/` },
    publisher: { '@type': 'Organization', name: 'ALIVIA', url: `${SITE}/` },
    dateModified: new Date().toISOString().slice(0, 10),
    about: { '@type': 'MedicalCondition', name: 'Salud mental' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: OFFICIAL_RESOURCES.length,
      itemListElement: OFFICIAL_RESOURCES.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.name,
      })),
    },
  },
];

/* ------------------------------------------------------------------ */
/* 5. Paginas de guias                                               */
/* ------------------------------------------------------------------ */

const TYPE_LABEL = { libro: 'Lectura', articulo: 'Art&iacute;culo', recurso: 'Recurso' };

const categoryList = (item) => (Array.isArray(item.category) ? item.category : [item.category]);
const CATEGORY_LABEL = {
  depresion: 'Depresi&oacute;n',
  ansiedad: 'Ansiedad',
  familia: 'Familia',
  economia: 'Econom&iacute;a',
  amistades: 'Amistades',
  noviazgo: 'Noviazgo',
  adicciones: 'Adicciones',
  suicidio: 'Crisis',
  bienestar: 'Bienestar',
};

function renderBlocks(blocks) {
  return blocks
    .map((b) => {
      switch (b.kind) {
        case 'intro':
          return `<p class="lead">${esc(b.text)}</p>`;
        case 'steps':
          return `<div class="paso"><span class="emo" aria-hidden="true">${esc(b.emoji ?? '')}</span><div><h3>${esc(b.title ?? '')}</h3><p>${esc(b.text)}</p></div></div>`;
        case 'check':
          return `<ul class="chk">${(b.items ?? []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
        case 'tip':
          return `<div class="nota"><p style="margin:0">${esc(b.text)}</p></div>`;
        case 'quote':
          return `<blockquote class="cita">&laquo;${esc(b.text)}&raquo;<footer>&mdash; ${esc(b.title ?? '')}</footer></blockquote>`;
        case 'action':
          return `<p><a class="cta" href="/">${esc(b.action?.label ?? 'Abrir la app')}</a></p>`;
        case 'quiz':
          // El quiz es practico: en la app se responde. En HTML estatico se
          // conserva la pregunta y la explicacion, que es lo que aporta valor
          // de lectura, sin fingir un formulario que no existe.
          return b.quiz
            ? `<div class="nota"><p><strong>Para responder en la app:</strong> ${esc(b.quiz.q)}</p><p style="margin:0">${esc(b.quiz.why)}</p></div>`
            : '';
        case 'close':
          return `<p>${esc(b.text)}</p>`;
        default:
          return '';
      }
    })
    .join('\n');
}

const hubBody = `<h1 style="margin-top:1.4em">Gu&iacute;as de bienestar emocional</h1>
<p class="lead">${guides.length} gu&iacute;as breves sobre ansiedad, depresi&oacute;n, amistades, familia,
noviazgo y dinero. Se leen en ${Math.min(...guides.map((g) => g.minutes))} a ${Math.max(...guides.map((g) => g.minutes))} minutos y est&aacute;n escritas para leerse, no para skimming.</p>

<div class="nota">
  <p style="margin:0"><strong>Esto no es terapia.</strong> Son material de apoyo para momentos concretos.
  Si hay riesgo para tu vida, las <a href="/seo/lineas-de-crisis.html">l&iacute;neas de crisis verificadas</a>
  est&aacute;n a un clic.</p>
</div>

<div class="rejilla">
${guides
  .map(
    (g) => `<a class="tarjeta" href="/seo/guia/${g.slug}.html">
  <p class="meta">${TYPE_LABEL[g.type]} &middot; ${g.minutes} min</p>
  <h3>${esc(g.title)}</h3>
  <p>${esc(g.desc)}</p>
</a>`
  )
  .join('\n')}
</div>`;

const guidePages = guides.map((g) => {
  const cats = categoryList(g).map((c) => CATEGORY_LABEL[c] ?? c).join(' · ');
  const related = LIBRARY.filter((item) => {
    if (item.id === g.id) return false;
    const a = categoryList(g);
    const b = categoryList(item);
    return b.some((c) => a.includes(c));
  })
    .slice(0, 3);

  const body = `<h1 style="margin-top:1.4em">${esc(g.title)}</h1>
<p class="meta">${TYPE_LABEL[g.type]} &middot; ${g.minutes} min de lectura &middot; ${cats}</p>
<p class="lead">${esc(g.desc)}</p>

${renderBlocks(g.guide.blocks)}

<div class="nota">
  <p style="margin:0">Esta gu&iacute;a es material de apoyo, no atenci&oacute;n profesional. Si te sientes
  en riesgo, usa las <a href="/seo/lineas-de-crisis.html">l&iacute;neas de crisis</a>.</p>
</div>

<p><a class="cta" href="/">Abrir ALIVIA</a></p>

${
  related.length
    ? `<h2>Te puede servir tambi&eacute;n</h2>
<div class="rejilla">
${related
  .map(
    (r) =>
      `<a class="tarjeta" href="${guideUrl(r.id)}"><p class="meta">${TYPE_LABEL[r.type]}</p><h3>${esc(r.title)}</h3><p>${esc(r.desc)}</p></a>`
  )
  .join('\n')}
</div>`
    : ''
}`;

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: g.title,
      description: g.desc,
      inLanguage: 'es',
      url: `${SITE}/seo/guia/${g.slug}.html`,
      dateModified: new Date().toISOString().slice(0, 10),
      isAccessibleForFree: true,
      publisher: { '@type': 'Organization', name: 'ALIVIA', url: `${SITE}/` },
    },
  ];

  return {
    slug: g.slug,
    html: page({
      title: `${g.title} | ALIVIA`,
      description: g.desc,
      canonical: `${SITE}/seo/guia/${g.slug}.html`,
      jsonLdBlocks: ld,
      crumbName: 'Guías',
      body,
    }),
  };
});

const hubHtml = page({
  title: 'Guías de bienestar emocional para jóvenes | ALIVIA',
  description: `${guides.length} guías breves sobre ansiedad, depresión, amistades, familia, noviazgo y dinero, explicadas en pocos minutos. Sin registro y sin costo.`,
  canonical: `${SITE}/seo/guias.html`,
  jsonLdBlocks: [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Guías de bienestar emocional',
      description: `Colección de ${guides.length} guías breves de bienestar emocional para jóvenes.`,
      url: `${SITE}/seo/guias.html`,
      inLanguage: 'es',
      isPartOf: { '@type': 'WebSite', name: 'ALIVIA', url: `${SITE}/` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: guides.length,
        itemListElement: guides.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: g.title,
          url: `${SITE}/seo/guia/${g.slug}.html`,
        })),
      },
    },
  ],
  crumbName: 'Guías',
  body: hubBody,
});

const crisisHtml = page({
  title: 'Líneas de crisis y salud mental por país | ALIVIA',
  description:
    'Teléfonos y webs verificados de líneas de crisis de salud mental en Nicaragua, El Salvador, Guatemala, Honduras, Costa Rica y Panamá. Gratis, sin registro.',
  canonical: `${SITE}/seo/lineas-de-crisis.html`,
  jsonLdBlocks: crisisLd,
  crumbName: 'Líneas de crisis',
  body: crisisBody,
});

/* ------------------------------------------------------------------ */
/* 5. Sitemap                                                         */
/* ------------------------------------------------------------------ */

const today = new Date().toISOString().slice(0, 10);
const sitemapUrls = [
  { loc: `${SITE}/`, freq: 'weekly', pri: '1.0' },
  { loc: `${SITE}/seo/lineas-de-crisis.html`, freq: 'monthly', pri: '0.9' },
  { loc: `${SITE}/seo/guias.html`, freq: 'weekly', pri: '0.9' },
  ...guides.map((g) => ({ loc: `${SITE}/seo/guia/${g.slug}.html`, freq: 'monthly', pri: '0.7' })),
  { loc: `${SITE}/landing.html`, freq: 'monthly', pri: '0.8' },
  { loc: `${SITE}/descarga.html`, freq: 'monthly', pri: '0.8' },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por scripts/build-seo.mjs. No editar a mano. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

/* ------------------------------------------------------------------ */
/* 6. La pagina de descarga: su title estaba escrito a mano            */
/* ------------------------------------------------------------------ */

// La pagina de descarga lei��a la version de releases.json para el cuerpo,
// pero el <title> y las metas los tenia escritos a mano: "APK v1.2.0, 4,8 MB"
// seguia diciendo dos versiones y tres megabytes despues. Google lee el title
// estatico, asi que un dato falso ahi se paga en clics y en confianza.
// Se reescriben desde el manifiesto para que no vuelva a pasar.
const releaseManifest = JSON.parse(readFileSync(join(root, 'public', 'releases.json'), 'utf8'));
const descargaPath = join(root, 'public', 'descarga.html');

if (existsSync(descargaPath)) {
  const html = readFileSync(descargaPath, 'utf8');
  const size = releaseManifest.sizeLabel ?? `${(releaseManifest.bytes / 1048576).toFixed(1)} MB`;
  const version = releaseManifest.version;

  writeFileSync(descargaPath, updateDownloadPage(html, releaseManifest, SITE), 'utf8');
  console.log(`SEO: descarga.html actualizada a v${version} (${size})`);
} else {
  console.warn('SEO: no existe public/descarga.html, se deja sin tocar');
}

/* ------------------------------------------------------------------ */
/* 7. Escribir                                                        */
/* ------------------------------------------------------------------ */

// Las paginas viven en public/seo/ para que las rutas sean /seo/... y no
// choquen con la SPA: la funcion de CloudFront sirve cualquier ruta CON punto
// tal cual, y estas paginas tienen extension .html.
rmSync(outSeoDir, { recursive: true, force: true });
mkdirSync(join(outSeoDir, 'guia'), { recursive: true });

writeFileSync(join(outSeoDir, 'estilos.css'), BASE_CSS, 'utf8');
writeFileSync(join(outSeoDir, 'lineas-de-crisis.html'), crisisHtml, 'utf8');
writeFileSync(join(outSeoDir, 'guias.html'), hubHtml, 'utf8');
for (const g of guidePages) {
  writeFileSync(join(outSeoDir, 'guia', `${g.slug}.html`), g.html, 'utf8');
}
writeFileSync(join(root, 'public', 'sitemap.xml'), sitemap, 'utf8');

console.log(`SEO: ${guidePages.length} guias, 1 hub, 1 pagina de crisis, sitemap con ${sitemapUrls.length} URLs`);
