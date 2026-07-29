---
name: author-beledarians-markdown
description: Author and revise Markdown for Beledarians Markdown Editor using its supported custom highlight, color, size, font, and wiki-link syntax. Use when an agent creates or edits .md files intended for this editor, applies visual emphasis or color, converts prose to the editor's custom syntax, or checks that generated Markdown remains portable, safe, and export-friendly.
---

# Author Beledarians Markdown

Write standard Markdown first. Add Beledarians extensions only when presentation carries meaning that ordinary Markdown cannot express.

## Authoring workflow

1. Preserve the user's wording and document structure unless asked to rewrite.
2. Prefer CommonMark and GitHub Flavored Markdown for headings, lists, tables, links, code, and emphasis.
3. Apply the smallest custom span that communicates the requested visual meaning.
4. Keep opening and closing delimiters in the same paragraph where practical.
5. Preview or run the relevant parser tests after generating complex or nested syntax.
6. Verify print output visually before claiming PDF fidelity.

## Supported extensions

| Intent | Syntax | Example |
| --- | --- | --- |
| Default highlight | `====text====` | `====Review this====` |
| Background color | `{bg:VALUE text}` | `{bg:#fff2a8 Review this}` |
| Text color | `{color:VALUE text}` | `{color:#b42318 Warning}` |
| Font size | `{size:VALUE text}` | `{size:1.25rem Lead sentence}` |
| Font family | `{font:VALUE text}` | `{font:"Times New Roman" Quotation}` |
| Wiki link | `[[PATH]]` or `[[PATH\|LABEL]]` | `[[notes/plan.md\|Release plan]]` |

Use quoted values when a font or CSS value contains spaces. Background colors automatically choose black or white foreground text for contrast.

Highlighted headings are supported:

```md
{bg:#203a43 ## Release decision}
```

Nested custom spans are supported to a limited depth:

```md
{bg:#fff2a8 {color:#7a271a Important}}
```

Prefer a single custom layer. Deep nesting is difficult to edit and less portable.

## Safety and portability

- Never insert semicolons, braces, angle brackets, or quotes into unquoted style values. The renderer rejects them to block CSS or HTML injection.
- Never generate raw `<script>`, event-handler attributes, `javascript:` URLs, or remote HTML embeds.
- Treat color, size, and font extensions as editor-specific. Do not use them when the document must render identically in generic Markdown viewers.
- Use fenced code blocks when documenting the custom syntax itself.
- Keep important meaning in words, not color alone.
- Use strong foreground/background contrast. Do not rely solely on the editor's automatic background contrast for nuanced or translucent colors.
- Use wiki-link paths relative to the opened workspace. Prefer normal Markdown links for documents intended to leave that workspace.

## Export checks

Before claiming HTML, print, or PDF readiness:

1. Confirm the preview renders every custom span and wiki link.
2. Check page breaks, long code blocks, tables, images, and background colors.
3. Test the actual target runtime. Browser print success does not prove Tauri macOS or Linux printing.
4. Confirm the requested PDF path exists; opening a print dialog is not a completed file export.
