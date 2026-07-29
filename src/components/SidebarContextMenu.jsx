import React, { useEffect, useRef } from 'react';
import Icon from './Icon';
import './ContextMenus.css';

const SidebarContextMenu = ({ x, y, onClose, onRename, onDelete, onOpenInNewWindow }) => {
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

  const finalX = x + 190 > window.innerWidth ? window.innerWidth - 198 : x;
  const finalY = y + 150 > window.innerHeight ? window.innerHeight - 158 : y;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-label="File actions"
      style={{ top: finalY, left: finalX }}
    >
      <div className="context-menu__title">File</div>
      <button type="button" role="menuitem" onClick={() => { onRename(); onClose(); }}>
        <Icon name="edit" />
        <span>Rename</span>
      </button>
      <button type="button" role="menuitem" className="is-danger" onClick={onDelete}>
        <Icon name="close" />
        <span>Delete</span>
      </button>
      {onOpenInNewWindow && (
        <button type="button" role="menuitem" onClick={() => { onOpenInNewWindow(); onClose(); }}>
          <Icon name="externalFile" />
          <span>Open in new window</span>
        </button>
      )}
    </div>
  );
};

export default SidebarContextMenu;
