import { ensureClipboardSupported } from './ensure-clipboard-supported';

/**
 * Utility to read and parse a selection or object from the browser clipboard.
 *
 * @returns Promise resolving to the object pasted from the clipboard
 */
export const pasteFromClipboard = async (): Promise<object> => {
  ensureClipboardSupported();

  try {
    const text = await navigator.clipboard.readText();

    return JSON.parse(text);
  } catch (error) {
    console.error('useExternalCopyPaste ERROR:', error);

    throw new Error('useExternalCopyPaste: Something went wrong while reading from clipboard');
  }
};
