# Hedgehog Games

Hedgeroll and Hedgehop, packaged as iPhone and Android apps with [Capacitor](https://capacitorjs.com).
Each game is the same HTML page you play on claude.ai, bundled inside a native app so it runs
offline, with phone vibration (haptics) and progress that survives iOS clearing web storage.

**Play online:** https://boorussia.github.io/hedgehog-games/ (rebuilt automatically on every push to `main`).

## What's in this folder

| Path | What it is |
|---|---|
| `games/` | The two game pages, exactly as published on claude.ai. Edit or replace these, never `www/`. |
| `apps/hedgeroll/`, `apps/hedgehop/` | One Capacitor app each: `capacitor.config.json`, the generated `www/`, and the `ios/` and `android/` projects |
| `tools/build-web.mjs` | Turns a game page into an offline `www/` folder (local fonts, no internet, native haptics and storage) |
| `tools/draw-art.mjs` | Draws the icons, launch screens and store graphics with the games' own drawing code |
| `tools/setup-native.mjs` | Creates the iOS and Android projects and applies the settings below |
| `tools/native.js` | The small bridge each game uses for haptics and saving |
| `tools/build-site.mjs`, `.github/workflows/pages.yml` | Builds the play-online site in `site/` and publishes it to GitHub Pages |
| `store/` | Listing text for both stores, the privacy policy, and the store graphics in `store/art/` |

Settings applied to both apps: portrait only, status bar hidden, iPhone only on iOS for the first
release (iPads run it in iPhone mode), and no export-compliance questions on each upload.

## Commands

Run these from this folder. You need [Node.js](https://nodejs.org) (the LTS version is fine).

```bash
npm install
```

```bash
npm run sync
```
Rebuilds `www/` and the art, then copies them into the iOS and Android projects. Run it after any change to `games/`.

```bash
npm run native:reset
```
Deletes and recreates `ios/` and `android/`. Run it after changing an `appId`.

```bash
npx cap open ios
```
```bash
npx cap open android
```
Run these inside `apps/hedgeroll` or `apps/hedgehop` to open the project in Xcode or Android Studio.

To play the offline builds in a browser, build the site and serve it:

```bash
npm run site
```
```bash
python -m http.server 8766 --directory site
```

## Launch checklist

### 1. Accounts and names (you, start now, these take days)

- [ ] **Apple Developer Program**, $99 a year, at developer.apple.com/programs/enroll.
  Enroll as an *Individual* (fastest, your legal name shows as the seller) or as an
  *Organization* (needs a registered business and a free D-U-N-S number, and shows the company name).
- [ ] **Google Play Console**, $25 once, at play.google.com/console/signup, plus identity verification.
  A new personal account has to run a **closed test with at least 12 testers for 14 days in a row**
  before it can publish to everyone, so line up testers (friends and family on Android) early.
- [ ] **Pick the app ID prefix.** The apps currently use `com.changeme.hedgeroll` and
  `com.changeme.hedgehop`. Set the real `appId` in both `apps/*/capacitor.config.json`, then run
  `npm run native:reset`. An ID can't be changed after its first upload to Apple or Google.
- [ ] **Reserve the names.** In App Store Connect, go to Apps, then +, then New App. Creating the
  record reserves the name. If "Hedgeroll" or "Hedgehop" is taken, the fallback names are in `store/`.

### 2. iPhone build (on your Mac)

- [ ] Install Xcode from the Mac App Store, and Node.js.
- [ ] Clone the repository on the Mac: `git clone https://github.com/BooRussia/hedgehog-games.git`.
- [ ] In the folder: `npm install`, then `npm run sync`.
- [ ] `cd apps/hedgeroll` then `npx cap open ios`. In Xcode, select the **App** target, open
  **Signing & Capabilities**, and choose your team. Check that the Bundle Identifier matches the `appId`.
  The first build downloads Capacitor through Swift Package Manager, so it needs internet.
- [ ] Plug in your iPhone, pick it as the run destination, and press Run. Test:
  sound starts after the first tap, the phone vibrates on hits, progress is still there after
  force-quitting, nothing hides under the notch or Dynamic Island, and Hedgehop pauses when you leave the app.
- [ ] **Product, then Archive**, then **Distribute App** to App Store Connect. Install it from
  TestFlight to check the uploaded build.
- [ ] Repeat for `apps/hedgehop`.

### 3. Android build (works on Windows or the Mac)

- [ ] Install Android Studio, then `cd apps/hedgeroll` and `npx cap open android`.
- [ ] Run it on an Android phone or an emulator. Check the top and bottom edges: Android 15 and
  newer draw apps behind the system bars, and this hasn't been checked on a device yet.
- [ ] **Build, then Generate Signed App Bundle**, and create an upload key when asked. Back up the
  keystore file and its password somewhere safe. You need the same key for every future update.
- [ ] Upload the `.aab` to a closed testing track and invite your 12+ testers.
- [ ] Repeat for `apps/hedgehop`.

### 4. Store pages

- [ ] Copy the text from `store/hedgeroll.md` and `store/hedgehop.md`.
- [ ] Upload the Play icon and feature graphic from `store/art/`. The App Store icon is already in the iOS build.
- [ ] **Screenshots.** Apple needs 6.9-inch iPhone screenshots (1320 × 2868). Run the game in the
  largest iPhone simulator in Xcode and press Cmd+S to save one. Google needs at least 2 phone screenshots.
  App Store Connect lists the exact sizes it currently accepts on the upload screen.
- [ ] **Privacy policy.** Fill in the bracketed parts of `store/privacy-policy.html` and put it at a
  public web address (GitHub Pages is free). Both stores need that URL.
- [ ] App Privacy on Apple: **Data Not Collected**. Data safety on Google: **no data collected or shared**.
- [ ] Age rating questionnaires: answer None or No throughout.

### 5. Submit

- [ ] Apple: attach the build to the version, fill in App Review Information (the review notes are
  in `store/`; no sign-in is needed), and submit. You'll get an email when review finishes.
- [ ] Google: once the 14-day closed test is done, apply for production access in Play Console, then release.

## Updating a game later

1. Replace `games/hedgeroll.html` or `games/hedgehop.html` with the new page.
2. `npm run sync`
3. Raise the version: in Xcode (Version and Build on the App target) and in
   `apps/<game>/android/app/build.gradle` (`versionCode` and `versionName`).
4. Archive or bundle again and upload.
