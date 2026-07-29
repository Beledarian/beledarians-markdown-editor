import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';

const isDarkMode = () => (
    typeof document !== 'undefined'
    && document.documentElement.getAttribute('data-theme') === 'dark'
);

const Mermaid = ({ chart }) => {
    const [svg, setSvg] = useState('');
    const [error, setError] = useState(null);
    // Bumped when the app's light/dark mode changes so the diagram re-renders
    // with a matching Mermaid theme (a fixed 'default' theme leaves a white
    // diagram stranded on a dark page).
    const [themeVersion, setThemeVersion] = useState(0);
    const renderIdRef = useRef(0);

    useEffect(() => {
        const observer = new MutationObserver(() => setThemeVersion(v => v + 1));
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!chart) return;

        // Increment so any in-flight render knows it's stale
        const renderId = ++renderIdRef.current;

        const renderChart = async () => {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: isDarkMode() ? 'dark' : 'default',
                    securityLevel: 'antiscript',
                });
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg: renderedSvg } = await mermaid.render(id, chart);
                if (renderId !== renderIdRef.current) return; // stale
                setSvg(renderedSvg);
                setError(null);
            } catch (err) {
                if (renderId !== renderIdRef.current) return; // stale
                console.error('Mermaid render error:', err);
                console.error('Attempted chart text:', chart);
                setSvg('');
                setError('Invalid Mermaid Syntax');
            }
        };

        renderChart();
    }, [chart, themeVersion]);

    if (error) {
        return (
            <div style={{
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                border: '1px solid #ff4444',
                borderRadius: '4px',
                padding: '12px',
                color: '#e5484d',
                fontSize: '13px',
                fontFamily: 'var(--ui-font-source, monospace)'
            }}>
                Mermaid syntax error — check the diagram syntax.
            </div>
        );
    }

    return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default Mermaid;
