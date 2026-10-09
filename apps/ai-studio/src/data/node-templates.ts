import { HumanDecisionNodeTemplate } from '../components/human-decision/node-template/human-decision-template';
import { humanDecisionNodeType } from '../nodes/human-decision';
import { reviewNodeType } from '../nodes/review';

// Keyed by palette type, which is also the node's React Flow type. Module-level: the same reference across renders.
export const nodeTemplates = {
  [humanDecisionNodeType]: HumanDecisionNodeTemplate,
  [reviewNodeType]: HumanDecisionNodeTemplate,
};
