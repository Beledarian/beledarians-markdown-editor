import { useState, useEffect, useRef } from 'react';

const Tooltip = ({ text, shortcut, children, delay = 500 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div 
      className="tooltip-wrapper" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {isVisible && (
        <div className="tooltip-bubble">
          {text}
          {shortcut && <span className="tooltip-shortcut"> [{shortcut}]</span>}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
