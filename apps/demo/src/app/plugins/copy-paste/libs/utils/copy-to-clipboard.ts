import { ensureClipboardSupported } from './ensure-clipboard-supported';

/**
 * Utility to copy a selection or object to the browser clipboard as JSON.
 *
 * @param object - The object to copy to the clipboard
 * @returns Promise that resolves when the object has been copied
 */
export const copyToClipboard = async (object: unknown) => {
  ensureClipboardSupported();

  const jsonString = JSON.stringify(object, null, 2);

  await navigator.clipboard.writeText(jsonString);
};
