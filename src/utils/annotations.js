const getAnnotationsKey = (filePath) => `md-annotations-${filePath}`;

export const loadAnnotations = (filePath) => {
    if (!filePath) return null;
    try {
        const key = getAnnotationsKey(filePath);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : { bookmarks: [], highlights: [] };
    } catch (e) {
        console.error("Failed to load annotations", e);
        return { bookmarks: [], highlights: [] };
    }
};

export const saveAnnotations = (filePath, annotations) => {
    if (!filePath) return;
    try {
        const key = getAnnotationsKey(filePath);
        localStorage.setItem(key, JSON.stringify(annotations));
    } catch (e) {
        console.error("Failed to save annotations", e);
    }
};
