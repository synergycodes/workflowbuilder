// https://stackoverflow.com/a/40686327/6743808
export function focusNextElement() {
  const focussableElements =
    'a:not([disabled]), button:not([disabled]), input[type=text]:not([disabled]), [tabindex]:not([disabled]):not([tabindex="-1"])';
  if (document.activeElement) {
    const focussable = Array.prototype.filter.call(
      document.activeElement.querySelectorAll(focussableElements),
      function (element) {
        return element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement;
      },
    );

    const index = focussable.indexOf(document.activeElement);

    const targetElement = focussable[index + 1];
    if (targetElement) {
      focussable[index + 1].focus();
    } else {
      console.warn('Not focusable element found');
      (document.activeElement as HTMLElement)?.blur();
    }
  }
}
