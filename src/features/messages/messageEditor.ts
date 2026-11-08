import { createEditorTextNodes } from '../../utils/editorTextNodes';
import { EMOJI_BASE, getEmojiUrl } from '../../utils/coolapkEmoji';

export interface PendingImageItem {
  id: string;
  file?: File;
  url?: string;
  previewUrl: string;
}

export function createEmojiImage(name: string, _filename?: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = 'coolapk-emoji';
  img.src = getEmojiUrl(name) || `${EMOJI_BASE}coolapk_emotion_1_hahaha.png`;
  img.alt = `[${name}]`;
  img.title = name;
  img.setAttribute('data-emoji', `[${name}]`);
  img.setAttribute('contenteditable', 'false');
  return img;
}

export function parseTextToEditorNodes(text: string): Node[] {
  return createEditorTextNodes(text);
}

export function getEditorText(el: HTMLElement | null): string {
  if (!el) return '';
  let result = '';
  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === 'IMG' && element.getAttribute('data-emoji')) {
        result += element.getAttribute('data-emoji');
      } else if (element.tagName === 'BR') {
        result += '\n';
      } else {
        node.childNodes.forEach(traverse);
        if ((element.tagName === 'DIV' || element.tagName === 'P') && node.nextSibling) {
          result += '\n';
        }
      }
    }
  };
  el.childNodes.forEach(traverse);
  return result;
}

export function syncEditorText(el: HTMLElement | null, text: string): void {
  if (!el) return;
  el.innerHTML = '';
  parseTextToEditorNodes(text).forEach((node) => el.appendChild(node));
}

function createPendingImageId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function appendPendingImageFiles(
  existing: PendingImageItem[],
  files: File[],
  createObjectUrl: (file: File) => string = (file) => URL.createObjectURL(file),
): PendingImageItem[] {
  const next = [...existing];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    next.push({
      id: createPendingImageId(),
      file,
      previewUrl: createObjectUrl(file),
    });
  }
  return next;
}

export function createRemotePendingImage(url: string, id = createPendingImageId()): PendingImageItem {
  return {
    id,
    url,
    previewUrl: url,
  };
}

export function revokePendingImageUrls(
  items: PendingImageItem[],
  revokeObjectUrl: (url: string) => void = (url) => URL.revokeObjectURL(url),
): void {
  for (const item of items) {
    if (item.previewUrl.startsWith('blob:')) revokeObjectUrl(item.previewUrl);
  }
}

export function clearPendingImageUrls(items: PendingImageItem[]): void {
  revokePendingImageUrls(items);
}

export function removePendingImageAt(items: PendingImageItem[], index: number): PendingImageItem[] {
  const next = [...items];
  const [removed] = next.splice(index, 1);
  if (removed) revokePendingImageUrls([removed]);
  return next;
}

export async function convertImageSourceToFile(src: string): Promise<File | null> {
  try {
    if (src.startsWith('data:')) {
      const parts = src.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(parts[1]);
      const bytes = new Uint8Array(bstr.length);
      for (let index = 0; index < bstr.length; index += 1) bytes[index] = bstr.charCodeAt(index);
      const extension = mime.split('/')[1] || 'png';
      return new File([bytes], `pasted_${Date.now()}.${extension}`, { type: mime });
    }
    const response = await fetch(src);
    const blob = await response.blob();
    const mime = blob.type || 'image/png';
    const extension = mime.split('/')[1] || 'png';
    return new File([blob], `pasted_${Date.now()}.${extension}`, { type: mime });
  } catch (error) {
    console.error('Failed to convert image src to file', error);
    return null;
  }
}

export async function extractStrayImagesFromEditor(el: HTMLElement | null): Promise<File[]> {
  if (!el) return [];
  const strayImages = el.querySelectorAll<HTMLImageElement>('img:not([data-emoji])');
  const files: File[] = [];
  for (const image of Array.from(strayImages)) {
    const src = image.src;
    image.remove();
    if (!src) continue;
    const file = await convertImageSourceToFile(src);
    if (file) files.push(file);
  }
  return files;
}

