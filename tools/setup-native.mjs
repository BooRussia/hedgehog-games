// Creates each app's iOS and Android projects, applies the game settings, and copies in the
// latest web build and artwork. Safe to run as often as you like.
//   npm run native         add any missing platform, apply settings, sync
//   npm run native:reset   delete ios/ and android/ first (do this after changing appId)
//   npm run sync           only rebuild the web files and art and copy them in
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPS = ['hedgeroll', 'hedgehop'];
const BG = '#24452b';
const reset = process.argv.includes('--reset');
const syncOnly = process.argv.includes('--sync-only');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });

function edit(file, fn) {
  const before = readFileSync(file, 'utf8'), after = fn(before);
  if (after !== before) writeFileSync(file, after);
}

// sets a top-level key in an Info.plist, adding it when missing
function plistSet(xml, key, value) {
  const re = new RegExp(`(<key>${key}</key>\\s*)(<array>[\\s\\S]*?</array>|<true/>|<false/>|<string>[^<]*</string>)`);
  if (re.test(xml)) return xml.replace(re, `$1${value}`);
  return xml.replace(/\n<\/dict>\s*<\/plist>\s*$/, `\n\t<key>${key}</key>\n\t${value}\n</dict>\n</plist>\n`);
}
const plistArray = (items) => `<array>\n${items.map((s) => `\t\t<string>${s}</string>`).join('\n')}\n\t</array>`;

function patchIos(dir) {
  edit(join(dir, 'ios/App/App/Info.plist'), (xml) => {
    xml = plistSet(xml, 'UISupportedInterfaceOrientations', plistArray(['UIInterfaceOrientationPortrait']));
    xml = plistSet(xml, 'UISupportedInterfaceOrientations~ipad', plistArray(['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown']));
    // games read better without the clock and battery on top
    xml = plistSet(xml, 'UIViewControllerBasedStatusBarAppearance', '<false/>');
    xml = plistSet(xml, 'UIStatusBarHidden', '<true/>');
    // no encryption beyond what iOS provides, so App Store Connect skips the export questions
    xml = plistSet(xml, 'ITSAppUsesNonExemptEncryption', '<false/>');
    return xml;
  });
  // iPhone only for the first release; iPads still run it in iPhone mode
  edit(join(dir, 'ios/App/App.xcodeproj/project.pbxproj'), (s) => s.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = 1;'));
}

function patchAndroid(dir) {
  const res = join(dir, 'android/app/src/main/res');
  edit(join(dir, 'android/app/src/main/AndroidManifest.xml'), (xml) =>
    xml.includes('android:screenOrientation') ? xml : xml.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"'));
  edit(join(res, 'values/styles.xml'), (xml) =>
    xml.includes('windowSplashScreenBackground') ? xml : xml.replace(
      '<item name="android:background">@drawable/splash</item>',
      `<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">${BG}</item>`));
  // the adaptive icon uses a painted background (written by draw-art) instead of a flat color
  for (const f of ['mipmap-anydpi-v26/ic_launcher.xml', 'mipmap-anydpi-v26/ic_launcher_round.xml']) {
    edit(join(res, f), (xml) => xml.replace('@color/ic_launcher_background', '@mipmap/ic_launcher_background'));
  }
}

run('node tools/build-web.mjs');
for (const app of APPS) {
  const dir = join(root, 'apps', app);
  if (reset) for (const p of ['ios', 'android']) rmSync(join(dir, p), { recursive: true, force: true });
  if (syncOnly) continue;
  if (!existsSync(join(dir, 'ios'))) run('npx cap add ios', dir);
  if (!existsSync(join(dir, 'android'))) run('npx cap add android', dir);
  patchIos(dir);
  patchAndroid(dir);
}
run('node tools/draw-art.mjs');
for (const app of APPS) run('npx cap sync', join(root, 'apps', app));
