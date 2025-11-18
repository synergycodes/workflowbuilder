import { LayoutDirection } from '@workflow-builder/types/common';
import { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflow-builder/types/node-data';

export type IntegrationDataFormat = {
  name: string;
  layoutDirection: LayoutDirection;
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
};

export type IntegrationDataFormatOptional = Partial<IntegrationDataFormat>;

export type OnSaveParams = { isAutoSave?: boolean };

type DidSaveStatus = 'error' | 'success' | 'alreadyStarted';

/*
  The OnSave function is used throughout the Workflow Builder application.

  You can call it from anywhere, and it will trigger the onSave action in the integration wrapper.
*/
export type OnSave = (savingParams?: OnSaveParams) => Promise<DidSaveStatus>;

// Only used in through props strategy (it calls callback onDataSave={onDataSave})
export type OnSaveExternal = (data: IntegrationDataFormat, savingParams?: OnSaveParams) => Promise<DidSaveStatus>;
