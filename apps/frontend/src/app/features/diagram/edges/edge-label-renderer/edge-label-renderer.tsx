import { EdgeLabelRenderer } from '@xyflow/react';
import { EdgeLabel as Label } from '@synergycodes/axiom';

type EdgeLabelProps = {
  id: string;
  labelX: number;
  labelY: number;
  content: React.ReactNode;
  hovered: boolean;
  selected?: boolean;
  icon?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function EdgeLabel({
  id,
  labelX,
  labelY,
  content,
  hovered,
  selected,
  onMouseEnter,
  onMouseLeave,
}: EdgeLabelProps) {
  return (
    <EdgeLabelRenderer>
      <Label
        data-labeledgeid={id}
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
        }}
        isHovered={hovered}
        state={selected ? 'selected' : 'default'}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {content}
      </Label>
    </EdgeLabelRenderer>
  );
}
