import { toast } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';

export async function addCommentToMarkdown(prev, lineNumber) {
  const comment = await invoke('ask_user_input', { 
    title: 'Add Comment', 
    message: 'Enter comment text:',
    placeholder: 'Your comment here...'
  }).catch(() => prompt('Enter comment text:'));

  if (!comment) return prev;

  const lines = prev.split('\n');
  const index = lineNumber - 1;
  if (index >= lines.length) return prev;

  lines.splice(index + 1, 0, `<!-- ${comment} -->`);
  toast.success('Comment added');
  return lines.join('\n');
}

export async function editCommentInMarkdown(prev, lineNumber) {
  const lines = prev.split('\n');
  const index = lineNumber - 1;
  if (index >= lines.length) return prev;

  const originalLine = lines[index];
  const match = originalLine.match(/<!--\s*([\s\S]*?)\s*-->/);
  const currentText = match ? match[1] : '';

  const newComment = await invoke('ask_user_input', {
    title: 'Edit Comment',
    message: 'Update comment text:',
    placeholder: 'Your comment here...',
    defaultValue: currentText
  }).catch(() => prompt('Update comment text:', currentText));

  if (newComment === null || newComment === undefined) return prev;

  const newLines = prev.split('\n');
  const searchStart = Math.max(0, index - 3);
  const searchEnd = Math.min(newLines.length - 1, index + 3);
  let targetIndex = index < newLines.length ? index : -1;
  for (let i = searchStart; i <= searchEnd; i++) {
    if (newLines[i] === originalLine) { targetIndex = i; break; }
  }
  if (targetIndex >= 0 && targetIndex < newLines.length) {
    newLines[targetIndex] = `<!-- ${newComment} -->`;
  }
  toast.success('Comment updated');
  return newLines.join('\n');
}

export function deleteCommentFromMarkdown(prev, lineNumber) {
  const lines = prev.split('\n');
  const index = lineNumber - 1;
  if (index >= lines.length) return prev;

  lines.splice(index, 1);
  toast.success('Comment deleted');
  return lines.join('\n');
}
