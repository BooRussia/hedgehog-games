// Small bridge between the web games and the phone. Loaded before each game's own script.
// In a plain browser it falls back to what the games did before (navigator.vibrate, localStorage only).
(() => {
  'use strict';
  const cap = window.Capacitor;
  const isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const Haptics = window.capacitorHaptics && window.capacitorHaptics.Haptics;
  const Prefs = window.capacitorPreferences && window.capacitorPreferences.Preferences;

  window.Native = {
    isNative,
    // the games pass a vibration length in ms, or a pattern array for a celebration
    buzz(ms) {
      if (isNative && Haptics) {
        const done = () => {};
        if (Array.isArray(ms)) Haptics.notification({ type: 'SUCCESS' }).catch(done);
        else Haptics.impact({ style: ms >= 50 ? 'HEAVY' : ms >= 18 ? 'MEDIUM' : 'LIGHT' }).catch(done);
        return;
      }
      try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* not supported */ }
    },
    // mirror saved progress into native storage, which the OS never clears on its own
    persist(key, value) {
      if (isNative && Prefs) Prefs.set({ key, value }).catch(() => {});
    },
  };

  // iOS may clear web storage when the phone is low on space. If that happened,
  // put the saved progress back and reload once so the game reads it at startup.
  if (isNative && Prefs) {
    Prefs.keys().then(async ({ keys }) => {
      let restored = false;
      for (const key of keys) {
        const { value } = await Prefs.get({ key });
        if (value != null && localStorage.getItem(key) == null) { localStorage.setItem(key, value); restored = true; }
      }
      if (restored && !sessionStorage.getItem('native.restored')) {
        sessionStorage.setItem('native.restored', '1');
        location.reload();
      }
    }).catch(() => {});
  }
})();
