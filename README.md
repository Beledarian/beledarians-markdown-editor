# Beledarians Markdown Editor

[Open the web preview](https://beledarian.github.io/beledarians-markdown-editor/)

> **Project status: personal pre-release.** This is the Markdown editor I build
> and use for my own writing, documentation, and agent-assisted workflows. It is
> not production-ready or security-hardened. Keep backups of important files and
> review changes before saving.

Beledarians Markdown Editor combines a folder navigator, tabs, live
source-and-preview editing, local file access, export tools, themes, and optional
agent integrations in one React application. Tauri provides desktop integration,
while Capacitor provides the experimental Android wrapper.

I am sharing it for inspection, experimentation, and collaboration. Interfaces,
file workflows, and release packaging may still change.

## Current status

| Surface | Status |
| --- | --- |
| Web | Public preview; browser file APIs vary by browser |
| Windows | Unsigned Tauri builds; ARM64 build verified locally |
| macOS | Unsigned CI builds; runtime and print-to-PDF remain unverified |
| Linux | Unsigned CI builds; runtime remains unverified |
| Android | Experimental debug APK using Android's non-production debug key |
| CLI / MCP | Experimental local control surface |

Unsigned builds can trigger operating-system warnings. There are no signing or
notarization guarantees.

## Features

- Edit, preview, and split-view Markdown workspaces
- Tabs, folder navigation, outline, search, and recent files
- Smooth synchronized source/preview scrolling
- Local file opening and saving on web, desktop, and Android paths
- GitHub Flavored Markdown, tables, task lists, math, Mermaid, and syntax highlighting
- Custom highlight, color, size, font, and wiki-link syntax
- HTML export and print-based PDF workflows
- Themes, reading layouts, keyboard shortcuts, statistics, and daily word goals
- Optional CLI, MCP registration, and installable Markdown-authoring skill

See [Custom Markdown](docs/CUSTOM_MARKDOWN.md) for editor-specific syntax.

## Development

Requirements:

- Node.js 20 or newer
- Rust stable and the Tauri platform prerequisites for desktop builds
- Android Studio or an Android SDK for Android builds

```bash
npm ci
npm run dev
```

Useful commands:

```bash
npm run lint
npm test -- --run --pool=forks --maxWorkers=2
npm run audit:design
npm run build
npm run desktop:build
npm run android:build
```

The repository limits Node heaps to 1 GB and test concurrency to two workers.
See [CONTRIBUTING.md](CONTRIBUTING.md) before running or changing the test suite.

## Releases

Tags matching `v*` run the unsigned release workflow for:

- Windows x64 and ARM64
- macOS Intel and Apple Silicon
- Linux x64 and ARM64
- Android debug APK (automatically debug-signed, not production-signed)

Workflow dispatches produce downloadable Actions artifacts without publishing a
release. Tagged builds are published as prereleases and explicitly labeled
unsigned.

## Architecture and trust boundaries

See [Architecture](docs/ARCHITECTURE.md) for the document lifecycle, rendering
pipeline, platform adapters, and CLI/MCP control plane.

The native control server listens only on loopback, but it is not an
authentication boundary against other local processes. Review
[SECURITY.md](SECURITY.md) before enabling agent integrations.

## Agent authoring skill

The user-facing skill lives at
[`skills/author-beledarians-markdown`](skills/author-beledarians-markdown).
It teaches compatible agents the editor's custom Markdown syntax and portability
rules. Internal development prompts and private orchestration tooling are not
part of this public repository.

## Contributing

Small fixes, platform reports, and documentation improvements are welcome.
Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[security policy](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
