// File System Utilities

export const isIgnored = (name, patterns) => {
  return patterns.some(pattern => {
    if (pattern.startsWith('*')) return name.endsWith(pattern.slice(1));
    if (pattern.endsWith('*')) return name.startsWith(pattern.slice(0, -1));
    return name === pattern;
  });
};

export const loadIgnoreFile = async (directory) => {
  if (typeof directory === 'string') {
    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const text = await readTextFile(`${directory}/.md-ignore`);
      const patterns = JSON.parse(text);
      if (Array.isArray(patterns)) return patterns;
    } catch {
      // Ignored
    }
  } else {
    try {
      const fileHandle = await directory.getFileHandle('.md-ignore', { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      const patterns = JSON.parse(text);
      if (Array.isArray(patterns)) {
        return patterns;
      }
    } catch {
      // console.log('No .md-ignore file found or invalid format.');
    }
  }
  return ['node_modules', '.git', 'dist', 'build'];
};

export const saveIgnoreFile = async (patterns, directory) => {
  if (!directory) return;
  if (typeof directory === 'string') {
    try {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(`${directory}/.md-ignore`, JSON.stringify(patterns, null, 2));
      return true;
    } catch (err) {
      console.error('Failed to save ignore file:', err);
      throw err;
    }
  } else {
    try {
      const fileHandle = await directory.getFileHandle('.md-ignore', { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(JSON.stringify(patterns, null, 2));
        await writable.close();
      } catch (err) {
        try { await writable.abort(); } catch { }
        throw err;
      }
      return true;
    } catch (err) {
      console.error('Failed to save ignore file:', err);
      throw err;
    }
  }
};

const scanDirectoryTauri = async (directory, patterns) => {
  const mdFiles = [];
  const assetFiles = [];
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

  const { readDir, stat } = await import('@tauri-apps/plugin-fs');
  const { join } = await import('@tauri-apps/api/path');

  const queue = [{ path: directory, relative: '' }];
  let activeWorkers = 0;
  const MAX_CONCURRENT = 20;

  return new Promise((resolve) => {
    const processQueue = async () => {
      if (queue.length === 0 && activeWorkers === 0) {
        resolve({ mdFiles, assetFiles });
        return;
      }

      while (activeWorkers < MAX_CONCURRENT && queue.length > 0) {
        const item = queue.shift();
        activeWorkers++;

        processItem(item).finally(() => {
          activeWorkers--;
          processQueue();
        });
      }
    };

    const processItem = async ({ path: dirPath, relative }) => {
      try {
        const entries = await readDir(dirPath);
        for (const entry of entries) {
          if (isIgnored(entry.name, patterns)) continue;

          const fullPath = await join(dirPath, entry.name);
          
          if (entry.isFile) {
            const name = entry.name.toLowerCase();
            if (name.endsWith('.md')) {
              let mtime = Date.now();
              try {
                const s = await stat(fullPath);
                mtime = s.mtime ? s.mtime.getTime() : Date.now();
              } catch {}

              mdFiles.push({
                name: entry.name,
                path: fullPath,
                handle: null, // No handle in Tauri
                lastModified: mtime,
                type: 'md'
              });
            } else if (imageExtensions.some(ext => name.endsWith(ext))) {
              assetFiles.push({
                name: entry.name,
                path: fullPath,
                handle: null,
                type: 'image'
              });
            }
          } else if (entry.isDirectory) {
            queue.push({ path: fullPath, relative: relative + entry.name + '/' });
          }
        }
      } catch (err) {
        console.warn(`Error scanning directory ${dirPath}:`, err);
      }
    };

    processQueue();
  });
};

export const scanDirectory = async (directory, patterns) => {
  if (typeof directory === 'string') {
    return scanDirectoryTauri(directory, patterns);
  }

  const mdFiles = [];
  const assetFiles = [];
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

  // Iterative queue-based approach with concurrency control
  const queue = [{ handle: directory, path: '' }];
  let activeWorkers = 0;
  const MAX_CONCURRENT = 20;

  return new Promise((resolve) => {
    const processQueue = async () => {
      if (queue.length === 0 && activeWorkers === 0) {
        resolve({ mdFiles, assetFiles });
        return;
      }

      while (activeWorkers < MAX_CONCURRENT && queue.length > 0) {
        const item = queue.shift();
        activeWorkers++;

        processItem(item).finally(() => {
          activeWorkers--;
          processQueue();
        });
      }
    };

    const processItem = async ({ handle, path }) => {
      try {
        if (isIgnored(handle.name, patterns)) return;

        if (handle.kind === 'file') {
          const name = handle.name.toLowerCase();
          if (name.endsWith('.md')) {
            const file = typeof handle.getFile === 'function' ? await handle.getFile() : null;
            mdFiles.push({
              name: handle.name,
              path: path + handle.name,
              handle: handle,
              lastModified: file?.lastModified || Date.now(),
              type: 'md'
            });
          } else if (imageExtensions.some(ext => name.endsWith(ext))) {
            assetFiles.push({
              name: handle.name,
              path: path + handle.name,
              handle: handle,
              type: 'image'
            });
          }
        } else if (handle.kind === 'directory') {
          const newPath = path + handle.name + '/';
          // Iterate entries and add to queue
          for await (const entry of handle.values()) {
            queue.push({ handle: entry, path: newPath });
          }
        }
      } catch (err) {
        console.warn(`Error scanning entry ${handle.name}:`, err);
      }
    };

    processQueue();
  });
};

export const resolveFileFromPath = async (rootHandle, currentFilePath, relativePath) => {
  if (!rootHandle || !relativePath) return null;
  if (typeof rootHandle === 'string') return null; // Only applicable to Web File System

  try {
    let parts = relativePath.split(/[/\\]/).filter(p => p !== '.' && p !== '');
    let currentDirParts = [];
    if (currentFilePath) {
      const pathParts = currentFilePath.split(/[/\\]/);
      pathParts.pop();
      currentDirParts = pathParts;
    }

    let targetParts = [...currentDirParts];

    for (const part of parts) {
      if (part === '..') {
        if (targetParts.length > 0) targetParts.pop();
      } else {
        targetParts.push(part);
      }
    }

    let currentHandle = rootHandle;
    for (let i = 0; i < targetParts.length; i++) {
      const part = targetParts[i];
      if (i === targetParts.length - 1) {
        return await currentHandle.getFileHandle(part);
      } else {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }
    }
  } catch {
    return null;
  }
  return null;
};

export const createNewFile = async (directory, fileName) => {
  if (!directory) throw new Error('No directory provided');

  let name = fileName.trim();
  if (!name.toLowerCase().endsWith('.md')) name += '.md';
  if (!name || name === '.md') throw new Error('Invalid filename');

  if (typeof directory === 'string') {
    const { join } = await import('@tauri-apps/api/path');
    const { exists, writeTextFile } = await import('@tauri-apps/plugin-fs');
    const fullPath = await join(directory, name);
    
    if (await exists(fullPath)) {
      throw new Error(`File "${name}" already exists`);
    }

    await writeTextFile(fullPath, `# ${name.replace('.md', '')}\n\nStart writing here...\n`);
    return { handle: null, name, path: fullPath, type: 'md' };
  } else {
    try {
      try {
        await directory.getFileHandle(name, { create: false });
        throw new Error(`File "${name}" already exists`);
      } catch (err) {
        if (err.name !== 'NotFoundError') throw err;
      }

      const fileHandle = await directory.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(`# ${name.replace('.md', '')}\n\nStart writing here...\n`);
        await writable.close();
      } catch (err) {
        try { await writable.abort(); } catch { }
        throw err;
      }
      return { handle: fileHandle, name, path: name, type: 'md' };
    } catch (err) {
      console.error('Failed to create file:', err);
      throw err;
    }
  }
};

export const deleteFile = async (directory, fileName) => {
  if (!directory || !fileName) return;
  if (typeof directory === 'string') {
    const { join } = await import('@tauri-apps/api/path');
    const { remove } = await import('@tauri-apps/plugin-fs');
    await remove(await join(directory, fileName));
    return true;
  } else {
    try {
      await directory.removeEntry(fileName);
      return true;
    } catch (err) {
      console.error('Failed to delete file:', err);
      throw err;
    }
  }
};

export const renameFile = async (directory, oldName, newName) => {
  if (!directory || !oldName || !newName) return;
  if (typeof directory === 'string') {
    const { join } = await import('@tauri-apps/api/path');
    const { rename } = await import('@tauri-apps/plugin-fs');
    const oldPath = await join(directory, oldName);
    const newPath = await join(directory, newName);
    await rename(oldPath, newPath);
    return { name: newName, path: newPath };
  } else {
    try {
      const oldHandle = await directory.getFileHandle(oldName);
      const oldFile = await oldHandle.getFile();
      const content = await oldFile.text();

      const newHandle = await directory.getFileHandle(newName, { create: true });
      const writable = await newHandle.createWritable();
      try {
        await writable.write(content);
        await writable.close();
      } catch (err) {
        try { await writable.abort(); } catch { }
        throw err;
      }

      try {
        await directory.removeEntry(oldName);
      } catch (err) {
        console.error('Failed to remove original file during rename, rolling back:', err);
        try { await directory.removeEntry(newName); } catch { }
        throw err;
      }

      return { name: newName, handle: newHandle };
    } catch (err) {
      console.error('Failed to rename file:', err);
      throw err;
    }
  }
};
