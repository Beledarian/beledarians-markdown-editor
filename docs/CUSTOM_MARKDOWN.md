# Custom Markdown

Standard CommonMark and GitHub Flavored Markdown should be preferred. The
following extensions are available when presentation carries meaning that
ordinary Markdown cannot express.

| Intent | Syntax | Example |
| --- | --- | --- |
| Default highlight | `====text====` | `====Review this====` |
| Background color | `{bg:VALUE text}` | `{bg:#fff2a8 Review this}` |
| Text color | `{color:VALUE text}` | `{color:#b42318 Warning}` |
| Font size | `{size:VALUE text}` | `{size:1.25rem Lead sentence}` |
| Font family | `{font:VALUE text}` | `{font:"Times New Roman" Quotation}` |
| Wiki link | `[[PATH]]` or `[[PATH\|LABEL]]` | `[[notes/plan.md\|Release plan]]` |

Highlighted headings are supported:

```md
{bg:#203a43 ## Release decision}
```

Custom spans can be nested to a limited depth:

```md
{bg:#fff2a8 {color:#7a271a Important}}
```

Prefer one custom layer. Deep nesting is difficult to edit and less portable.

## Safety and portability

- Do not insert scripts, event handlers, `javascript:` URLs, or remote HTML
  embeds.
- Keep important meaning in words rather than color alone.
- Use strong foreground/background contrast.
- Treat these extensions as editor-specific; generic Markdown viewers may show
  their source delimiters.
- Prefer relative workspace paths for wiki links and ordinary Markdown links
  for documents intended to leave the workspace.
- Use fenced code blocks when documenting the custom syntax itself.

## Export checks

Before claiming HTML, print, or PDF readiness:

1. Confirm the preview renders every custom span and wiki link.
2. Check page breaks, long code blocks, tables, images, and background colors.
3. Test the actual target runtime.
4. Confirm a requested PDF file exists. Opening a print dialog is not a
   completed file export.

The installable agent skill at
`skills/author-beledarians-markdown/SKILL.md` contains the same authoring and
portability contract for compatible agents.
