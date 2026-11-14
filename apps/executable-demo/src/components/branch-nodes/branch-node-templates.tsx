import {
  Icon,
  type NodeDataProperties,
  NodeSection,
  OptionalNodeContent,
  type WorkflowNodeTemplateProps,
  defineNodeTemplate,
  getHandleId,
} from '@workflowbuilder/sdk';
import { NodeDescription, NodeIcon, NodePanel } from '@workflowbuilder/ui';
import { Handle, Position } from '@xyflow/react';
import { memo, useMemo } from 'react';

import styles from './branch-node-templates.module.css';

import type { ConditionalSchema, DecisionSchema } from '../../data/nodes';

function SourcePort({ handleId, label }: { handleId: string; label: string }) {
  return (
    <div className={styles['port-row']}>
      <span>{label}</span>
      <Handle id={handleId} type="source" position={Position.Right} />
    </div>
  );
}

function BranchNodeFrame({
  id,
  icon,
  label,
  description,
  selected,
  showHandles,
  children,
}: WorkflowNodeTemplateProps & { children: React.ReactNode }) {
  const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);
  return (
    <NodePanel.Root selected={selected === true} className={styles['node']}>
      <NodePanel.Header>
        <NodeIcon icon={iconElement} />
        <NodeDescription label={label} description={description} />
      </NodePanel.Header>
      <NodePanel.Content isVisible={showHandles === true}>
        <OptionalNodeContent nodeId={id}>
          <NodeSection label="Routes">
            <div className={styles['routes']}>{children}</div>
          </NodeSection>
        </OptionalNodeContent>
      </NodePanel.Content>
      <NodePanel.Handles isVisible={showHandles}>
        <Handle id={getHandleId({ handleType: 'target' })} type="target" position={Position.Left} />
      </NodePanel.Handles>
    </NodePanel.Root>
  );
}

type ConditionalProperties = NodeDataProperties<ConditionalSchema>;

export const ConditionalNodeTemplate = defineNodeTemplate<ConditionalProperties>(
  memo((props: WorkflowNodeTemplateProps<ConditionalProperties>) => (
    <BranchNodeFrame {...props}>
      <SourcePort handleId="true" label="True" />
      <SourcePort handleId="false" label="False" />
    </BranchNodeFrame>
  )),
);

type DecisionProperties = NodeDataProperties<DecisionSchema>;

export const DecisionNodeTemplate = defineNodeTemplate<DecisionProperties>(
  memo((props: WorkflowNodeTemplateProps<DecisionProperties>) => {
    const branches = props.data?.properties.decisionBranches ?? [];
    return (
      <BranchNodeFrame {...props}>
        {branches.map((branch, index) => (
          <SourcePort
            key={branch.id ?? branch.sourceHandle ?? index}
            handleId={branch.sourceHandle ?? ''}
            label={branch.label || `Branch ${index + 1}`}
          />
        ))}
        <SourcePort handleId="default" label="Default" />
      </BranchNodeFrame>
    );
  }),
);
