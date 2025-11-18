export function openInNewTab(url: string): void {
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

  if (newWindow) {
    newWindow.opener = null; // Security: prevents the new page from accessing the window object
  }
}
