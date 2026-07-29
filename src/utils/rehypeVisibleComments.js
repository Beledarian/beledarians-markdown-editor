import { visit } from 'unist-util-visit';

/**
 * Rehype plugin to transform HTML comments into visible elements.
 * This allows comments to be styled and interacted with in the preview.
 */
const rehypeVisibleComments = () => {
    return (tree) => {
        visit(tree, 'comment', (node, index, parent) => {
            if (parent && typeof index === 'number') {
                const commentText = node.value.trim();
                
                // Transform comment node into a span element
                const newNode = {
                    type: 'element',
                    tagName: 'span',
                    properties: {
                        className: ['preview-comment'],
                        'data-comment-text': commentText,
                        // If the previous node had a source line, approximate it for the comment
                        // (Rehype-Raw usually handles position for comments too if they are well-placed)
                    },
                    children: [
                        {
                            type: 'text',
                            value: `💬 ${commentText}`
                        }
                    ],
                    position: node.position
                };

                // Inject source line if available from position
                if (node.position && node.position.start) {
                    newNode.properties['data-source-line'] = node.position.start.line;
                    if (node.position.end) {
                        newNode.properties['data-source-line-end'] = node.position.end.line;
                    }
                }

                parent.children[index] = newNode;
            }
        });
    };
};

export default rehypeVisibleComments;
