import { generateId } from './generate-id';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function updateKeys(data: any) {
  function updateKey(object: any) {
    if (object && typeof object === 'object') {
      for (const key in object) {
        if (key === 'key') {
          object[key] = generateId();
        } else {
          updateKey(object[key]);
        }
      }
    }
  }

  updateKey(data);

  return data;
}
