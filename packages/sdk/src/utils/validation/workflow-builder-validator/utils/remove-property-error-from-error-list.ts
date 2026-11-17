import type { OutputUnit } from '@cfworker/json-schema';

type Params = {
  errors: OutputUnit[];
  // TODO: support path in the future
  propertyName: string;
  mode: 'exact' | 'all';
};

// Only these keywords name the property in the message and nowhere else
// (`Property "to" does not match schema.`, `Instance does not have required property "body".`).
// A `format` message quotes the format name, so matching it would drop `format "email"` errors of every field.
const KEYWORDS_NAMING_PROPERTY_IN_MESSAGE = new Set(['properties', 'required']);

export function removeErrorFromErrorsList({ errors, propertyName, mode }: Params): OutputUnit[] {
  return errors.filter((error) => {
    const isMentionInError =
      KEYWORDS_NAMING_PROPERTY_IN_MESSAGE.has(error.keyword) && error.error.includes(`"${propertyName}"`);

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
