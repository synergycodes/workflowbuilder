import { describe, expect, it } from 'vitest';

import { aiTemplate, allNodeTemplate, branchTemplate, executableTemplates } from '.';
import { EXECUTABLE_NODE_TYPES, projectExecutableWorkflow } from '../../utils/project-executable-workflow';
import { validateExecutableTemplates } from '../../utils/template-validation';

describe('executable templates', () => {
  it('all pass execution projection preflight', () => {
    expect(() => validateExecutableTemplates(executableTemplates)).not.toThrow();
    for (const template of executableTemplates) {
      expect(() => projectExecutableWorkflow(template.value.diagram.nodes, template.value.diagram.edges)).not.toThrow();
    }
  });

  it('the all-node template contains each executable type', () => {
    const types = new Set(allNodeTemplate.value.diagram.nodes.map((node) => node.data.type));
    expect([...EXECUTABLE_NODE_TYPES].every((type) => types.has(type))).toBe(true);
  });

  it('the branch template wires true, false, custom, and default handles', () => {
    const handles = new Set(branchTemplate.value.diagram.edges.map((edge) => edge.sourceHandle));
    for (const handle of ['true', 'false', 'source:inner:pro', 'default']) expect(handles.has(handle)).toBe(true);
  });

  it('the AI template exposes only systemPrompt as AI runtime configuration', () => {
    const ai = aiTemplate.value.diagram.nodes.find((node) => node.data.type === 'ai-agent');
    expect(ai?.data.properties).toEqual(
      expect.objectContaining({
        label: expect.any(String),
        description: expect.any(String),
        systemPrompt: expect.any(String),
      }),
    );
    expect(ai?.data.properties).not.toHaveProperty('apiKey');
    expect(ai?.data.properties).not.toHaveProperty('tools');
    expect(ai?.data.properties).not.toHaveProperty('chatModel');
  });
});
