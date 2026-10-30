// Draws the app icons, launch screens and store graphics for both games with the games' own
// drawing code, then writes them into the iOS and Android projects and into store/art/.
//   npm run art
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
GlobalFonts.registerFromPath(require.resolve('@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2'), 'Lilita One');

const TAU = Math.PI * 2, R = 16;

// ---------- png output ----------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type), data]);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
// the App Store rejects icons that carry an alpha channel, so opaque art is written as plain RGB
function pngRGB(canvas) {
  const { width: w, height: h } = canvas, px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (w * 3 + 1);
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, j = o + 1 + x * 3; raw[j] = px[i]; raw[j + 1] = px[i + 1]; raw[j + 2] = px[i + 2]; }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function save(file, canvas, opaque) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, opaque ? pngRGB(canvas) : canvas.toBuffer('image/png'));
}

// ---------- drawing pieces shared with the games ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function blobs(c, list, colors, line, lw) {
  c.fillStyle = line;
  c.beginPath(); for (const [x, y, r] of list) { c.moveTo(x + r + lw, y); c.arc(x, y, r + lw, 0, TAU); } c.fill();
  c.fillStyle = colors[0];
  c.beginPath(); for (const [x, y, r] of list) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } c.fill();
  if (colors[1]) { c.fillStyle = colors[1]; c.beginPath(); for (const [x, y, r] of list) { c.moveTo(x - r * 0.12 + r * 0.72, y - r * 0.2); c.arc(x - r * 0.12, y - r * 0.2, r * 0.72, 0, TAU); } c.fill(); }
  if (colors[2]) { c.fillStyle = colors[2]; c.beginPath(); for (const [x, y, r] of list) { c.moveTo(x - r * 0.3 + r * 0.32, y - r * 0.38); c.arc(x - r * 0.3, y - r * 0.38, r * 0.32, 0, TAU); } c.fill(); }
}
function drawLeaf(c, x, y, a, s, fill = '#7fd14c', line = '#1d3a14', lw = 1.6) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.6, -s * 0.62, s * 1.5, 0); c.quadraticCurveTo(s * 0.6, s * 0.62, 0, 0); c.closePath();
  c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = line; c.stroke();
  c.beginPath(); c.moveTo(s * 0.18, 0); c.lineTo(s * 1.1, 0); c.strokeStyle = 'rgba(30,70,20,.5)'; c.lineWidth = lw * 0.6; c.stroke();
  c.restore();
}
function drawBerry(c, x, y, k) {
  c.save(); c.translate(x, y); c.scale(k, k);
  const gl = c.createRadialGradient(0, 2, 0, 0, 2, 24);
  gl.addColorStop(0, 'rgba(255,246,192,0.6)'); gl.addColorStop(1, 'rgba(255,246,192,0)');
  c.fillStyle = gl; c.beginPath(); c.arc(0, 2, 24, 0, TAU); c.fill();
  const d =[[-4, -2], [4, -2], [-5.5, 4], [5.5, 4], [0, 9], [0, 2.5]];
  c.fillStyle = '#4a0f1c'; c.beginPath(); for (const [ox, oy] of d) { c.moveTo(ox + 6.2, oy); c.arc(ox, oy, 6.2, 0, TAU); } c.fill();
  c.fillStyle = '#e2384f'; c.beginPath(); for (const [ox, oy] of d) { c.moveTo(ox + 4.6, oy); c.arc(ox, oy, 4.6, 0, TAU); } c.fill();
  c.fillStyle = '#ff9aa6'; c.beginPath(); for (const [ox, oy] of d) { c.moveTo(ox - 1 + 1.4, oy - 1.6); c.arc(ox - 1, oy - 1.6, 1.4, 0, TAU); } c.fill();
  drawLeaf(c, 0, -6, -Math.PI / 2 - 0.9, 5.5, '#5cb536');
  drawLeaf(c, 0, -6, -Math.PI / 2 + 0.9, 5.5, '#5cb536');
  c.restore();
}

