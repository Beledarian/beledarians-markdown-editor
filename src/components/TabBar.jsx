import React, { useState } from 'react';
import Icon from './Icon';
import TabContextMenu from './TabContextMenu';
import './WorkspaceChrome.css';

const TabBar = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabReorder,
  onFileDrop,
  onCloseOthers,
  onCloseToRight,
  onDuplicateTab,
  onCopyPath,
}) => {
  const [contextMenu, setContextMenu] = useState(null);

  const handleDragStart = (event, index) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'tab',
      index,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (event) => {
    event.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (event, index) => {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) return;

    try {
      const data = JSON.parse(dataString);
      if (data.type === 'tab') {
        onTabReorder?.(data.index, index);
      } else if (data.type === 'sidebar-file') {
        onFileDrop?.(data, index);
      }
    } catch (error) {
      console.error('Drop error', error);
    }
  };

  const handleTabKeyDown = (event, index) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const nextTab = event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelectorAll('[role="tab"]')[nextIndex];
    nextTab?.focus();
  };

  const handleContextMenu = (event, tab) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      tab,
    });
  };

  return (
    <div className="tab-bar document-tabs" role="tablist" aria-label="Open documents">
      {tabs.map((tab, index) => {
        const isActive = tab.path === activeTabId;
        return (
          <div
            key={tab.path}
            className={`tab ${isActive ? 'active' : ''}`}
            role="presentation"
            draggable="true"
            onDragStart={(event) => handleDragStart(event, index)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(event) => handleDrop(event, index)}
            onContextMenu={(event) => handleContextMenu(event, tab)}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              className="tab-select"
              onClick={() => onTabClick(tab.path)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              title={tab.path}
              tabIndex={isActive ? 0 : -1}
            >
              <span className="tab-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <Icon name="document" />
              <span className="tab-name">{tab.name}</span>
              {tab.unsaved && (
                <span className="tab-unsaved-dot" aria-label="unsaved changes" />
              )}
            </button>
            <button
              type="button"
              className="tab-close"
              aria-label={`Close ${tab.name}`}
              onClick={() => onTabClose(tab.path)}
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        );
      })}

      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tab={contextMenu.tab}
          onClose={() => setContextMenu(null)}
          onCloseTab={(path) => onTabClose?.(path)}
          onCloseOthers={(path) => onCloseOthers?.(path)}
          onCloseToRight={(path) => onCloseToRight?.(path)}
          onDuplicateTab={(path) => onDuplicateTab?.(path)}
          onCopyPath={(path) => onCopyPath?.(path)}
        />
      )}
    </div>
  );
};

export default TabBar;
