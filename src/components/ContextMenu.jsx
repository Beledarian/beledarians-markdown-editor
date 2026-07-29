import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import './ContextMenus.css';

const COLORS = ['#ff0000', '#00a85a', '#2f6feb', '#d97706', '#805ad5', '#111111', '#ffffff'];

const ContextMenu = ({
  x,
  y,
  type,
  onClose,
  onRemove,
  onChangeColor,
  onAddComment,
  onEditComment,
  onDeleteComment,
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

  const finalX = x + 220 > window.innerWidth ? Math.max(8, x - 220) : x;
  const finalY = y + 240 > window.innerHeight ? Math.max(8, y - 240) : y;
  const title = type === 'highlight'
    ? 'Highlight'
    : type === 'color'
      ? 'Text color'
      : type === 'comment'
        ? 'Comment'
        : 'Rendered document';

  const content = (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-label={`${title} actions`}
      style={{ top: finalY, left: finalX }}
    >
      <div className="context-menu__title">{title}</div>

      {onEditComment && type === 'comment' && (
        <button type="button" role="menuitem" onClick={onEditComment}>
          <Icon name="edit" />
          <span>Edit comment</span>
        </button>
      )}

      {onDeleteComment && type === 'comment' && (
        <button type="button" role="menuitem" className="is-danger" onClick={onDeleteComment}>
          <Icon name="close" />
          <span>Delete comment</span>
        </button>
      )}

      {onRemove && (type === 'highlight' || type === 'color') && (
        <button type="button" role="menuitem" onClick={onRemove}>
          <Icon name="close" />
          <span>Remove {type === 'highlight' ? 'highlight' : 'color'}</span>
        </button>
      )}

      {onAddComment && type === 'preview' && (
        <button type="button" role="menuitem" onClick={onAddComment}>
          <Icon name="edit" />
          <span>Add comment</span>
        </button>
      )}

      {type === 'color' && (
        <fieldset className="context-menu__colors">
          <legend>Change color</legend>
          <div>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="color-swatch"
                onClick={() => onChangeColor(color)}
                aria-label={`Use ${color}`}
                style={{ '--swatch-color': color }}
              />
            ))}
            <label className="color-swatch color-swatch--custom" title="Choose custom color">
              <span className="visually-hidden">Choose custom color</span>
              <input type="color" onChange={(event) => onChangeColor(event.target.value)} />
            </label>
          </div>
        </fieldset>
      )}
    </div>
  );

  return createPortal(
    content,
    document.fullscreenElement || document.querySelector('.workspace-shell') || document.body,
  );
};

export default ContextMenu;
