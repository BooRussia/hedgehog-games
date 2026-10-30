// Puts both games on one website (GitHub Pages) with a page to pick between them.
// Needs the www/ folders first:  npm run site  (builds them, then runs this)
import { writeFileSync, mkdirSync, copyFileSync, cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'site');

// [folder, name, line under the name]; the lines are the Google Play short descriptions
const GAMES = [
  ['hedgeroll', 'Hedgeroll', 'Draw vines to roll a hedgehog home through 12 cozy forest levels.'],
  ['hedgehop', 'Hedgehop', 'Bounce a hedgehog up through the forest. How high can you climb?'],
];

rmSync(site, { recursive: true, force: true });
mkdirSync(join(site, 'icons'), { recursive: true });
for (const [game] of GAMES) {
  cpSync(join(root, 'apps', game, 'www'), join(site, game), { recursive: true });
  copyFileSync(join(root, 'store', 'art', game, 'play-icon-512.png'), join(site, 'icons', `${game}.png`));
}

const cards = GAMES.map(([game, name, line]) => `  <a class="card" href="${game}/">
    <img src="icons/${game}.png" alt="" width="96" height="96">
    <span class="text"><span class="name">${name}</span><span class="line">${line}</span></span>
    <span class="play">Play</span>
  </a>`).join('\n');

writeFileSync(join(site, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Hedgehog Games</title>
<link rel="icon" href="icons/hedgehop.png">
<link rel="apple-touch-icon" href="icons/hedgehop.png">
<style>
@font-face{font-family:"Lilita One";font-style:normal;font-weight:400;font-display:swap;src:url("hedgeroll/fonts/lilita-one-400.woff2") format("woff2")}
:root{--bg:#24452b;--card:#fff8e8;--ink:#2b1709;--muted:#6b5240;--berry:#c8324a;color-scheme:light}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(120% 70% at 50% 0%,#3d6b3f 0%,var(--bg) 70%);color:var(--card);font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:max(36px,env(safe-area-inset-top)) 16px max(28px,env(safe-area-inset-bottom))}
main{max-width:560px;margin:0 auto}
h1{font:400 44px/1.05 "Lilita One",sans-serif;margin:0 0 6px;text-align:center;letter-spacing:.5px;text-shadow:0 3px 0 rgba(0,0,0,.25)}
.sub{margin:0 0 28px;text-align:center;opacity:.85}
.card{display:flex;align-items:center;gap:14px;background:var(--card);color:var(--ink);text-decoration:none;border-radius:22px;padding:14px;margin:0 0 14px;box-shadow:0 6px 0 rgba(0,0,0,.22);transition:transform .12s}
.card:active{transform:translateY(3px);box-shadow:0 3px 0 rgba(0,0,0,.22)}
.card img{width:84px;height:84px;border-radius:20px;flex:none}
.text{flex:1;min-width:0}
.name{display:block;font:400 26px/1.1 "Lilita One",sans-serif}
.line{display:block;color:var(--muted);font-size:14px;margin-top:3px}
.play{flex:none;background:var(--berry);color:#fff;font:400 18px/1 "Lilita One",sans-serif;padding:12px 16px;border-radius:999px}
footer{text-align:center;opacity:.7;font-size:14px;margin-top:22px}
@media (max-width:380px){.play{display:none}.card img{width:72px;height:72px}}
</style>
</head>
<body>
<main>
  <h1>Hedgehog Games</h1>
  <p class="sub">Two little forest games. Tap one to play.</p>
${cards}
  <footer>Coming soon to the App Store and Google Play.</footer>
</main>
</body>
</html>
`);
console.log(`site/ built: ${GAMES.map(([g]) => g).join(', ')}`);
