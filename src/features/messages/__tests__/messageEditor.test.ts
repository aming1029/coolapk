import { describe, expect, it, vi } from 'vitest';
import {
  appendPendingImageFiles,
  getEditorText,
  revokePendingImageUrls,
  syncEditorText,
} from '../messageEditor';

describe('messageEditor', () => {
  it('round-trips plain text, line breaks, and emoji labels through the editor', () => {
    const editor = document.createElement('div');

    syncEditorText(editor, '第一行\n[不存在表情]');

    expect(editor.querySelectorAll('br')).toHaveLength(1);
    expect(getEditorText(editor)).toBe('第一行\n[不存在表情]');
  });

  it('reads emoji image labels as their original bracket text', () => {
    const editor = document.createElement('div');
    editor.append('你好');
    const image = document.createElement('img');
    image.dataset.emoji = '[doge]';
    editor.append(image, document.createElement('br'), '再见');

    expect(getEditorText(editor)).toBe('你好[doge]\n再见');
  });

  it('creates and revokes preview URLs only for accepted image files', () => {
    const createObjectUrl = vi.fn((file: File) => `blob:${file.name}`);
    const files = [
      new File(['image'], 'a.png', { type: 'image/png' }),
      new File(['text'], 'b.txt', { type: 'text/plain' }),
    ];

    const items = appendPendingImageFiles([], files, createObjectUrl);
    expect(items).toHaveLength(1);
    expect(items[0].previewUrl).toBe('blob:a.png');

    const revokeObjectUrl = vi.fn();
    revokePendingImageUrls(items, revokeObjectUrl);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:a.png');
  });
});
