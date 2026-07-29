import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import CustomImage from '../components/CustomImage';
import Mermaid from '../components/Mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { themes } from '../utils/codeThemes';
import {
  addCommentToMarkdown,
  editCommentInMarkdown,
  deleteCommentFromMarkdown
} from '../features/editor/comments';

export function usePreviewInteractions({
  markdownRef,
  setMarkdown,
  setUnsavedChanges,
  contextMenu: _contextMenu,
  setContextMenu,
  setEditorContextMenu,
  files = [],
  handleFileSelect,
  assets = [],
  currentFile,
  dirHandle,
  imageSize,
  imageAlignment,
  codeTheme
}) {
  const handleContextMenu = useCallback((e) => {
    const previewArea = e.target.closest('.wmde-markdown') || 
                        e.target.closest('.w-md-editor-preview') ||
                        e.target.closest('.w-md-editor-content');
    
    if (!previewArea) return;

    const target = e.target;
    
    const colorSpan = target.closest('span[style*="color"]');
    if (colorSpan) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'color',
        text: colorSpan.innerText,
        currentColor: colorSpan.style.color,
      });
      return;
    }

    const highlightMark = target.closest('mark.highlight') || target.closest('mark[style*="background"]');
    if (highlightMark) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: 'highlight',
        text: highlightMark.innerText
      });
      return;
    }

    const editorInput = target.closest('.w-md-editor-text-input');
    if (editorInput) {
      e.preventDefault();
      setEditorContextMenu({
        x: e.clientX,
        y: e.clientY
      });
      return;
    }

    const commentEl = target.closest('.preview-comment');
    const sourceLineEl = target.closest('[data-source-line]');
    
    if (commentEl || sourceLineEl) {
      e.preventDefault();
      const sourceLine = sourceLineEl?.getAttribute('data-source-line');
      
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: commentEl ? 'comment' : 'preview',
        sourceLine: sourceLine ? parseInt(sourceLine, 10) : null
      });
    }
  }, [setContextMenu, setEditorContextMenu]);

  const handleWikiLinkClick = useCallback((e) => {
    const link = e.target.closest('.wikilink');
    if (!link) return;

    const targetPath = link.getAttribute('data-path');
    if (!targetPath) return;

    const file = files.find(f => f.name === targetPath || f.path === targetPath || f.name === targetPath + '.md');
    if (file) {
      if (typeof handleFileSelect === 'function') handleFileSelect(file);
    } else {
      toast.error(`File "${targetPath}" not found in folder`);
    }
  }, [files, handleFileSelect]);

  const handlePreviewClick = useCallback((e) => {
    const previewArea = e.target.closest('.wmde-markdown');
    if (!previewArea) return;

    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    if (e.target.closest('a') || e.target.closest('input') || e.target.closest('button')) return;

    const target = e.target.closest('[data-source-line]');
    if (!target) return;

    const lineAttr = target.getAttribute('data-source-line');
    if (!lineAttr) return;

    const line = parseInt(lineAttr, 10);
    if (isNaN(line) || line < 1) return;

    const editor = document.querySelector('.w-md-editor-text-input');
    if (editor && markdownRef?.current) {
      const currentMarkdown = markdownRef.current;
      const lines = currentMarkdown.split('\n');
      let charIndex = 0;
      for (let i = 0; i < line - 1; i++) {
        if (i < lines.length) {
          charIndex += lines[i].length + 1;
        }
      }

      editor.focus();
      editor.setSelectionRange(charIndex, charIndex);
    }
  }, [markdownRef]);

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleWikiLinkClick);
    document.addEventListener('click', handlePreviewClick);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleWikiLinkClick);
      document.removeEventListener('click', handlePreviewClick);
    };
  }, [handleContextMenu, handleWikiLinkClick, handlePreviewClick]);

  const handleCheckboxToggle = useCallback((e) => {
    const target = e.target;
    const parent = target.closest('[data-source-line]');
    if (!parent) return;

    const lineAttr = parent.getAttribute('data-source-line');
    if (!lineAttr) return;

    const startLine = parseInt(lineAttr, 10);
    if (isNaN(startLine) || startLine < 1) return;

    setMarkdown(prev => {
      const lines = prev.split('\n');
      const index = startLine - 1;
      if (index >= lines.length) return prev;

      let line = lines[index];
      const listMatch = line.match(/^(\s*(?:[-*+]|\d+\.)\s*\[)([ xX])(\].*)$/);
      if (listMatch) {
        const newChar = listMatch[2] === ' ' ? 'x' : ' ';
        lines[index] = `${listMatch[1]}${newChar}${listMatch[3]}`;
      } else {
        const checkboxRegex = /\[([ xX])\]/;
        const match = line.match(checkboxRegex);
        if (match) {
          const newChar = match[1] === ' ' ? 'x' : ' ';
          lines[index] = line.replace(checkboxRegex, `[${newChar}]`);
        }
      }

      return lines.join('\n');
    });
    if (typeof setUnsavedChanges === 'function') {
      setUnsavedChanges(true);
    }
  }, [setMarkdown, setUnsavedChanges]);

  const handleAddComment = useCallback(async (lineNumber) => {
    setMarkdown(prev => {
      const next = addCommentToMarkdown(prev, lineNumber);
      return typeof next === 'string' ? next : prev;
    });
    if (typeof setUnsavedChanges === 'function') {
      setUnsavedChanges(true);
    }
  }, [setMarkdown, setUnsavedChanges]);

  const handleEditComment = useCallback(async (lineNumber) => {
    const currentMarkdown = markdownRef.current;
    const next = await editCommentInMarkdown(currentMarkdown, lineNumber);
    if (next !== currentMarkdown) {
      setMarkdown(next);
      if (typeof setUnsavedChanges === 'function') {
        setUnsavedChanges(true);
      }
    }
  }, [markdownRef, setMarkdown, setUnsavedChanges]);

  const handleDeleteComment = useCallback((lineNumber) => {
    setMarkdown(prev => deleteCommentFromMarkdown(prev, lineNumber));
    if (typeof setUnsavedChanges === 'function') {
      setUnsavedChanges(true);
    }
  }, [setMarkdown, setUnsavedChanges]);

  const handleContentEditableBlur = useCallback((e) => {
    const target = e.target;
    const lineAttr = target.getAttribute('data-source-line');
    if (!lineAttr) return;

    const startLine = parseInt(lineAttr, 10);
    if (isNaN(startLine) || startLine < 1) return;

    const endLineAttr = target.getAttribute('data-source-line-end');
    let endLine = startLine;
    if (endLineAttr) {
      const parsedEnd = parseInt(endLineAttr, 10);
      if (!isNaN(parsedEnd)) endLine = parsedEnd;
    }

    const newText = target.innerText;

    setMarkdown(prev => {
      const lines = prev.split('\n');
      const newLines = newText.split('\n').map(l => {
        let line = l.trim();
        line = line.replace(/^>\s?/, '');
        return `> ${line}`;
      });

      const startIndex = startLine - 1;
      const endIndex = endLine - 1;

      if (startIndex >= lines.length) return prev;

      let deleteCount = (endIndex - startIndex) + 1;
      if (deleteCount < 1) deleteCount = 1;

      const newMarkdownLines = [...lines];
      newMarkdownLines.splice(startIndex, deleteCount, ...newLines);

      return newMarkdownLines.join('\n');
    });
    if (typeof setUnsavedChanges === 'function') {
      setUnsavedChanges(true);
    }
    toast.success('Updated from preview');
  }, [setMarkdown, setUnsavedChanges]);

  const propsRef = useRef({});
  useEffect(() => {
    propsRef.current = {
      assets,
      currentFilePath: currentFile?.path,
      dirHandle,
      imageSize,
      imageAlignment,
      codeTheme
    };
  });

  const components = useMemo(() => ({
    blockquote: (props) => (
      <blockquote
        {...props}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleContentEditableBlur}
        style={{ cursor: 'text', outline: 'none' }}
        onFocus={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    ),
    img: (props) => (
      <CustomImage
        {...props}
        assets={propsRef.current.assets || []}
        currentFilePath={propsRef.current.currentFilePath}
        dirHandle={propsRef.current.dirHandle}
        imageSize={propsRef.current.imageSize || 100}
        alignment={propsRef.current.imageAlignment || 'none'}
      />
    ),
    input: (props) => {
      if (props.type === 'checkbox') {
        return <input {...props} onChange={handleCheckboxToggle} disabled={false} />;
      }
      return <input {...props} />;
    },
    code({ node: _node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const getCodeText = (child) => {
        if (typeof child === 'string') return child;
        if (typeof child === 'number') return String(child);
        if (Array.isArray(child)) return child.map(getCodeText).join('');
        if (child?.props?.children) return getCodeText(child.props.children);
        return '';
      };
      const codeText = getCodeText(children);

      if (!inline && match && match[1] === 'mermaid') {
        return <Mermaid chart={codeText.replace(/\n$/, '')} />;
      }
      const activeCodeTheme = themes[propsRef.current.codeTheme]
        ? propsRef.current.codeTheme
        : 'VS Code Dark';
      return !inline && match ? (
        <SyntaxHighlighter
          style={themes[activeCodeTheme]}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {codeText.replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {codeText || children}
        </code>
      );
    }
  }), [handleCheckboxToggle, handleContentEditableBlur]);

  return {
    handleContextMenu,
    handleWikiLinkClick,
    handlePreviewClick,
    handleCheckboxToggle,
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleContentEditableBlur,
    components
  };
}
