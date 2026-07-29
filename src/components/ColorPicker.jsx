import React, { useState, useRef, useEffect } from 'react';
import './ColorPicker.css';
import Tooltip from './Tooltip';

const CURATED_COLORS = [
    '#000000', '#434343', '#666666', '#999999', '#FFFFFF',
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E'
];

const ColorPicker = ({ onColorSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && isOpen) {
                event.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) dropdownRef.current?.querySelector('button')?.focus();
    }, [isOpen]);

    const handleColorClick = (color) => {
        onColorSelect(color);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const handleCustomColorChange = (event) => {
        onColorSelect(event.target.value);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    return (
        <div className="color-picker-container" ref={containerRef}>
            <Tooltip text="Text Color">
                <button
                    ref={triggerRef}
                    type="button"
                    className="color-picker-btn"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Text Color"
                    aria-expanded={isOpen}
                    aria-controls="text-color-picker"
                >
                    <span className="color-picker-indicator" aria-hidden="true" />
                    Color
                </button>
            </Tooltip>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    id="text-color-picker"
                    className="color-dropdown"
                    role="dialog"
                    aria-label="Text color palette"
                >
                    <div className="color-presets">
                        {CURATED_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                className="color-preset"
                                style={{ '--preset-color': color }}
                                onClick={() => handleColorClick(color)}
                                aria-label={`Use ${color}`}
                                title={color}
                            />
                        ))}
                    </div>
                    <div className="custom-color-row">
                        <label htmlFor="custom-text-color">Custom</label>
                        <input
                            id="custom-text-color"
                            type="color"
                            onChange={handleCustomColorChange}
                            aria-label="Choose custom text color"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorPicker;
