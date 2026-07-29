# Architecture

This document describes the current implementation. It is not a maturity or
support claim.

## Supported surfaces

```text
React application
├─ Browser runtime
├─ Tauri desktop runtime
├─ Capacitor Android runtime
└─ Optional CLI / MCP control plane
```

The web surface is the public preview. Desktop and Android packaging are
pre-release and unsigned.

## Application composition

`src/main.jsx` mounts the error boundary, application, and browser-only download
dock. `src/App.jsx` composes document state, preferences, platform hooks,
workspace chrome, and overlays.

```text
src/main.jsx
└─ ErrorBoundary
   ├─ App
   │  ├─ features/documents
   │  ├─ features/preferences
   │  ├─ platform and interaction hooks
   │  ├─ WorkspaceShell
   │  └─ MarkdownWorkspace
   └─ WebDownloadDock
```

`features/documents/documentSessionReducer.js` owns open documents, the active
tab, dirty state, recent files, save metadata, and Save As transitions.
Preferences are normalized and persisted through `features/preferences`.

## Markdown pipeline

`features/workspace/MarkdownWorkspace.jsx` hosts `@uiw/react-md-editor`.
Markdown flows through:

1. Beledarians custom syntax
2. GitHub Flavored Markdown
3. Math and table-of-contents remark plugins
4. Raw HTML parsing
5. Sanitization
6. External-link handling
7. KaTeX, slugs, and source-line metadata

Custom syntax transformation lives in `utils/remarkCustomSyntax.js`.
Sanitization remains part of the rendered-preview boundary; custom formatting
must not bypass it.

## File lifecycle

`hooks/useFileSystem.js` selects the platform adapter:

- **Web:** File System Access API when available, with IndexedDB persistence for
  permitted handles and download fallbacks where required.
- **Tauri:** native commands and dialog events for path-backed reads and writes.
- **Android:** Capacitor Filesystem for documents and Capacitor Share for
  explicit Save As sharing.

Document state stores a `storageKind` and platform metadata so Save and Save As
can preserve the correct path or fallback behavior.

## Desktop runtime

`src-tauri/src/lib.rs` owns:

- native file reads and Markdown-restricted writes;
- application lifecycle, tray behavior, and single-instance handling;
- file-association and command-line open events;
- optional agent skill/MCP registration;
- the loopback CLI control server;
- selected local search and web-fetch commands.

Tauri commands validate file extensions and selected inputs, but the desktop
application is still pre-release software.

## Android runtime

`capacitor.config.ts` configures the Android wrapper. The generated project lives
under `android/`, with the application namespace
`io.github.beledarian.markdowneditor`.

The release workflow produces an APK using Android's automatic debug key. There
is no production signing key or Play Store release pipeline.

## CLI and MCP

`cli/md.mjs` and `cli/contract.mjs` implement the versioned local protocol. The
native server binds to loopback. Loopback limits network exposure, but the
server does not authenticate other processes running as the same local user.
Users should enable this surface only when they trust their local environment.

## UI system

Tokens and themes live under `src/ui`. Presets define the Workbench, Reading
Room, and Operator workspace variants. Components consume semantic tokens rather
than defining independent palettes; documented exceptions cover standalone
export documents and user-authored color syntax.

## Verification and releases

Pull-request and main-branch CI run bounded frontend tests, lint, CLI contracts,
the design audit, the web build, and Rust tests. Tagged release workflows build
unsigned artifacts for Windows, macOS, Linux, and Android.

An artifact produced by CI is a build result, not evidence that its native UI,
file integration, or print workflow has been exercised on that platform.
