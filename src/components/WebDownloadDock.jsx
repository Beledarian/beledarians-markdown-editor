import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './WebDownloadDock.css';

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m7 7 10 10M17 7 7 17" />
    </svg>
  );
}

export default function WebDownloadDock() {
  const [host, setHost] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHost(document.querySelector('.workspace-shell'));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const isDesktopApp =
    typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

  if (isDesktopApp || isDismissed || !host) return null;

  return createPortal(
    <aside className="web-download-dock" aria-label="Desktop app download">
      <div className="web-download-link" aria-disabled="true">
        <DownloadIcon />
        <span>
          <strong>Desktop downloads</strong>
          <small>Coming after platform verification</small>
        </span>
      </div>
      <button
        type="button"
        className="web-download-dismiss"
        aria-label="Hide desktop download"
        onClick={() => setIsDismissed(true)}
      >
        <CloseIcon />
      </button>
    </aside>,
    host,
  );
}