// the hedgehog, as drawn in both games; curl hides ears and feet like Hedgeroll's rolling pose
function drawHog(c, o) {
  const line = '#2b1709', lk = o.look || 0;
  c.save(); c.translate(0, R); c.scale(o.sx || 1, o.sy || 1); c.translate(0, -R); c.rotate(o.ang || 0);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU - Math.PI / 2, rr = i % 2 === 0 ? R + 5.5 : R - 0.5;
    i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath(); c.fillStyle = '#5c3820'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = line; c.stroke();
  c.beginPath(); c.arc(0, 0, R - 2.5, 0, TAU); c.fillStyle = '#8b5a35'; c.fill();
  c.strokeStyle = '#6a4127'; c.lineWidth = 1.7;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + 0.3; c.beginPath(); c.moveTo(Math.cos(a) * (R - 10), Math.sin(a) * (R - 10)); c.lineTo(Math.cos(a + 0.28) * (R - 3.5), Math.sin(a + 0.28) * (R - 3.5)); c.stroke(); }
  if (!o.curl) {
    c.fillStyle = '#f3d3a0'; c.strokeStyle = line; c.lineWidth = 1.6;
    for (const fx of [-6.5, 6.5]) { c.beginPath(); c.ellipse(fx + lk * 0.6, R - 1.5 + (o.tuck || 0), 4.6, 3.1, 0, 0, TAU); c.fill(); c.stroke(); }
  }
  c.beginPath(); c.ellipse(lk, 4, 10.5, 9, 0, 0, TAU); c.fillStyle = '#f3d3a0'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = line; c.stroke();
  c.fillStyle = line; c.strokeStyle = line; c.lineWidth = 1.8;
  const ex1 = -4 + lk, ex2 = 4 + lk;
  if (o.mood === 'happy') {
    for (const ex of [ex1, ex2]) { c.beginPath(); c.arc(ex, 3, 2.3, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  } else {
    c.beginPath(); c.arc(ex1, 2, 2, 0, TAU); c.arc(ex2, 2, 2, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex1 + 0.6, 1.3, 0.7, 0, TAU); c.arc(ex2 + 0.6, 1.3, 0.7, 0, TAU); c.fill();
  }
  c.beginPath(); c.arc(lk * 1.3, 7, 2.2, 0, TAU); c.fillStyle = line; c.fill();
  c.fillStyle = 'rgba(240,110,110,.55)'; c.beginPath(); c.arc(-7.2 + lk, 6.5, 2.2, 0, TAU); c.arc(7.2 + lk, 6.5, 2.2, 0, TAU); c.fill();
  if (!o.curl && o.ears !== false) {
    c.fillStyle = '#f3d3a0'; c.strokeStyle = line; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(-3.4 + lk * 0.5, -R + 2, 3, 2.4, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(3.4 + lk * 0.5, -R + 2, 3, 2.4, 0, 0, TAU); c.fill(); c.stroke();
  }
  c.restore();
}
function hogAt(c, x, y, k, o) { c.save(); c.translate(x, y); c.scale(k, k); drawHog(c, o); c.restore(); }

// a branch foothold from Hedgehop, s times game size
function drawBranch(c, th, a, b, y, s) {
  const r = rng(11), hw = 7 * s;
  c.lineCap = 'round';
  c.strokeStyle = th.line; c.lineWidth = hw * 2 + 5 * s; c.beginPath(); c.moveTo(a, y); c.lineTo(b, y); c.stroke();
  c.strokeStyle = th.branch[0]; c.lineWidth = hw * 2 - s; c.stroke();
  c.strokeStyle = th.branch[1]; c.lineWidth = 3.2 * s; c.beginPath(); c.moveTo(a + 6 * s, y - 3.4 * s); c.lineTo(b - 6 * s, y - 3.4 * s); c.stroke();
  c.strokeStyle = th.line; c.lineWidth = 1.6 * s; c.globalAlpha = 0.45;
  for (let x = a + 14 * s; x < b - 12 * s; x += (20 + r() * 14) * s) { c.beginPath(); c.moveTo(x, y + 2 * s); c.lineTo(x + 8 * s, y + s); c.stroke(); }
  c.globalAlpha = 1;
  drawLeaf(c, a, y, Math.PI - 0.5, 8 * s, th.canopy[2], th.line, 1.6 * s);
  drawLeaf(c, a, y, Math.PI + 0.5, 7 * s, th.canopy[1], th.line, 1.6 * s);
  drawLeaf(c, b, y, -0.5, 8 * s, th.canopy[2], th.line, 1.6 * s);
  drawLeaf(c, b, y, 0.5, 7 * s, th.canopy[1], th.line, 1.6 * s);
}

// a drawn vine from Hedgeroll, s times game size
function drawVine(c, pts, s) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  const path = (dx, dy) => {
    c.beginPath(); c.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0] + dx, pts[i][1] + dy, (pts[i][0] + pts[i + 1][0]) / 2 + dx, (pts[i][1] + pts[i + 1][1]) / 2 + dy);
    const l = pts[pts.length - 1]; c.lineTo(l[0] + dx, l[1] + dy);
  };
  path(0, 0); c.strokeStyle = '#1d3a14'; c.lineWidth = 11 * s; c.stroke();
  c.strokeStyle = '#5cb536'; c.lineWidth = 7 * s; c.stroke();
  path(-0.8 * s, -1.6 * s); c.strokeStyle = 'rgba(200,245,140,.7)'; c.lineWidth = 2 * s; c.stroke();
  let acc = 14 * s, side = 1;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    let d = acc;
    while (d < l) {
      const t = d / l;
      drawLeaf(c, pts[i - 1][0] + dx * t - (dy / l) * side * 2 * s, pts[i - 1][1] + dy * t + (dx / l) * side * 2 * s, ang + side * 1.05, 8.5 * s, '#7fd14c', '#1d3a14', 1.6 * s);
      side = -side; d += 27 * s;
    }
    acc = d - l;
  }
}

