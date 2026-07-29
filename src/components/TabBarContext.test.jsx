import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabBar from './TabBar';

describe('TabBar context menu & actions', () => {
  const tabs = [
    { name: 'Doc 1', path: 'doc1.md', content: 'Doc 1 content', unsaved: false },
    { name: 'Doc 2', path: 'doc2.md', content: 'Doc 2 content', unsaved: true },
    { name: 'Doc 3', path: 'doc3.md', content: 'Doc 3 content', unsaved: false },
  ];

  it('opens tab context menu on right click and triggers close others', () => {
    const onCloseOthers = vi.fn();
    const onTabClose = vi.fn();

    render(
      <TabBar
        tabs={tabs}
        activeTabId="doc2.md"
        onTabClick={vi.fn()}
        onTabClose={onTabClose}
        onCloseOthers={onCloseOthers}
      />
    );

    const doc2Tab = screen.getByRole('tab', { name: /Doc 2/i }).closest('.tab');
    fireEvent.contextMenu(doc2Tab);

    expect(screen.getByRole('menu', { name: /Tab actions/i })).toBeInTheDocument();

    const closeOthersBtn = screen.getByRole('menuitem', { name: /Close Other Tabs/i });
    fireEvent.click(closeOthersBtn);

    expect(onCloseOthers).toHaveBeenCalledWith('doc2.md');
  });

  it('triggers duplicate tab from context menu', () => {
    const onDuplicateTab = vi.fn();

    render(
      <TabBar
        tabs={tabs}
        activeTabId="doc1.md"
        onTabClick={vi.fn()}
        onTabClose={vi.fn()}
        onDuplicateTab={onDuplicateTab}
      />
    );

    const doc1Tab = screen.getByRole('tab', { name: /Doc 1/i }).closest('.tab');
    fireEvent.contextMenu(doc1Tab);

    const duplicateBtn = screen.getByRole('menuitem', { name: /Duplicate Tab/i });
    fireEvent.click(duplicateBtn);

    expect(onDuplicateTab).toHaveBeenCalledWith('doc1.md');
  });
});
