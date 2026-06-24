import { toBlob, toPng, toSvg } from 'html-to-image';

const PNG_OPTIONS = { pixelRatio: 2, backgroundColor: '#ffffff' };

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
}

/** Render a DOM subtree to a PNG and download it. */
export async function downloadPng(element: HTMLElement, filename = 'visualization.png'): Promise<void> {
  const dataUrl = await toPng(element, PNG_OPTIONS);
  triggerDownload(dataUrl, filename);
}

/**
 * Copy a DOM subtree to the clipboard as a PNG. Returns true if it reached the
 * clipboard, false if it fell back to a download (e.g. Firefox, which cannot
 * write image blobs to the clipboard).
 */
export async function copyImage(element: HTMLElement): Promise<boolean> {
  const blob = await toBlob(element, PNG_OPTIONS);
  if (!blob) {
    return false;
  }
  const canCopyImage = typeof ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write);
  if (canCopyImage) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      // fall through to download
    }
  }
  triggerDownload(URL.createObjectURL(blob), 'visualization.png');
  return false;
}

/** Download a DOM subtree as SVG (serializes an inner <svg> when present). */
export async function downloadSvg(element: HTMLElement, filename = 'visualization.svg'): Promise<void> {
  const svg = element.querySelector('svg');
  if (svg) {
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    triggerDownload(URL.createObjectURL(blob), filename);
    return;
  }
  const dataUrl = await toSvg(element);
  triggerDownload(dataUrl, filename);
}

/** Copy the raw source text to the clipboard. */
export async function copySource(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