// ---------- the two looks ----------
const THEMES = {
  hedgeroll: {
    sky: ['#f4f5c6', '#c6e590', '#80bf6b', '#3f7f52'], glow: 'rgba(255,248,205,0.85)', ray: 'rgba(255,253,225,0.25)',
    far: '#9ccb83', haze: 'rgba(200,232,156,0.32)', mid: '#5f9858', midDark: '#40743f',
    canopy: ['#3b873a', '#5ba843', '#95d35f'], line: '#28291a', branch: ['#a46b3b', '#cf955a'],
    title: ['Hedge', 'roll'], tagline: 'Draw vines. Roll him home.',
  },
  hedgehop: {
    sky: ['#ffe8a8', '#ffc283', '#ee8e6d', '#8c4a64'], glow: 'rgba(255,226,160,0.9)', ray: 'rgba(255,232,186,0.26)',
    far: '#e6aa82', haze: 'rgba(255,196,150,0.28)', mid: '#a5604e', midDark: '#7e4340',
    canopy: ['#bf552d', '#e3843a', '#f8be5d'], line: '#3a1d17', branch: ['#92573a', '#bf8352'],
    title: ['Hedge', 'hop'], tagline: "Hop branch to branch. Don't look down.",
  },
};

// forest backdrop at any size; u is one design unit (1 on a 512 icon)
function paintBack(c, th, w, h, seed = 7) {
  const r = rng(seed), u = Math.min(w, h) / 512;
  const sky = c.createLinearGradient(0, 0, 0, h);
  th.sky.forEach((col, i) => sky.addColorStop(i / (th.sky.length - 1), col));
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  const gx = w * 0.84, gy = h * 0.16, gl = c.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.75);
  gl.addColorStop(0, th.glow); gl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.fillRect(0, 0, w, h);
  c.fillStyle = th.far;
  for (let x = -20 * u + r() * 40 * u; x < w + 40 * u; x += (62 + r() * 70) * u) {
    const bw = (16 + r() * 26) * u;
    c.beginPath(); c.moveTo(x - bw / 2, 0); c.lineTo(x + bw / 2, 0); c.lineTo(x + bw / 2 + 6 * u, h); c.lineTo(x - bw / 2 - 6 * u, h); c.fill();
  }
  c.fillStyle = th.haze; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    const tx = w - 40 * u - i * (90 + r() * 60) * u, bw = (30 + r() * 50) * u, skew = h * 0.45;
    const rg = c.createLinearGradient(0, 0, 0, h);
    rg.addColorStop(0, th.ray); rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg;
    c.beginPath(); c.moveTo(tx, 0); c.lineTo(tx + bw, 0); c.lineTo(tx + bw - skew, h); c.lineTo(tx - skew - bw * 0.6, h); c.fill();
  }
  for (const fx of [0.06, 0.94]) {
    const x = w * fx, tw = 46 * u;
    c.beginPath(); c.moveTo(x - tw / 2, -5); c.lineTo(x + tw / 2, -5); c.lineTo(x + tw / 2 + 4 * u, h + 5); c.lineTo(x - tw / 2 - 4 * u, h + 5); c.closePath();
    c.fillStyle = th.mid; c.fill(); c.globalAlpha = 0.55; c.strokeStyle = th.line; c.lineWidth = 3 * u; c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = th.midDark; c.lineWidth = 2.6 * u;
    for (let y = r() * 60 * u; y < h; y += (110 + r() * 60) * u) { const bx = x + (r() - 0.5) * tw * 0.5; c.beginPath(); c.moveTo(bx, y); c.bezierCurveTo(bx + 4 * u, y + 30 * u, bx - 4 * u, y + 60 * u, bx + 2 * u, y + 90 * u); c.stroke(); }
  }
  const top = [];
  for (let x = -40 * u; x < w + 50 * u; x += (34 + r() * 26) * u) top.push([x, (4 + r() * 34) * u, (38 + r() * 26) * u]);
  blobs(c, top, th.canopy, th.line, 3.5 * u);
}

