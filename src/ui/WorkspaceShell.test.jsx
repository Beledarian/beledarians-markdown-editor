import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import WorkspaceShell from './WorkspaceShell.jsx';

describe('WorkspaceShell', () => {
  it('renders data attributes with default fallback values', () => {
    const { container } = render(<WorkspaceShell />);
    const shell = container.querySelector('.workspace-shell');

    expect(shell).toBeInTheDocument();
    expect(shell).toHaveAttribute('data-style', 'workbench');
    expect(shell).toHaveAttribute('data-color-mode', 'dark');
    expect(shell).toHaveAttribute('data-theme', 'workbench-dark');
    expect(shell).toHaveAttribute('data-layout', 'split-workbench');
    expect(shell).toHaveAttribute('data-density', 'compact');
    expect(shell).toHaveAttribute('data-platform', 'windows');
    expect(shell).toHaveAttribute('data-view-mode', 'live');
  });

  it('cascades data attributes based on workspaceStyle, colorMode, and platform', () => {
    const { container } = render(
      <WorkspaceShell
        workspaceStyle="reading"
        colorMode="light"
        platform="macos"
        viewMode="preview"
      />
    );
    const shell = container.querySelector('.workspace-shell');

    expect(shell).toHaveAttribute('data-style', 'reading');
    expect(shell).toHaveAttribute('data-color-mode', 'light');
    expect(shell).toHaveAttribute('data-theme', 'reading-light');
    expect(shell).toHaveAttribute('data-layout', 'focus-canvas');
    expect(shell).toHaveAttribute('data-density', 'comfortable');
    expect(shell).toHaveAttribute('data-platform', 'macos');
    expect(shell).toHaveAttribute('data-view-mode', 'preview');
  });

  it('correctly maps operator workspace style layout and density', () => {
    const { container } = render(
      <WorkspaceShell workspaceStyle="operator" colorMode="dark" />
    );
    const shell = container.querySelector('.workspace-shell');

    expect(shell).toHaveAttribute('data-style', 'operator');
    expect(shell).toHaveAttribute('data-layout', 'command-proof');
    expect(shell).toHaveAttribute('data-density', 'dense');
  });

  it('constrains unsupported platform values to the Windows contract', () => {
    const { container } = render(<WorkspaceShell platform="linux" />);

    expect(container.querySelector('.workspace-shell')).toHaveAttribute('data-platform', 'windows');
  });

  it('renders all slot regions when provided', () => {
    render(
      <WorkspaceShell
        titleRegion={<span data-testid="title">Title</span>}
        commandRegion={<span data-testid="command">Command</span>}
        activityRegion={<span data-testid="activity">Activity</span>}
        navigatorRegion={<span data-testid="navigator">Navigator</span>}
        tabsRegion={<span data-testid="tabs">Tabs</span>}
        workspaceRegion={<span data-testid="workspace">Workspace Content</span>}
        sourceRegion={<span data-testid="source">Source</span>}
        renderRegion={<span data-testid="render">Render</span>}
        outlineRegion={<span data-testid="outline">Outline</span>}
        statusRegion={<span data-testid="status">Status</span>}
      />
    );

    expect(screen.getByTestId('title')).toBeInTheDocument();
    expect(screen.getByTestId('title').parentElement).toHaveClass('title-region');

    expect(screen.getByTestId('command')).toBeInTheDocument();
    expect(screen.getByTestId('command').parentElement).toHaveClass('command-region');

    expect(screen.getByTestId('activity')).toBeInTheDocument();
    expect(screen.getByTestId('activity').parentElement).toHaveClass('activity-region');

    expect(screen.getByTestId('navigator')).toBeInTheDocument();
    expect(screen.getByTestId('navigator').parentElement).toHaveClass('navigator-region');

    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tabs').parentElement).toHaveClass('tabs-region');

    expect(screen.getByTestId('workspace')).toBeInTheDocument();
    expect(screen.getByTestId('workspace').parentElement).toHaveClass('workspace-region');

    expect(screen.getByTestId('source')).toBeInTheDocument();
    expect(screen.getByTestId('source').parentElement).toHaveClass('source-region');

    expect(screen.getByTestId('render')).toBeInTheDocument();
    expect(screen.getByTestId('render').parentElement).toHaveClass('render-region');

    expect(screen.getByTestId('outline')).toBeInTheDocument();
    expect(screen.getByTestId('outline').parentElement).toHaveClass('outline-region');

    expect(screen.getByTestId('status')).toBeInTheDocument();
    expect(screen.getByTestId('status').parentElement).toHaveClass('status-region');
  });

  it('does not render slot containers when regions are not provided', () => {
    const { container } = render(<WorkspaceShell />);

    expect(container.querySelector('.title-region')).toBeNull();
    expect(container.querySelector('.command-region')).toBeNull();
    expect(container.querySelector('.activity-region')).toBeNull();
    expect(container.querySelector('.navigator-region')).toBeNull();
    expect(container.querySelector('.tabs-region')).toBeNull();
    expect(container.querySelector('.source-region')).toBeNull();
    expect(container.querySelector('.render-region')).toBeNull();
    expect(container.querySelector('.outline-region')).toBeNull();
    expect(container.querySelector('.status-region')).toBeNull();
    // workspace-region is always present
    expect(container.querySelector('.workspace-region')).not.toBeNull();
  });

  it('renders persistent children inside the workspace-region container', () => {
    const { container } = render(
      <WorkspaceShell>
        <div data-testid="child">Child Content</div>
      </WorkspaceShell>
    );

    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();

    const workspaceRegion = container.querySelector('.workspace-region');
    expect(workspaceRegion.contains(child)).toBe(true);
  });
});
