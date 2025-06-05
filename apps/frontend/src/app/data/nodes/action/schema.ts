import { sharedProperties } from '../shared/shared-properties';
import { statusOptions } from '../shared/general-information';
import { NodeSchema } from '@workflow-builder/types/node-schema';

export const actionTypeOptions = {
  email: { label: 'Send Email', value: 'sendEmail', icon: 'EnvelopeSimple' },
  updateRecord: {
    label: 'Update Record',
    value: 'updateRecord',
    icon: 'CloudArrowUp',
  },
  api: { label: 'Make API Call', value: 'makeApiCall', icon: 'WebhooksLogo' },
  createRecord: {
    label: 'Create Record',
    value: 'createRecord',
    icon: 'RowsPlusTop',
  },
  script: { label: 'Execute Script', value: 'executeScript', icon: 'Code' },
  document: {
    label: 'Create New Document',
    value: 'createNewDocument',
    icon: 'FilePlus',
  },
} as const;

export const dataSourceOptions = [
  { label: 'CRM System', value: 'crmSystem' },
  { label: 'Hubspot', value: 'hubspot' },
];

export const objectTypeOptions = [
  { label: 'Order', value: 'order' },
  { label: 'Lead', value: 'lead' },
];

export const priorityOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Low', value: 'low' },
  { label: 'High', value: 'high' },
];

export const httpMethodOptions = [
  { label: 'GET', value: 'get' },
  { label: 'POST', value: 'post' },
  { label: 'PUT', value: 'put' },
  { label: 'DELETE', value: 'delete' },
];

export const expectedResponseOptions = [
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'Plain Text', value: 'plainText' },
];

export const storeResponseOptions = [{ label: 'orderUpdateResponse', value: 'orderUpdateResponse' }];

export const assignOptions = [{ label: 'Sales Team', value: 'salesTeam' }];

export const scriptOptions = [
  { label: 'JavaScript', value: 'javaScript' },
  { label: 'Python', value: 'python' },
];

export const templateOptions = [
  { label: 'Invoice Template', value: 'invoiceTemplate' },
  { label: 'Contract Template', value: 'contractTemplate' },
];

export const outputFormatOptions = [
  { label: 'PDF', value: 'pdf' },
  { label: 'DOCX', value: 'docx' },
];

export const saveLocationOptions = [
  { label: 'Google Drive', value: 'googleDrive' },
  { label: 'Internal Storage', value: 'internalStorage' },
];

export const schema = {
  properties: {
    ...sharedProperties,
    type: {
      type: 'string',
      options: Object.values(actionTypeOptions),
      placeholder: 'Select Action Type',
    },
    status: {
      type: 'string',
      options: Object.values(statusOptions),
    },
    sendEmail: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        copy: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        priority: { type: 'string', options: Object.values(priorityOptions) },
        retries: { type: 'number' },
        retryOnFailure: { type: 'boolean' },
      },
    },
    updateRecord: {
      type: 'object',
      properties: {
        dataSource: {
          type: 'string',
          options: Object.values(dataSourceOptions),
        },
        objectType: {
          type: 'string',
          options: Object.values(objectTypeOptions),
        },
        recordId: { type: 'string' },
        fieldsToUpdate: { type: 'string' },
        conditionForUpdates: { type: 'string' },
        includeData: { type: 'boolean' },
      },
    },
    makeAPICall: {
      type: 'object',
      properties: {
        apiUrl: { type: 'string' },
        httpMethod: {
          type: 'string',
          options: Object.values(httpMethodOptions),
        },
        headers: { type: 'string' },
        body: { type: 'string' },
        responseFormat: {
          type: 'string',
          options: Object.values(expectedResponseOptions),
        },
        storeResponse: {
          type: 'string',
          options: Object.values(storeResponseOptions),
        },
        retryOnFailure: { type: 'boolean' },
      },
    },
    createRecord: {
      type: 'object',
      properties: {
        dataSource: {
          type: 'string',
          options: Object.values(dataSourceOptions),
        },
        objectType: {
          type: 'string',
          options: Object.values(objectTypeOptions),
        },
        fieldsToPopulate: { type: 'string' },
        assign: { type: 'string', options: Object.values(assignOptions) },
        includeRecord: { type: 'boolean' },
      },
    },
    executeScript: {
      type: 'object',
      properties: {
        scriptLanguage: {
          type: 'string',
          options: Object.values(scriptOptions),
        },
        scriptEditor: { type: 'string' },
        scriptStoring: { type: 'string' },
        passWorkflow: { type: 'boolean' },
      },
    },
    createDocument: {
      type: 'object',
      properties: {
        template: { type: 'string', options: Object.values(templateOptions) },
        fieldsToPopulate: { type: 'string' },
        outputFormat: {
          type: 'string',
          options: Object.values(outputFormatOptions),
        },
        saveLocation: {
          type: 'string',
          options: Object.values(saveLocationOptions),
        },
        sendDocument: { type: 'boolean' },
      },
    },
  },
} satisfies NodeSchema;

export type ActionNodeSchema = typeof schema;