// the foreground of each icon, in a 512 x 512 design space
const FRONT = {
  hedgeroll(c, th) {
    const vy = (x) => 368 + (x - 256) * 0.2 + Math.sin(x / 80) * 8, pts = [];
    for (let x = -60; x <= 580; x += 32) pts.push([x, vy(x)]);
    drawVine(c, pts, 3.2);
    // speed arcs behind him as he rolls right
    c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,.88)';
    for (const [rad, w, a0, a1] of [[156, 10, 2.55, 3.35], [180, 8, 2.7, 3.25], [204, 6, 2.85, 3.15]]) { c.lineWidth = w; c.beginPath(); c.arc(234, 232, rad, a0, a1); c.stroke(); }
    drawBerry(c, 418, 160, 3.4);
    hogAt(c, 234, 232, 6.2, { curl: true, mood: 'happy', ang: 0.38 });
  },
  hedgehop(c, th) {
    drawBranch(c, th, 80, 432, 446, 3.4);
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (const [x, y, r] of [[176, 424, 15], [150, 414, 10], [334, 424, 15], [360, 412, 10]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,.88)';
    for (const [x, y0, y1] of [[204, 372, 404], [256, 382, 418], [308, 372, 404]]) { c.lineWidth = 9; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); }
    drawBerry(c, 98, 150, 3.2);
    hogAt(c, 256, 206, 6.0, { mood: 'happy', sx: 0.95, sy: 1.07, tuck: 1.5, ang: -0.06, ears: false });
  },
};

