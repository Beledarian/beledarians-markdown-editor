/**
 * Rehype plugin to inject data-source-line attributes into HTML elements.
 * This allows mapping rendered HTML back to the markdown source line.
 */
const rehypeInjectLineNumber = () => {
    return (tree) => {
        const visit = (node) => {
            if (node.type === 'element' && node.position && node.position.start) {
                if (!node.properties) node.properties = {};

                // Only inject if not already present
                if (!node.properties['data-source-line']) {
                    node.properties['data-source-line'] = node.position.start.line;
                    // Also inject end line if available
                    if (node.position.end) {
                        node.properties['data-source-line-end'] = node.position.end.line;
                    }
                }
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(visit);
            }
        };

        visit(tree);
    };
};

export default rehypeInjectLineNumber;
