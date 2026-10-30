// Turns each game page (as published on claude.ai) into an offline www/ folder for its app.
// Run again whenever a file in games/ changes:  npm run web
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const GAMES = ['hedgeroll', 'hedgehop'];

// [family, weight, package file, file name in www/fonts]
const FONTS = [
  ['Lilita One', 400, '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2', 'lilita-one-400.woff2'],
  ['Sniglet', 400, '@fontsource/sniglet/files/sniglet-latin-400-normal.woff2', 'sniglet-400.woff2'],
  ['Sniglet', 800, '@fontsource/sniglet/files/sniglet-latin-800-normal.woff2', 'sniglet-800.woff2'],
];
const FONT_LICENSES = [
  ['@fontsource/lilita-one/LICENSE', 'OFL-lilita-one.txt'],
  ['@fontsource/sniglet/LICENSE', 'OFL-sniglet.txt'],
];
// browser builds of Capacitor and its plugins; each defines a global (capacitorExports, capacitorHaptics, ...)
const VENDOR = [
  ['@capacitor/core/dist/capacitor.js', 'capacitor.js'],
  ['@capacitor/haptics/dist/plugin.js', 'haptics.js'],
  ['@capacitor/preferences/dist/plugin.js', 'preferences.js'],
];

// every edit must find its target, so a change to a game's code can't slip through unpatched
function swap(html, from, to, game) {
  const found = typeof from === 'string' ? html.includes(from) : from.test(html);
  if (!found) throw new Error(`${game}: could not find ${from}`);
  return html.replace(from, to);
}

for (const game of GAMES) {
  let src = readFileSync(join(root, 'games', `${game}.html`), 'utf8');
  const b = src.indexOf('<body>');
  if (b >= 0) src = src.slice(b + '<body>'.length, src.lastIndexOf('</body>'));
  const title = (src.match(/<title>([^<]*)<\/title>/) || [null, game])[1];

  src = src
    .replace(/<title>[^<]*<\/title>\s*/, '')
    .replace(/<meta name="claude:[^>]*>\s*/g, '')
    .replace(/<link rel="(?:preconnect|stylesheet)" href="https:\/\/fonts\.[^>]*>\s*/g, '');
  src = swap(src, 'function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* not supported */ } }', 'function buzz(ms) { Native.buzz(ms); }', game);
  src = swap(src, 'localStorage.setItem(k, JSON.stringify(v));', 'localStorage.setItem(k, JSON.stringify(v)); Native.persist(k, JSON.stringify(v));', game);
  src = swap(src, /window\.claude\?\.hot\?\.snapshot\?\.\([^\n]*\n/, '', game);
  src = swap(src, /window\.claude\?\.hot\?\.ready \?[^\n]*/, 'start({});', game);
  if (/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(src)) throw new Error(`${game}: still loads something from the internet`);

  const fontCss = FONTS.map(([family, weight, , file]) =>
    `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url("fonts/${file}") format("woff2")}`).join('\n');

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="format-detection" content="telephone=no">
<title>${title}</title>
<style>
${fontCss}
:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}
html,body{-webkit-touch-callout:none;-webkit-text-size-adjust:100%}
[hidden]{display:none!important}
</style>
<script src="vendor/capacitor.js"></script>
<script src="vendor/haptics.js"></script>
<script src="vendor/preferences.js"></script>
<script src="native.js"></script>
</head>
<body>
${src.trim()}
</body>
</html>
`;

  const www = join(root, 'apps', game, 'www');
  rmSync(www, { recursive: true, force: true });
  mkdirSync(join(www, 'fonts'), { recursive: true });
  mkdirSync(join(www, 'vendor'), { recursive: true });
  writeFileSync(join(www, 'index.html'), page);
  copyFileSync(join(root, 'tools', 'native.js'), join(www, 'native.js'));
  for (const [, , from, to] of FONTS) copyFileSync(require.resolve(from), join(www, 'fonts', to));
  for (const [from, to] of FONT_LICENSES) copyFileSync(require.resolve(from), join(www, 'fonts', to));
  for (const [from, to] of VENDOR) copyFileSync(require.resolve(from), join(www, 'vendor', to));
  console.log(`${game}: www/ built (${(page.length / 1024).toFixed(0)} KB page)`);
}
