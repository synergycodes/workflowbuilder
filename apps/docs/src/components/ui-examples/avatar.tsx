import { Avatar } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

const AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='48' fill='#4f46e5'/><text x='48' y='62' font-size='38' fill='white' text-anchor='middle' font-family='sans-serif'>AL</text></svg>",
  );

export function AvatarExample() {
  return (
    <ComponentPreview>
      <Avatar username="Ada Lovelace" imageUrl={AVATAR} size="large" />
    </ComponentPreview>
  );
}
