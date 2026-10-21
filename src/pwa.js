// Offline support and the install button. The service worker comes from vite-plugin-pwa.

import { registerSW } from 'virtual:pwa-register';

export function setupInstall(ctx) {
  const { toast, track } = ctx;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('A new version of Artify is ready.', { action: 'Reload', ms: 10000, onAction: () => updateSW(true) });
    },
    onOfflineReady() {
      track('offline_ready');
    }
  });

  // Chrome and Android offer installing; show our own button for it in the options sheet.
  const button = document.getElementById('install');
  let prompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    prompt = e;
    button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    track('install_prompt', { outcome });
    prompt = null;
    button.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    button.hidden = true;
    track('installed');
  });
}
