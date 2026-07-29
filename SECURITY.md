# Security policy

## Project status

Beledarians Markdown Editor is personal pre-release software. It is not
security-hardened and does not currently have supported release branches or
guaranteed security-update timelines.

Do not use it as the only copy of an important document. Review file changes
before saving and keep independent backups.

## Reporting a vulnerability

Please use
[GitHub private vulnerability reporting](https://github.com/Beledarian/beledarians-markdown-editor/security/advisories/new).
Do not include credentials, private documents, or exploit details in a public
issue.

Include the affected version or commit, platform, reproduction steps, expected
impact, and any proposed mitigation. Reports are reviewed on a best-effort
basis; this personal project does not promise a response or remediation SLA.

## Trust boundaries

- The web application is subject to browser file-permission and download rules.
- The Tauri application can read and write user-selected Markdown files.
- The Android wrapper uses Capacitor filesystem and share APIs.
- The optional native CLI/MCP control server binds to `127.0.0.1`, but it does
  not authenticate other processes running as the same local user.
- Agent registration modifies supported tools' user configuration directories
  only after an explicit in-app action.
- Remote content, links, images, Mermaid input, and exported HTML should be
  treated as untrusted.

Do not expose the local control port to another machine or run untrusted local
software alongside an enabled control server.
