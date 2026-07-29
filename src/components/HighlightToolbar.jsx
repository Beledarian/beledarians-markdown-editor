import React from 'react';
import './HighlightToolbar.css';

const HighlightToolbar = ({ top, left, onHighlight }) => {
    if (top === null) return null;

    return (
        <div className="highlight-toolbar" style={{ top: `${top}px`, left: `${left}px` }}>
            <button onClick={onHighlight}>Highlight</button>
        </div>
    );
};

export default HighlightToolbar;
