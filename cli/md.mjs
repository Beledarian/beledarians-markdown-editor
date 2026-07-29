#!/usr/bin/env node
/**
 * md / mdedit — Unified CLI & MCP Server for Beledarians Markdown Editor
 *
 * Powered by contract.mjs Runtime Contract (v1.0.0).
 */

import { basename, resolve } from 'node:path';
import {
  CONTRACT_VERSION,
  DEFAULT_CONTROL_PORT,
  EditorClient,
  ErrorCodes,
  findEditorExecutable,
  launchEditor,
  pingEditor,
  resolveNewDestination,
  validatePathForOpen,
} from './contract.mjs';

const client = new EditorClient();

async function withEditor(action) {
  const ensure = await client.ensureRunning();
  if (!ensure.ok) {
    console.error(`✗ Error launching editor: ${ensure.error.message}`);
    process.exit(1);
  }
  return action();
}

function expandGlob(pattern) {
  const absPattern = resolve(process.cwd(), pattern);
  const validation = validatePathForOpen(absPattern);
  if (validation.ok) {
    return [validation];
  }
  return [];
}

async function cmdOpen(files) {
  if (!files.length) {
    console.error('Usage: mdedit open <file.md|directory> [...]');
    process.exit(1);
  }

  await withEditor(async () => {
    let successCount = 0;
    for (const fileInput of files) {
      const validation = validatePathForOpen(fileInput);
      if (!validation.ok) {
        console.error(`✗ Error: ${validation.error.message} (${fileInput})`);
        continue;
      }

      if (validation.isDir) {
        console.error(`✗ Directory opening is not supported by current editor bridge: ${validation.path}`);
        continue;
      }

      console.log(`📄 Opening: ${validation.path}`);
      const res = await client.open(validation.path);
      if (res.ok) {
        successCount++;
      } else {
        console.error(`✗ Failed to open ${validation.path}:`, res.error?.message || res.error);
      }
    }
    if (successCount > 0) {
      console.log(`✓ Opened ${successCount} file(s).`);
    }
  });
}

async function cmdNew(nameParts) {
  if (!nameParts.length) {
    console.error('Usage: mdedit new <filename>');
    process.exit(1);
  }

  const rawInput = nameParts.join(' ').trim();
  const dest = resolveNewDestination(rawInput);
  if (!dest.ok) {
    console.error(`✗ Error: ${dest.error.message}`);
    process.exit(1);
  }

  await withEditor(async () => {
    console.log(`📝 Creating document: ${dest.path}`);
    const res = await client.create(dest.path);
    if (res.ok) {
      console.log(`✓ Created and opened "${dest.name}".`);
    } else {
      console.error(`✗ Failed to create document:`, res.error?.message || res.error);
      process.exit(1);
    }
  });
}

async function cmdPdf(args) {
  if (!args.length) {
    console.error('Usage: mdedit pdf <file.md> [output.pdf]');
    process.exit(1);
  }

  const [src, out] = args;
  const validation = validatePathForOpen(src);
  if (!validation.ok) {
    console.error(`✗ Error: ${validation.error.message}`);
    process.exit(1);
  }
  if (validation.isDir) {
    console.error(`✗ Error: PDF source must be a file, but directory given: ${validation.path}`);
    process.exit(1);
  }

  await withEditor(async () => {
    const outPath = out ? resolve(process.cwd(), out) : validation.path.replace(/\.(md|markdown)$/i, '.pdf');
    console.log(`📄 Opening source for PDF export: ${validation.path}`);
    const res = await client.exportPdf(validation.path, outPath);
    if (res.ok) {
      console.log(`✓ ${res.message}`);
    } else {
      console.error(`✗ PDF export failed:`, res.error?.message || res.error);
      process.exit(1);
    }
  });
}

async function cmdStatus() {
  const isRunning = await pingEditor();
  if (isRunning) {
    console.log(`✓ Editor daemon is running on port ${DEFAULT_CONTROL_PORT}`);
  } else {
    console.log(`✗ Editor daemon is not running.`);
    const found = findEditorExecutable();
    if (found.path) {
      console.log(`  Found executable: ${found.path}`);
    } else {
      console.log(`  No installed executable found. Set MDEDIT_DEV_APP to launch a development binary.`);
    }
  }
}

