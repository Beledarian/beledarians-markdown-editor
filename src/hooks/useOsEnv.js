import { useState, useEffect } from 'react';

export const useOsEnv = () => {
  const [isMac, setIsMac] = useState(false);
  const [modKey, setModKey] = useState('Ctrl');
  const [altKey, setAltKey] = useState('Alt');
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const initOsEnv = async () => {
      const isTauriEnv = !!window.__TAURI_INTERNALS__;
      setIsTauri(isTauriEnv);

      let mac = false;
      if (isTauriEnv) {
        try {
          const { platform } = await import('@tauri-apps/plugin-os');
          mac = (await platform()) === 'macos';
        } catch (e) {
          console.error("Failed to load OS plugin", e);
          mac = navigator.userAgent.includes('Mac');
        }
      } else {
        mac = navigator.userAgent.includes('Mac');
      }

      setIsMac(mac);
      setModKey(mac ? '⌘' : 'Ctrl');
      setAltKey(mac ? '⌥' : 'Alt');
    };

    initOsEnv();
  }, []);

  return { isMac, modKey, altKey, isTauri };
};
