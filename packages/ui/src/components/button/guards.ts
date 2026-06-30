import { PropsWithChildren, isValidElement } from 'react';

export function hasIconChildrenOnly<T>(props: PropsWithChildren): props is PropsWithChildren<T> {
  return isValidElement(props.children) || typeof props.children === 'function';
}

export function hasChildrenWithStringAndIcons<T>(props: PropsWithChildren): props is PropsWithChildren<T> {
  return (
    Array.isArray(props.children) &&
    props.children.length >= 2 &&
    (typeof props.children[0] === 'string' || isValidElement(props.children[0])) &&
    (typeof props.children[1] === 'string' || isValidElement(props.children[1]))
  );
}

export function hasStringChildrenOnly<T>(props: PropsWithChildren): props is PropsWithChildren<T> {
  return typeof (props as PropsWithChildren<T>).children === 'string';
}
