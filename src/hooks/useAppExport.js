import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { buildFullHtmlDocument } from '../features/export/htmlExport';
import cssContent from '../App.css?raw';
import highlightCss from '../components/HighlightToolbar.css?raw';
import katexCss from 'katex/dist/katex.min.css?raw';

export function useAppExport({ markdown, theme }) {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printIframeRef = useRef(null);

  const handleExportHTML = useCallback(() => {
    const previewElement = typeof document !== 'undefined' ? document.querySelector('.wmde-markdown') : null;
    if (previewElement) {
      const fullHtml = buildFullHtmlDocument({
        htmlContent: previewElement.innerHTML,
        theme,
        cssContent,
        highlightCss,
        katexCss
      });
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'markdown.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [theme]);

  const handleExportPDF = useCallback(() => {
    setShowPrintModal(true);
  }, []);

  const handlePrintConfirm = useCallback((options) => {
    const { theme: printTheme, removeMargins, showFooter } = options;

    if (printIframeRef.current && document.body.contains(printIframeRef.current)) {
      document.body.removeChild(printIframeRef.current);
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    printIframeRef.current = iframe;

    if (!iframe.contentWindow) {
      toast.error('Print failed: unable to create print frame');
      document.body.removeChild(iframe);
      printIframeRef.current = null;
      return;
    }

    const doc = iframe.contentWindow.document;
    const previewElement = document.querySelector('.wmde-markdown');
    const content = previewElement ? previewElement.innerHTML : '<h1>Error: No preview content found</h1>';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html data-theme="${theme}">
      <head>
        <title>Print</title>
        <style>
          ${cssContent}
          ${highlightCss}
          ${katexCss}
          
          @media print {
            @page { 
              margin: ${removeMargins ? '0' : '20mm'}; 
            }
            body { 
              background-color: white !important; 
              color: black !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: ${removeMargins ? '0 !important' : '20mm !important'};
              padding: ${removeMargins ? '20px !important' : '0 !important'};
              ${showFooter ? 'padding-bottom: 30px !important;' : ''}
            }
          }
          
          body.print-theme-dark {
            background-color: #1e1e1e !important;
            color: #d4d4d4 !important;
          }
          body.print-theme-dark .wmde-markdown {
            color: #d4d4d4 !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body { 
            padding: 20px; 
            overflow: visible;
            position: relative;
            min-height: 100vh;
            max-width: 100vw;
          }
          .wmde-markdown { 
            font-family: var(--font-family); 
            line-height: 1.5; 
            width: 100%;
            overflow-wrap: break-word;
          }
          
          .wmde-markdown pre, 
          .wmde-markdown code {
             white-space: pre-wrap !important;
             overflow-wrap: break-word !important; 
             word-break: break-word !important;
          }
          
          .wmde-markdown table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1rem;
          }
          
          .wmde-markdown th,
          .wmde-markdown td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          
          .wmde-markdown th {
            padding-top: 12px;
            padding-bottom: 12px;
            text-align: left;
            background-color: ${printTheme === 'dark' ? '#333' : '#f2f2f2'};
            color: ${printTheme === 'dark' ? '#fff' : '#000'};
          }

          img { max-width: 100%; }

          .print-footer {
            position: fixed;
            bottom: 0;
            right: 20px;
            text-align: right;
            font-size: 10px;
            color: #888;
            padding-bottom: 10px;
            background: transparent;
            pointer-events: none;
            display: ${showFooter ? 'block' : 'none'};
          }
        </style>
      </head>
      <body class="print-theme-${printTheme}">
        <div class="wmde-markdown">
          ${content}
        </div>
        <div class="print-footer">BeledariansMD-Editor</div>
        <script>
          (function() {
             const images = document.getElementsByTagName('img');
             const promises = Array.from(images).map(img => {
               if (img.complete) return Promise.resolve();
               return new Promise(resolve => {
                 img.onload = resolve;
                 img.onerror = resolve;
               });
             });
             
             Promise.all(promises).then(() => {
                setTimeout(() => {
                   window.focus();
                   window.print();
                }, 250);
             });
          })();
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      if (printIframeRef.current === iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
        printIframeRef.current = null;
      }
    }, 60000);
  }, [theme]);

  const copyToClipboard = useCallback(() => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(markdown).then(() => {
        toast.success('Copied to clipboard!');
      }).catch(() => {
        toast.error('Failed to copy to clipboard');
      });
    }
  }, [markdown]);

  const handleCopyHTML = useCallback(() => {
    const previewElement = typeof document !== 'undefined' ? document.querySelector('.wmde-markdown') : null;
    if (previewElement && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(previewElement.innerHTML).then(() => {
        toast.success('HTML copied to clipboard!');
      }).catch(() => {
        toast.error('Failed to copy HTML');
      });
    }
  }, []);

  return {
    showPrintModal,
    setShowPrintModal,
    handleExportHTML,
    handleExportPDF,
    handlePrintConfirm,
    copyToClipboard,
    handleCopyHTML
  };
}
