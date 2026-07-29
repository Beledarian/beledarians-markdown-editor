import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { themes } from '../utils/codeThemes';
import { toast } from 'react-hot-toast';

// Mermaid pulls in ~2.3MB; only load it when a diagram is actually rendered
// so documents without diagrams don't pay for it on initial load.
const Mermaid = lazy(() => import('./Mermaid'));

const CodeBlock = ({ node: _node, inline, className, children, codeTheme, ...props }) => {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(null);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : null;

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); };
  }, []);

  // react-markdown v10 may pass children as React element arrays via rehype-raw;
  // extract plain text recursively before using as a string.
  const getCodeText = (child) => {
    if (typeof child === 'string') return child;
    if (typeof child === 'number') return String(child);
    if (Array.isArray(child)) return child.map(getCodeText).join('');
    if (child?.props?.children) return getCodeText(child.props.children);
    return '';
  };
  const codeText = getCodeText(children);
  const activeCodeTheme = themes[codeTheme] ? codeTheme : 'VS Code Dark';

  if (!inline && language === 'mermaid') {
    return (
      <Suspense fallback={<div className="mermaid-loading" aria-busy="true">Rendering diagram…</div>}>
        <Mermaid chart={codeText.replace(/\n$/, '')} />
      </Suspense>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText.replace(/\n$/, '')).then(() => {
      setCopied(true);
      toast.success('Code copied!');
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy code');
    });
  };

  return !inline && match ? (
    <div style={{ position: 'relative' }} className="code-block-wrapper">
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          right: '5px',
          top: '5px',
          padding: '4px 8px',
          fontSize: '12px',
          background: 'rgba(128, 128, 128, 0.28)',
          border: '1px solid rgba(128, 128, 128, 0.45)',
          borderRadius: '4px',
          color: 'var(--text-color)',
          cursor: 'pointer',
          zIndex: 10,
          opacity: 0.8,
        }}
        title="Copy Code"
      >
        {copied ? '✓' : 'Copy'}
      </button>
      <SyntaxHighlighter
        style={themes[activeCodeTheme]}
        language={language}
        PreTag="div"
        {...props}
      >
        {codeText.replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className={className} {...props}>
      {codeText || children}
    </code>
  );
};

export default CodeBlock;
