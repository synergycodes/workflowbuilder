import { Avatar } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

const AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='48' fill='#4f46e5'/><text x='48' y='62' font-size='38' fill='white' text-anchor='middle' font-family='sans-serif'>AL</text></svg>",
  );

export function AvatarExample() {
  return (
    <div className={frame.frame}>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Extra large</span>
        <Avatar username="Ada Lovelace" imageUrl={AVATAR} size="extra-large" />
      </label>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Large</span>
        <Avatar username="Ada Lovelace" imageUrl={AVATAR} size="large" />
      </label>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Medium</span>
        <Avatar username="Ada Lovelace" imageUrl={AVATAR} size="medium" />
      </label>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Small</span>
        <Avatar username="Ada Lovelace" imageUrl={AVATAR} size="small" />
      </label>
    </div>
  );
}
