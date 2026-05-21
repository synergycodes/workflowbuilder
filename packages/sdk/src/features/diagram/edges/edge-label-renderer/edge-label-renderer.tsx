import { EdgeLabel as Label } from '@synergycodes/overflow-ui';
import { EdgeLabelRenderer } from '@xyflow/react';
import type { CSSProperties } from 'react';

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
  centeringTransform?: string;
};

/**
 * Renders a label (text or icon) at fixed canvas coordinates, used by edge
 * components to attach descriptive content along their path. Built on top
 * of xyflow's `<EdgeLabelRenderer>` and styled via overflow-ui's
 * `<EdgeLabel>` primitive so hover / selected states match the rest of
 * the editor.
 *
 * @category Components
 */
export function EdgeLabel({
  id,
  labelX,
  labelY,
  content,
  hovered,
  selected,
  onMouseEnter,
  onMouseLeave,
  centeringTransform = 'translate(-50%, -50%)',
}: EdgeLabelProps) {
  const style: CSSProperties = {
    transform: `${centeringTransform} translate(${labelX}px,${labelY}px)`,
  };

  // For layout that require label to determine position of the label
  if (!content) {
    return (
      <EdgeLabelRenderer>
        <span
          style={{
            ...style,
            display: 'inline-block',
            height: '2rem', // Height of label in WB
          }}
          data-edge-label-id={id}
        ></span>
      </EdgeLabelRenderer>
    );
  }

  return (
    <EdgeLabelRenderer>
      <Label
        data-edge-label-id={id}
        style={style}
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
