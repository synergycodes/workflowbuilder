import { NodeDataProperties } from '@/features/json-form/types/default-properties';

import { ActionNodeSchema, actionTypeOptions } from './schema';

export const defaultPropertiesData: Required<NodeDataProperties<ActionNodeSchema>> = {
  label: 'node.action.label',
  description: 'node.action.description',
  status: 'active',
  type: actionTypeOptions.email.value,
  sendEmail: {
    address: '',
    body: '',
    copy: '',
    subject: '',
    priority: 'normal',
    retryOnFailure: false,
    retries: 3,
  },
  updateRecord: {
    conditionForUpdates: '',
    fieldsToUpdate: '',
    dataSource: 'crmSystem',
    objectType: 'order',
    recordId: '{{order.id}}',
    includeData: false,
  },
  makeAPICall: {
    apiUrl: 'https://api.example.com/update_status',
    httpMethod: 'get',
    headers: '',
    body: '',
    responseFormat: 'json',
    storeResponse: 'orderUpdateResponse',
    retryOnFailure: false,
  },
  createRecord: {
    dataSource: 'hubspot',
    objectType: 'lead',
    fieldsToPopulate: '',
    assign: 'salesTeam',
    includeRecord: false,
  },
  executeScript: {
    scriptLanguage: 'javaScript',
    scriptEditor: '',
    scriptStoring: 'orderUpdateResponse',
    passWorkflow: false,
  },
  createDocument: {
    template: 'invoiceTemplate',
    fieldsToPopulate: '',
    outputFormat: 'pdf',
    saveLocation: 'googleDrive',
    sendDocument: false,
  },
};
