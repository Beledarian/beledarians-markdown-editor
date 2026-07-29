import { describe, it, expect } from 'vitest';
import { scanDirectory } from './fileSystem';

// Mock FileSystem classes
class MockHandle {
  constructor(name, kind) {
    this.name = name;
    this.kind = kind;
  }
}

class MockFileHandle extends MockHandle {
  constructor(name) {
    super(name, 'file');
  }
}

class MockDirectoryHandle extends MockHandle {
  constructor(name, entries = []) {
    super(name, 'directory');
    this._entries = entries;
  }

  async *values() {
    for (const entry of this._entries) {
      yield entry;
    }
  }
}

describe('scanDirectory', () => {
  it('should scan a flat directory', async () => {
    const root = new MockDirectoryHandle('root', [
      new MockFileHandle('test.md'),
      new MockFileHandle('image.png'),
      new MockFileHandle('ignore.txt')
    ]);

    const { mdFiles, assetFiles } = await scanDirectory(root, []);

    expect(mdFiles).toHaveLength(1);
    expect(mdFiles[0].name).toBe('test.md');
    expect(assetFiles).toHaveLength(1);
    expect(assetFiles[0].name).toBe('image.png');
  });

  it('should scan nested directories', async () => {
    const root = new MockDirectoryHandle('root', [
      new MockFileHandle('root.md'),
      new MockDirectoryHandle('folder1', [
        new MockFileHandle('nested.md'),
        new MockDirectoryHandle('folder2', [
          new MockFileHandle('deep.md')
        ])
      ])
    ]);

    const { mdFiles } = await scanDirectory(root, []);

    expect(mdFiles).toHaveLength(3);
    const names = mdFiles.map(f => f.name).sort();
    expect(names).toEqual(['deep.md', 'nested.md', 'root.md']);
  });

  it('should respect ignore patterns', async () => {
    const root = new MockDirectoryHandle('root', [
      new MockFileHandle('keep.md'),
      new MockDirectoryHandle('node_modules', [
        new MockFileHandle('ignore.md')
      ])
    ]);

    const { mdFiles } = await scanDirectory(root, ['node_modules']);

    expect(mdFiles).toHaveLength(1);
    expect(mdFiles[0].name).toBe('keep.md');
  });

  it('should handle large width without deadlock', async () => {
    // Create a directory with more items than the old limit (20)
    const entries = [];
    for (let i = 0; i < 50; i++) {
      entries.push(new MockDirectoryHandle(`dir${i}`, [
        new MockFileHandle(`file${i}.md`)
      ]));
    }
    const root = new MockDirectoryHandle('root', entries);

    const { mdFiles } = await scanDirectory(root, []);

    expect(mdFiles).toHaveLength(50);
  });
});
