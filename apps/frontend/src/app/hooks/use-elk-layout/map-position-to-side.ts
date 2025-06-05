import { Position } from '@xyflow/react';

export function mapPositionToSide(position: Position): 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' {
  switch (position) {
    case Position.Top: {
      return 'NORTH';
    }
    case Position.Right: {
      return 'EAST';
    }
    case Position.Bottom: {
      return 'SOUTH';
    }

    default: {
      return 'WEST';
    }
  }
}
