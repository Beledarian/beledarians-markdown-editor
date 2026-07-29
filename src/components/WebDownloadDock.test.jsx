import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WebDownloadDock from './WebDownloadDock';

function renderDock() {
  return render(
    <>
      <main className="workspace-shell" />
      <WebDownloadDock />
    </>,
  );
}

describe('WebDownloadDock', () => {
  beforeEach(() => {
    delete window.__TAURI_INTERNALS__;
  });

  it('does not expose a broken download before release assets exist', async () => {
    renderDock();

    expect(
      (await screen.findByText('Desktop downloads')).closest('[aria-disabled]'),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: /Desktop downloads/i })).not.toBeInTheDocument();
  });

  it('can be hidden for the current browser session', async () => {
    renderDock();

    fireEvent.click(await screen.findByRole('button', { name: 'Hide desktop download' }));
    await waitFor(() => {
      expect(screen.queryByText('Desktop downloads')).not.toBeInTheDocument();
    });
  });

  it('returns on a new page mount after being hidden', async () => {
    const firstPage = renderDock();
    fireEvent.click(await screen.findByRole('button', { name: 'Hide desktop download' }));
    firstPage.unmount();

    renderDock();
    expect(await screen.findByText('Desktop downloads')).toBeInTheDocument();
  });

  it('does not render inside the Tauri desktop app', async () => {
    window.__TAURI_INTERNALS__ = {};
    renderDock();

    await waitFor(() => {
      expect(screen.queryByText('Desktop downloads')).not.toBeInTheDocument();
    });
  });
});
