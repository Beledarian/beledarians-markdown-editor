import React from 'react';
import * as Diff from 'diff';

const DiffPreview = ({ original, modified }) => {
    // If no changes, don't render anything or render specific message
    if (original === modified) return <div className="no-changes">No changes detected.</div>;

    const diff = Diff.diffLines(original, modified);

    return (
        <div className="diff-preview" style={{
            fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
            fontSize: '12px',
            background: 'var(--code-bg, #1e1e1e)',
            padding: '10px',
            borderRadius: '4px',
            marginTop: '5px',
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid var(--border-color)'
        }}>
            {diff.map((part, i) => {
                const lines = part.value.split('\n');
                // Remove last empty string from split if it exists and is just due to trailing newline
                if (lines[lines.length - 1] === '') lines.pop();

                return (
                    <div key={i} className={part.added ? 'diff-added' : part.removed ? 'diff-removed' : 'diff-unchanged'} style={{
                        backgroundColor: part.added ? 'rgba(46, 160, 67, 0.15)' : part.removed ? 'rgba(248, 81, 73, 0.15)' : 'transparent',
                        color: part.added ? '#bbb' : part.removed ? '#bbb' : '#888'
                    }}>
                        {lines.map((line, j) => (
                            <div key={j} style={{ paddingLeft: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '15px',
                                    userSelect: 'none',
                                    color: part.added ? '#2ea043' : part.removed ? '#f85149' : '#666',
                                    fontWeight: 'bold'
                                }}>
                                    {part.added ? '+' : part.removed ? '-' : ' '}
                                </span>
                                <span style={{ color: part.added ? '#e6edf3' : part.removed ? '#e6edf3' : 'inherit' }}>
                                    {line}
                                </span>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

export default DiffPreview;
