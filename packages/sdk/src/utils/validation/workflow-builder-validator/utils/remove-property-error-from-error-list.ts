import type { OutputUnit } from '@cfworker/json-schema';

type Params = {
  errors: OutputUnit[];
  // TODO: support path in the future
  propertyName: string;
  mode: 'exact' | 'all';
};

export function removeErrorFromErrorsList({ errors, propertyName, mode }: Params): OutputUnit[] {
  return errors.filter((error) => {
    /*
        Sometimes the only information about the error is in the error message:
        - Property "to" does not match schema
        - Instance does not have required property "body".
    */
    const isMentionInError = error.error.includes(`"${propertyName}"`);

    if (mode === 'exact') {
      const isMentionedInInstanceLocation = error.instanceLocation === `#/${propertyName}`;
      const isMentionedInKeywordLocation = `${error.keywordLocation}/`.endsWith(`/${propertyName}/`);

      const isMentioned = isMentionInError || isMentionedInInstanceLocation || isMentionedInKeywordLocation;
      return isMentioned === false;
    }

    if (mode === 'all') {
      const isMentionedInInstanceLocation = `${error.instanceLocation}/`.includes(`#/${propertyName}/`);
      const isMentionedInKeywordLocation = `${error.keywordLocation}/`.includes(`/${propertyName}/`);

      const isMentioned = isMentionInError || isMentionedInInstanceLocation || isMentionedInKeywordLocation;

      return isMentioned === false;
    }

    return false;
  });
}
