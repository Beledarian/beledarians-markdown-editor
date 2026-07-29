import React, { useEffect, useRef } from 'react';
import Icon from './Icon';
import './ContextMenus.css';

const TabContextMenu = ({
  x,
  y,
  tab,
  onClose,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onDuplicateTab,
  onCopyPath,
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    menuRef.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const finalX = x + 180 > window.innerWidth ? window.innerWidth - 188 : x;
  const finalY = y + 170 > window.innerHeight ? window.innerHeight - 178 : y;

  return (
    <div
      ref={menuRef}
      className="context-menu tab-context-menu"
      role="menu"
      aria-label="Tab actions"
      style={{ top: finalY, left: finalX }}
    >
      <div className="context-menu__title">{tab.name}</div>
      <button type="button" role="menuitem" onClick={() => { onCloseTab(tab.path); onClose(); }}>
        <Icon name="close" />
        <span>Close Tab</span>
      </button>
      <button type="button" role="menuitem" onClick={() => { onCloseOthers(tab.path); onClose(); }}>
        <Icon name="close" />
        <span>Close Other Tabs</span>
      </button>
      <button type="button" role="menuitem" onClick={() => { onCloseToRight(tab.path); onClose(); }}>
        <Icon name="close" />
        <span>Close Tabs to Right</span>
      </button>
      <div className="tab-context-menu__separator" role="separator" />
      <button type="button" role="menuitem" onClick={() => { onDuplicateTab(tab.path); onClose(); }}>
        <Icon name="copy" />
        <span>Duplicate Tab</span>
      </button>
      <button type="button" role="menuitem" onClick={() => { onCopyPath(tab.path); onClose(); }}>
        <Icon name="document" />
        <span>Copy File Path</span>
      </button>
      <style>{`
        .tab-context-menu__separator {
          height: var(--ui-hairline);
          margin: var(--ui-space-1) 0;
          background: var(--ui-border);
        }
      `}</style>
    </div>
  );
};

export default TabContextMenu;
