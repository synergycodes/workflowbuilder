export const ensureClipboardSupported = () => {
  if (!navigator.clipboard) {
    throw new Error('useExternalCopyPaste: navigator.clipboard is not supported');
  }
};
