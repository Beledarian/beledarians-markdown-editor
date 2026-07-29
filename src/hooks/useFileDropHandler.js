import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Custom hook managing window drag-and-drop file import and asset saving.
 */
export function useFileDropHandler({ dirHandle, refreshFileSystem, insertTextAtCursor, openFileInTab }) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processDroppedFiles = useCallback(async (files) => {
    for (let file of files) {
      if (file.type.startsWith('image/')) {
        if (dirHandle) {
          try {
            let targetHandle = dirHandle;
            try {
              targetHandle = await dirHandle.getDirectoryHandle('assets', { create: true });
            } catch { /* fallback to dirHandle root */ }

            const fileHandle = await targetHandle.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            try {
              await writable.write(file);
              await writable.close();
            } catch (writeErr) {
              try { await writable.abort(); } catch { }
              throw writeErr;
            }

            toast.success(`Saved ${file.name}`);
            refreshFileSystem?.();

            const relPath = targetHandle.name === 'assets' ? `assets/${file.name}` : file.name;
            insertTextAtCursor?.(`![${file.name}](${relPath})`);
          } catch (err) {
            console.error("Failed to save dropped file", err);
            const reader = new FileReader();
            reader.onload = (ev) => {
              insertTextAtCursor?.(`![${file.name}](${ev.target.result})`);
            };
            reader.readAsDataURL(file);
          }
        } else {
          const reader = new FileReader();
          reader.onload = (ev) => {
            insertTextAtCursor?.(`![${file.name}](${ev.target.result})`);
          };
          reader.readAsDataURL(file);
        }
      } else if (file.name && file.name.endsWith('.md')) {
        const text = typeof file.text === 'function'
          ? await file.text()
          : await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target.result || '');
              reader.readAsText(file);
            });
        const fileObj = {
          name: file.name,
          path: `web-file:${file.name}:${file.lastModified || Date.now()}`,
          handle: null,
          storageKind: 'web-import',
          lastModified: file.lastModified || Date.now(),
        };
        openFileInTab?.(fileObj, text);
      }
    }
  }, [dirHandle, refreshFileSystem, insertTextAtCursor, openFileInTab]);

  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === document.documentElement || e.target === document.body) {
        setIsDraggingOver(false);
      }
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        await processDroppedFiles(files);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [processDroppedFiles]);

  return { isDraggingOver, setIsDraggingOver };
}
