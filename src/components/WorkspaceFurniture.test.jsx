import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ActivityRail,
  OutlineRail,
  WorkspaceTitle,
} from './WorkspaceFurniture.jsx';

describe('Workspace furniture', () => {
  it('renders truthful title context without pictogram labels', () => {
    render(
      <WorkspaceTitle
        workspaceName="knowledge"
        currentFile={{ name: 'README.md', path: 'knowledge/docs/README.md' }}
        workspaceStyle="reading"
      />,
    );

    expect(screen.getByText('Markdown Editor')).toBeInTheDocument();
    expect(screen.getByText('knowledge')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.getByText('reading')).toBeInTheDocument();
  });

  it('routes activity actions through accessible named buttons', () => {
    const onSectionChange = vi.fn();
    const onSearch = vi.fn();
    const onThemes = vi.fn();

    render(
      <ActivityRail
        activeSection="files"
        onSectionChange={onSectionChange}
        onSearch={onSearch}
        onThemes={onThemes}
      />,
    );

    expect(screen.getByRole('button', { name: 'Files' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Themes' }));

    expect(onSectionChange).toHaveBeenCalledWith('outline');
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onThemes).toHaveBeenCalledOnce();
  });

  it('navigates to the selected source line from the outline', () => {
    const onHeadingClick = vi.fn();
    render(
      <OutlineRail
        headings={[{ text: 'Working model', level: 2, line: 12 }]}
        onHeadingClick={onHeadingClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Working model' }));
    expect(onHeadingClick).toHaveBeenCalledWith(12);
  });
});
