import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Icon from './Icon';

const FloatingFormatMenu = ({ position, onClose, onApply, initialColor = '#ffff00', initialOpacity = 0.5, type = 'highlight' }) => {
    const [color, setColor] = useState(initialColor);
    const [opacity, setOpacity] = useState(initialOpacity);
    const [placement, setPlacement] = useState({ top: position.y, left: position.x });
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Keep the menu fully on-screen: a selection near the right/bottom edge
    // would otherwise push this fixed-width popover past the viewport.
    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const margin = 8;
        const { width, height } = el.getBoundingClientRect();
        const left = Math.max(margin, Math.min(position.x, window.innerWidth - width - margin));
        const top = Math.max(margin, Math.min(position.y, window.innerHeight - height - margin));
        setPlacement({ top, left });
    }, [position.x, position.y]);

    const handleApply = () => {
        onApply({ color, opacity, type });
        onClose();
    };

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    const getPreviewStyle = () => {
        if (type === 'highlight') {
            const rgb = hexToRgb(color);
            const bg = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})` : color;
            return { backgroundColor: bg, color: 'inherit', padding: '2px 4px' };
        } else {
            return { color: color };
        }
    };

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: placement.top,
                left: placement.left,
                backgroundColor: 'var(--modal-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '15px',
                boxShadow: 'var(--ui-modal-shadow)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '220px',
                color: 'var(--text-color)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    Format {type === 'highlight' ? 'Highlight' : 'Text'}
                </span>
                <button
                    type="button"
                    className="icon-close-btn"
                    onClick={onClose}
                    aria-label={`Close ${type === 'highlight' ? 'highlight' : 'text'} formatting`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}
                >
                    <Icon name="close" />
                </button>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Color</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ flex: 1, height: '30px', cursor: 'pointer' }}
                    />
                    <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                    />
                </div>
            </div>

            {type === 'highlight' && (
                <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>Opacity: {Math.round(opacity * 100)}%</label>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>
            )}

            <div style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', background: 'var(--bg-color)' }}>
                <span style={getPreviewStyle()}>Preview Text</span>
            </div>

            <button onClick={handleApply} style={{ marginTop: '5px' }}>
                Apply
            </button>
        </div>
    );
};

export default FloatingFormatMenu;
