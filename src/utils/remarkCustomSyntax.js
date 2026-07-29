import { visit } from 'unist-util-visit';

/**
 * HTML escapes text content to prevent HTML injection when converting AST nodes to 'html'.
 */
export function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escapes unmatched angle brackets outside generated HTML tags to prevent AST parsing errors.
 */
export function escapeUnmatchedAngles(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/<(?!\/?(mark|span|code)\b[^>]*>)/gi, '&lt;')
        .replace(/(?<!<\/?(mark|span|code)\b[^>]*)>/gi, '&gt;');
}

/**
 * Validates style value parameters to prevent CSS injection (e.g. position:fixed; z-index:9999).
 */
export function sanitizeStyleValue(val) {
    if (!val || typeof val !== 'string') return '';
    const clean = val.replace(/^["']|["']$/g, '').trim();
    if (/[;{}<>"']/.test(clean)) return '';
    return clean;
}

/**
 * Computes contrast text color (#000000 or #ffffff) based on background color.
 */
export function getContrastTextColor(bgColor) {
    if (!bgColor) return '#000000';
    const lower = bgColor.trim().toLowerCase();
    
    const lightColorNames = new Set([
        'yellow', 'lightyellow', 'lemonchiffon', 'lightgoldenrodyellow', 'papayawhip',
        'moccasin', 'peachpuff', 'cyan', 'lime', 'limegreen', 'pink',
        'lightpink', 'orange', 'gold', 'greenyellow', 'chartreuse', 'lightgreen',
        'lightblue', 'turquoise', 'aquamarine', 'paleturquoise', 'khaki', 'lightgray',
        'lightgrey', 'gainsboro', 'whitesmoke', 'white'
    ]);
    
    if (lightColorNames.has(lower)) {
        return '#000000';
    }

    if (lower.startsWith('#')) {
        const hex = lower.substring(1);
        let r = 0, g = 0, b = 0;
        if (hex.length === 3 || hex.length === 4) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length >= 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return lum > 0.4 ? '#000000' : '#ffffff';
    }

    const rgbMatch = lower.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return lum > 0.4 ? '#000000' : '#ffffff';
    }

    if (lower.includes('yellow') || lower.includes('lime') || lower.includes('cyan') || lower.includes('gold')) {
        return '#000000';
    }

    return '#ffffff';
}

export function transformCustomSyntaxString(text) {
    if (!text) return '';
    let processed = text;
    const valueRegex = '((?:"[^"]+"|\'[^\']+\'|\\([^)]*\\)|[^\\s}(])+)';

    let prev;
    let maxPasses = 5;
    while (maxPasses > 0 && processed !== prev) {
        prev = processed;

        // Color: {color:color text}
        const colorRegex = new RegExp(`\\{color:${valueRegex}\\s+([\\s\\S]+?)\\}`, 'g');
        processed = processed.replace(colorRegex, (match, val, content) => {
            const cleanVal = sanitizeStyleValue(val);
            if (!cleanVal) return content;
            return `<span style="color:${cleanVal}">${content}</span>`;
        });

        // Font Size: {size:20px text}
        const sizeRegex = new RegExp(`\\{size:${valueRegex}\\s+([\\s\\S]+?)\\}`, 'g');
        processed = processed.replace(sizeRegex, (match, val, content) => {
            const cleanVal = sanitizeStyleValue(val);
            if (!cleanVal) return content;
            return `<span style="font-size:${cleanVal}">${content}</span>`;
        });

        // Font Family: {font:Arial text}
        const fontRegex = new RegExp(`\\{font:${valueRegex}\\s+([\\s\\S]+?)\\}`, 'g');
        processed = processed.replace(fontRegex, (match, val, content) => {
            const cleanVal = sanitizeStyleValue(val);
            if (!cleanVal) return content;
            return `<span style="font-family:${cleanVal}">${content}</span>`;
        });

        // Highlight: ====text====
        processed = processed.replace(/====([\s\S]+?)====/g, '<mark class="highlight">$1</mark>');

        // Custom Highlight: {bg:color text}
        const bgRegex = new RegExp(`\\{bg:${valueRegex}\\s+([\\s\\S]+?)\\}`, 'g');
        processed = processed.replace(bgRegex, (match, val, content) => {
            const cleanVal = sanitizeStyleValue(val);
            if (!cleanVal) return content;
            const contrast = getContrastTextColor(cleanVal);
            
            const headerMatch = content.match(/^(#{1,6})\s+([\s\S]*)$/);
            if (headerMatch) {
                const headerPrefix = headerMatch[1];
                const headerBody = headerMatch[2];
                return `${headerPrefix} <mark style="background-color:${cleanVal}; color:${contrast}">${headerBody}</mark>`;
            }
            
            return `<mark style="background-color:${cleanVal}; color:${contrast}">${content}</mark>`;
        });
    }

    return processed;
}

function processSiblingCustomSyntax(parent) {
    if (!parent || !Array.isArray(parent.children)) return;
    const children = parent.children;
    const valueRegex = '((?:"[^"]+"|\'[^\']+\'|\\([^)]*\\)|[^\\s}(])+)';
    const startBgRegex = new RegExp(`\\{bg:${valueRegex}\\s+([\\s\\S]*)$`);
    const startColorRegex = new RegExp(`\\{color:${valueRegex}\\s+([\\s\\S]*)$`);

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type === 'text' && child.value) {
            const bgMatch = child.value.match(startBgRegex);
            if (bgMatch && !child.value.includes('}')) {
                for (let j = i + 1; j < children.length; j++) {
                    const sibling = children[j];
                    if (sibling.type === 'text' && sibling.value && sibling.value.includes('}')) {
                        const val = sanitizeStyleValue(bgMatch[1]);
                        if (!val) break;
                        const contrast = getContrastTextColor(val);
                        const restOfStart = bgMatch[2];

                        const openHtml = `<mark style="background-color:${val}; color:${contrast}">${escapeUnmatchedAngles(restOfStart)}`;
                        const closeIdx = sibling.value.indexOf('}');
                        const siblingBeforeClose = sibling.value.substring(0, closeIdx);
                        const siblingAfterClose = sibling.value.substring(closeIdx + 1);

                        const prefix = child.value.substring(0, child.value.indexOf(bgMatch[0]));
                        child.type = 'html';
                        child.value = escapeUnmatchedAngles(prefix) + openHtml;

                        sibling.type = 'html';
                        sibling.value = escapeUnmatchedAngles(siblingBeforeClose) + '</mark>' + escapeUnmatchedAngles(siblingAfterClose);
                        break;
                    }
                }
            }

            const colorMatch = child.value.match(startColorRegex);
            if (colorMatch && !child.value.includes('}')) {
                for (let j = i + 1; j < children.length; j++) {
                    const sibling = children[j];
                    if (sibling.type === 'text' && sibling.value && sibling.value.includes('}')) {
                        const val = sanitizeStyleValue(colorMatch[1]);
                        if (!val) break;
                        const restOfStart = colorMatch[2];

                        const openHtml = `<span style="color:${val}">${escapeUnmatchedAngles(restOfStart)}`;
                        const closeIdx = sibling.value.indexOf('}');
                        const siblingBeforeClose = sibling.value.substring(0, closeIdx);
                        const siblingAfterClose = sibling.value.substring(closeIdx + 1);

                        const prefix = child.value.substring(0, child.value.indexOf(colorMatch[0]));
                        child.type = 'html';
                        child.value = escapeUnmatchedAngles(prefix) + openHtml;

                        sibling.type = 'html';
                        sibling.value = escapeUnmatchedAngles(siblingBeforeClose) + '</span>' + escapeUnmatchedAngles(siblingAfterClose);
                        break;
                    }
                }
            }
        }
    }
}

export function remarkCustomSyntax() {
    return (tree) => {
        // Process container nodes for split sibling custom syntax
        visit(tree, (node) => {
            if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'listItem' || node.type === 'root') {
                processSiblingCustomSyntax(node);
            }
        });

        // Process individual text and inlineCode nodes
        visit(tree, (node, _index, parent) => {
            if ((node.type === 'text' || node.type === 'inlineCode') && node.value) {
                const text = isCodeNode(node) ? escapeHtml(node.value) : node.value;
                const isCode = isCodeNode(node);
                const valueRegex = '((?:"[^"]+"|\'[^\']+\'|\\([^)]*\\)|[^\\s}(])+)';
                
                // Promote paragraph to heading if text is {bg:val # Heading}
                if (!isCode) {
                    const bgHeaderRegex = new RegExp(`^\\{bg:${valueRegex}\\s+(#{1,6})\\s+([\\s\\S]+?)\\}$`);
                    const headerMatch = text.match(bgHeaderRegex);
                    if (headerMatch && parent && parent.type === 'paragraph') {
                        const depth = headerMatch[2].length;
                        const val = sanitizeStyleValue(headerMatch[1]);
                        if (val) {
                            const content = headerMatch[3];
                            const contrast = getContrastTextColor(val);
                            
                            parent.type = 'heading';
                            parent.depth = depth;
                            node.type = 'html';
                            node.value = `<mark style="background-color:${val}; color:${contrast}">${escapeUnmatchedAngles(content)}</mark>`;
                            return;
                        }
                    }
                }

                if (
                    /====[\s\S]+?====/.test(text) ||
                    /\{bg:[^\s}]+\s+[\s\S]+?\}/.test(text) ||
                    /\{color:[^\s}]+\s+[\s\S]+?\}/.test(text) ||
                    /\{size:[^\s}]+\s+[\s\S]+?\}/.test(text) ||
                    /\{font:[^\s}]+\s+[\s\S]+?\}/.test(text)
                ) {
                    const processed = transformCustomSyntaxString(text);
                    if (processed !== text) {
                        const safeOutput = escapeUnmatchedAngles(processed);
                        node.type = 'html';
                        node.value = isCode ? `<code>${safeOutput}</code>` : safeOutput;
                    }
                }
            }
        });
    };
}

function isCodeNode(node) {
    return node.type === 'inlineCode';
}
