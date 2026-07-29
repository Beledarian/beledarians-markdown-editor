import React, { useState, useEffect } from 'react';
import { resolveFileFromPath } from '../utils/fileSystem';

const isSafeImageScheme = (urlStr) => {
    if (!urlStr || typeof urlStr !== 'string') return false;
    const clean = urlStr.replace(/[\p{Cc}\s\\]/gu, '').toLowerCase();
    if (clean.includes('javascript:') || clean.includes('vbscript:') || clean.includes('data:text/html')) {
        return false;
    }
    if (clean.startsWith('./') || clean.startsWith('../') || clean.startsWith('/') || !clean.includes(':')) {
        return true;
    }
    try {
        const parsed = new URL(clean, 'http://localhost');
        const scheme = parsed.protocol.toLowerCase();
        return ['http:', 'https:', 'data:', 'blob:', 'asset:', 'tauri:'].includes(scheme);
    } catch {
        return false;
    }
};

const CustomImage = ({ src, alt, assets, currentFilePath, dirHandle, imageSize = 100, alignment = 'none' }) => {
    const [imgSrc, setImgSrc] = useState(() => (isSafeImageScheme(src) ? src : null));

    useEffect(() => {
        let isMounted = true;
        let objectUrl = null;
        const loadLocalImage = async () => {
            if (!src || !isSafeImageScheme(src)) {
                if (isMounted) setImgSrc(null);
                return;
            }
            if (!src.match(/^(http|https|data):/)) {
                let asset = null;
                // 1. Try exact path match (absolute path from project root)
                asset = assets.find(a => a.path === src);

                // 2. Try relative to current file
                if (!asset && currentFilePath) {
                    const lastSlashIdx = Math.max(currentFilePath.lastIndexOf('/'), currentFilePath.lastIndexOf('\\'));
                    const currentDir = lastSlashIdx !== -1 ? currentFilePath.substring(0, lastSlashIdx) : '';

                    let potentialPath = currentDir ? `${currentDir}/${src}` : src;
                    potentialPath = potentialPath.replace(/\/\.\//g, '/').replace(/\\/g, '/');

                    asset = assets.find(a => a.path === potentialPath);
                }

                // 3. Fallback: match by filename (lazy mode)
                if (!asset) {
                    const cleanName = src.replace(/^.*[\\/]/, '');
                    asset = assets.find(a => a.name === cleanName);
                }

                // 4. Dynamic Resolution (if not in assets cache)
                let fileHandle = asset?.handle;
                if (!fileHandle && dirHandle && typeof dirHandle !== 'string') {
                    fileHandle = await resolveFileFromPath(dirHandle, currentFilePath, src);
                }

                if (fileHandle) {
                    try {
                        const file = await fileHandle.getFile();
                        objectUrl = URL.createObjectURL(file);
                        if (isMounted) setImgSrc(objectUrl);
                    } catch (e) {
                        console.error("Failed to load image asset", e);
                    }
                } else if (window.__TAURI_INTERNALS__) {
                    try {
                        const { convertFileSrc } = await import('@tauri-apps/api/core');
                        const targetPath = asset?.path || (src.startsWith('/') || src.includes(':') ? src : `${currentFilePath ? currentFilePath.substring(0, Math.max(currentFilePath.lastIndexOf('/'), currentFilePath.lastIndexOf('\\'))) : ''}/${src}`);
                        if (isMounted && targetPath) setImgSrc(convertFileSrc(targetPath));
                    } catch (e) {
                        console.error("Failed to convert image asset path", e);
                    }
                }
            }
        };
        loadLocalImage();
        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src, assets, currentFilePath, dirHandle]);

    const style = {
        maxWidth: `${imageSize}%`,
        float: alignment === 'none' ? undefined : alignment,
        margin: alignment === 'none' ? undefined : '0 1em 1em 1em',
        clear: alignment === 'none' ? undefined : 'none' // Potentially needed
    };

    if (!imgSrc) return null;
    return <img src={imgSrc} alt={alt} style={style} />;
};
export default CustomImage;
