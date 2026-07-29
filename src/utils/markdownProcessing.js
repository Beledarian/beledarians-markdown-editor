import { defaultSchema } from 'rehype-sanitize';
import { transformCustomSyntaxString } from './remarkCustomSyntax';

export const processCustomSyntax = (text) => {
    if (!text) return '';
    let processed = transformCustomSyntaxString(text);

    // WikiLinks: [[Filename]] or [[Filename|Display Text]]
    processed = processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, path, display) => {
        return `<a class="wikilink" data-path="${path}" style="color: var(--accent-color); text-decoration: underline; cursor: pointer;">${display || path}</a>`;
    });

    return processed;
};

export const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), 'span', 'div', 'img', 'mark', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'input'],
    attributes: {
        ...defaultSchema.attributes,
        span: ['style', 'className', 'class'],
        div: ['style', 'className', 'class', 'id'],
        img: ['src', 'alt', 'title', 'width', 'height', 'style', 'className', 'class'],
        mark: ['style', 'className', 'class'],
        h1: ['id', 'className', 'class', 'style'],
        h2: ['id', 'className', 'class', 'style'],
        h3: ['id', 'className', 'class', 'style'],
        h4: ['id', 'className', 'class', 'style'],
        h5: ['id', 'className', 'class', 'style'],
        h6: ['id', 'className', 'class', 'style'],
        input: ['type', 'checked', 'disabled', 'className', 'class', 'style'],
        '*': ['style', 'className', 'class', 'id', 'data-path', 'data-source-line', 'data-comment-text']
    },
    // Ensure we don't strip these classes
    clobberPrefix: '',
    strip: []
};
