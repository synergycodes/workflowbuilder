// https://stackoverflow.com/a/40686327/6743808
export function focusNextElement() {
  const focusableElements =
    'a:not([disabled]), button:not([disabled]), input[type=text]:not([disabled]), [tabindex]:not([disabled]):not([tabindex="-1"])';
  if (document.activeElement) {
    const focusable = Array.prototype.filter.call(
      document.activeElement.querySelectorAll(focusableElements),
      function (element) {
        return element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement;
      },
    );

    const index = focusable.indexOf(document.activeElement);

    const targetElement = focusable[index + 1];
    if (targetElement) {
      focusable[index + 1].focus();
    } else {
      console.warn('Not focusable element found');
      (document.activeElement as HTMLElement)?.blur();
    }
  }
}