async function runMcpServer() {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

  rl.on('line', async (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      const { id, method, params } = msg;

      if (method === 'initialize') {
        const resp = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'beledarians-mdedit', version: CONTRACT_VERSION },
          },
        };
        process.stdout.write(JSON.stringify(resp) + '\n');
      } else if (method === 'tools/list') {
        const resp = {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'mdedit_open',
                description: 'Open a Markdown file in Beledarians Markdown Editor.',
                inputSchema: {
                  type: 'object',
                  properties: { path: { type: 'string', description: 'File path to open.' } },
                  required: ['path'],
                },
              },
              {
                name: 'mdedit_new',
                description: 'Create and open a new Markdown document in the editor.',
                inputSchema: {
                  type: 'object',
                  properties: { name: { type: 'string', description: 'Filename or path for the new document.' } },
                  required: ['name'],
                },
              },
              {
                name: 'mdedit_pdf',
                description: 'Open document and trigger PDF export.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', description: 'Source Markdown file path.' },
                    output: { type: 'string', description: 'Output PDF file path.' },
                  },
                  required: ['path'],
                },
              },
              {
                name: 'mdedit_status',
                description: 'Check if the background editor daemon is running.',
                inputSchema: { type: 'object', properties: {} },
              },
            ],
          },
        };
        process.stdout.write(JSON.stringify(resp) + '\n');
      } else if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        let textResult = '';
        let isError = false;

        if (toolName === 'mdedit_open') {
          const validation = validatePathForOpen(toolArgs.path);
          if (!validation.ok) {
            isError = true;
            textResult = `Error: ${validation.error.message}`;
          } else if (validation.isDir) {
            isError = true;
            textResult = `Error: Directory opening is not supported by current editor bridge (${validation.path})`;
          } else {
            const ensure = await client.ensureRunning();
            if (!ensure.ok) {
              isError = true;
              textResult = `Error launching editor: ${ensure.error.message}`;
            } else {
              const res = await client.open(validation.path);
              if (res.ok) {
                textResult = `Opened ${validation.path} in Beledarians Markdown Editor.`;
              } else {
                isError = true;
                textResult = `Failed to open ${validation.path}: ${res.error?.message || 'Command rejected'}`;
              }
            }
          }
        } else if (toolName === 'mdedit_new') {
          const dest = resolveNewDestination(toolArgs.name);
          if (!dest.ok) {
            isError = true;
            textResult = `Error: ${dest.error.message}`;
          } else {
            const ensure = await client.ensureRunning();
            if (!ensure.ok) {
              isError = true;
              textResult = `Error launching editor: ${ensure.error.message}`;
            } else {
              const res = await client.create(dest.path);
              if (res.ok) {
                textResult = `Created and opened ${dest.path}.`;
              } else {
                isError = true;
                textResult = `Failed to create document: ${res.error?.message || 'Command rejected'}`;
              }
            }
          }
        } else if (toolName === 'mdedit_pdf') {
          const validation = validatePathForOpen(toolArgs.path);
          if (!validation.ok) {
            isError = true;
            textResult = `Error: ${validation.error.message}`;
          } else if (validation.isDir) {
            isError = true;
            textResult = `Error: PDF source must be a file, not a directory (${validation.path})`;
          } else {
            const ensure = await client.ensureRunning();
            if (!ensure.ok) {
              isError = true;
              textResult = `Error launching editor: ${ensure.error.message}`;
            } else {
              const outPath = toolArgs.output ? resolve(process.cwd(), toolArgs.output) : validation.path.replace(/\.(md|markdown)$/i, '.pdf');
              const res = await client.exportPdf(validation.path, outPath);
              if (res.ok) {
                textResult = res.message;
              } else {
                isError = true;
                textResult = `PDF export failed: ${res.error?.message || 'Command rejected'}`;
              }
            }
          }
        } else if (toolName === 'mdedit_status') {
          const isRunning = await pingEditor();
          textResult = isRunning
            ? `Editor daemon is running on port ${DEFAULT_CONTROL_PORT}.`
            : `Editor daemon is currently stopped.`;
        } else {
          isError = true;
          textResult = `Unknown tool: ${toolName}`;
        }

        const resp = {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: textResult }],
            isError: isError || undefined,
          },
        };
        process.stdout.write(JSON.stringify(resp) + '\n');
      }
    } catch {
      // Ignore invalid JSON lines
    }
  });
}

function cmdHelp() {
  console.log(`
Beledarians Markdown Editor — CLI & MCP Server (mdedit / md)

Usage:
  mdedit open <file.md>                  Open file in the editor
  mdedit new  <name>                     Create and open a new file
  mdedit pdf  <file.md> [output.pdf]     Open file and trigger PDF export
  mdedit status                          Check if the editor daemon is running
  mdedit mcp                             Start MCP Server (stdio mode for AI agents)
  mdedit help                            Show this help

Examples:
  mdedit open README.md
  mdedit new my-notes
  mdedit pdf report.md export/report.pdf
  mdedit mcp
`.trim());
}

const [,, subcmd, ...rest] = process.argv;

try {
  switch (subcmd) {
    case 'open':    await cmdOpen(rest); break;
    case 'new':     await cmdNew(rest);  break;
    case 'pdf':     await cmdPdf(rest);  break;
    case 'status':  await cmdStatus();   break;
    case 'mcp':     await runMcpServer(); break;
    case 'help':
    case '--help':
    case '-h':
    case undefined: cmdHelp();           break;
    default:
      if (subcmd && (subcmd.includes('.') || subcmd.includes('/') || subcmd.includes('\\'))) {
        await cmdOpen([subcmd, ...rest]);
      } else {
        console.error(`Unknown command: ${subcmd}`);
        cmdHelp();
        process.exit(1);
      }
  }
} catch (err) {
  console.error('✗ Error:', err.message || err);
  process.exit(1);
}