// ---------- compositions ----------
function icon(game, size, part = 'all') {
  const cv = createCanvas(size, size), c = cv.getContext('2d'), th = THEMES[game];
  c.scale(size / 512, size / 512);
  if (part !== 'front') paintBack(c, th, 512, 512);
  if (part === 'all') FRONT[game](c, th);
  if (part === 'front') {
    // Android masks adaptive icons to the middle two thirds, so the art shrinks to fit
    c.translate(256, 256); c.scale(0.64, 0.64); c.translate(-256, -256);
    FRONT[game](c, th);
  }
  return cv;
}
function masked(src, size, round) {
  const cv = createCanvas(size, size), c = cv.getContext('2d');
  c.beginPath();
  if (round) c.arc(size / 2, size / 2, size / 2, 0, TAU); else c.roundRect(0, 0, size, size, size * 0.18);
  c.clip(); c.drawImage(src, 0, 0, size, size);
  return cv;
}
// two-tone logo lettering like the title screens; shrinks to fit maxW when given
function title(c, th, x, y, size, align = 'center', maxW = Infinity) {
  const [a, b] = th.title;
  c.font = `${size}px "Lilita One"`;
  const fit = c.measureText(a + b).width * 1.04;
  if (fit > maxW) size *= maxW / fit;
  c.font = `${size}px "Lilita One"`; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  const wa = c.measureText(a).width, wb = c.measureText(b).width;
  let x0 = align === 'center' ? x - (wa + wb) / 2 : x;
  for (const [text, fill, w] of [[a, '#ffe7a0', wa], [b, '#b6f07a', wb]]) {
    c.fillStyle = '#3a200c'; c.fillText(text, x0, y + size * 0.09);
    c.strokeStyle = '#3a200c'; c.lineWidth = size * 0.12; c.strokeText(text, x0, y);
    c.fillStyle = fill; c.fillText(text, x0, y);
    x0 += w;
  }
}
function splash(game, w, h) {
  const cv = createCanvas(w, h), c = cv.getContext('2d'), th = THEMES[game];
  // iOS crops its square launch image to the phone's shape, so size things to that visible strip
  const m = Math.min(w, h, Math.max(w, h) * 0.46);
  paintBack(c, th, w, h, 3);
  const rad = m * 0.17, k = rad / 21.5, cy = h * 0.45;
  if (game === 'hedgeroll') hogAt(c, w / 2, cy, k, { curl: true, mood: 'happy', ang: 0.3 });
  else hogAt(c, w / 2, cy, k, { mood: 'happy', sx: 0.95, sy: 1.07, tuck: 1.5, ears: false });
  title(c, th, w / 2, cy + rad * 1.3 + m * 0.1, m * 0.1, 'center', m * 0.9);
  return cv;
}
function feature(game) {
  const w = 1024, h = 500, cv = createCanvas(w, h), c = cv.getContext('2d'), th = THEMES[game];
  paintBack(c, th, w, h, 5);
  c.save(); c.translate(10, 4); c.scale(0.92, 0.92); FRONT[game](c, th); c.restore();
  const x = 548, maxW = w - x - 30;
  title(c, th, x, 236, 104, 'left', maxW);
  c.font = '28px "Lilita One"'; c.lineJoin = 'round';
  th.tagline.split(/(?<=\.) /).forEach((line, i) => {
    const y = 290 + i * 36;
    c.strokeStyle = '#3a200c'; c.lineWidth = 4.5; c.strokeText(line, x + 4, y);
    c.fillStyle = '#fff3d1'; c.fillText(line, x + 4, y);
  });
  return cv;
}

// ---------- write everything ----------
const ANDROID_DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
async function sizeOf(file) { const img = await loadImage(readFileSync(file)); return [img.width, img.height]; }

for (const game of Object.keys(THEMES)) {
  const app = join(root, 'apps', game), out = join(root, 'store', 'art', game);
  const full = icon(game, 1024);
  save(join(out, 'app-store-icon-1024.png'), full, true);
  save(join(out, 'play-icon-512.png'), icon(game, 512), true);
  save(join(out, 'play-feature-graphic-1024x500.png'), feature(game), true);
  save(join(out, 'splash-preview-1290x2796.png'), splash(game, 1290, 2796), true);

  const ios = join(app, 'ios/App/App/Assets.xcassets');
  if (existsSync(ios)) {
    save(join(ios, 'AppIcon.appiconset/AppIcon-512@2x.png'), full, true);
    const sp = splash(game, 2732, 2732);
    for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) save(join(ios, 'Splash.imageset', f), sp, true);
  }

  const res = join(app, 'android/app/src/main/res');
  if (existsSync(res)) {
    for (const [d, k] of Object.entries(ANDROID_DENSITIES)) {
      const legacy = Math.round(48 * k), layer = Math.round(108 * k), dir = join(res, `mipmap-${d}`);
      save(join(dir, 'ic_launcher.png'), masked(icon(game, legacy), legacy, false));
      save(join(dir, 'ic_launcher_round.png'), masked(icon(game, legacy), legacy, true));
      save(join(dir, 'ic_launcher_foreground.png'), icon(game, layer, 'front'));
      save(join(dir, 'ic_launcher_background.png'), icon(game, layer, 'back'), true);
    }
    for (const dir of ['drawable', ...['port', 'land'].flatMap((o) => Object.keys(ANDROID_DENSITIES).map((d) => `drawable-${o}-${d}`))]) {
      const file = join(res, dir, 'splash.png');
      if (!existsSync(file)) continue;
      const [w, h] = await sizeOf(file);
      save(file, splash(game, w, h), true);
    }
  }
  console.log(`${game}: art written`);
}
