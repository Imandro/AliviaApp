// Rebuild metadata from a single head/body boundary. Old generated copies had
// duplicate </head> tags and exposed JSON outside a script after repeated builds.
export function updateDownloadPage(html, release, site) {
  const headEnd = html.search(/<\/head\s*>/i);
  const bodyStart = html.search(/<body\b[^>]*>/i);
  if (headEnd < 0 || bodyStart < headEnd) {
    throw new Error('descarga.html debe contener un head y un body válidos');
  }
  const size = release.sizeLabel ?? `${(release.bytes / 1048576).toFixed(1)} MB`;
  const head = html.slice(0, headEnd)
    .replace(/<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script\s*>\s*/gi, '')
    .replace(/v\d+\.\d+\.\d+/g, `v${release.version}`)
    .replace(/\d+[,.]?\d*\s?MB/gi, size)
    .trimEnd();
  const metadata = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name: 'ALIVIA', applicationCategory: 'HealthApplication', operatingSystem: 'Android',
    url: `${site}/descarga.html`, softwareVersion: release.version,
    fileSize: `${release.bytes} bytes`, downloadUrl: `${site}${release.url}`,
    inLanguage: 'es',
    description: 'App de bienestar emocional para jovenes. Sin anuncios, sin analitica, funciona sin conexion y con codigo abierto.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'ALIVIA', url: `${site}/` },
  };
  const json = JSON.stringify(metadata, null, 2).replace(/</g, '\\u003c');
  return `${head}\n<script type="application/ld+json">\n${json}\n</script>\n</head>\n${html.slice(bodyStart)}`;
}
