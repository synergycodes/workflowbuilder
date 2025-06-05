import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { ActionNodeSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<ActionNodeSchema> = {
  label: 'node.action.label',
  description: 'node.action.description',
  status: 'active',
  sendEmail: {
    priority: 'normal',
    retryOnFailure: false,
    retries: 3,
  },
  updateRecord: {
    dataSource: 'crmSystem',
    objectType: 'order',
    recordId: '{{order.id}}',
    includeData: false,
  },
  makeAPICall: {
    apiUrl: 'https://api.example.com/update_status',
    httpMethod: 'get',
    responseFormat: 'json',
    storeResponse: 'orderUpdateResponse',
    retryOnFailure: false,
  },
  createRecord: {
    dataSource: 'hubspot',
    objectType: 'lead',
    assign: 'salesTeam',
  },
  executeScript: {
    scriptLanguage: 'javaScript',
    scriptStoring: 'orderUpdateResponse',
    passWorkflow: false,
  },
  createDocument: {
    template: 'invoiceTemplate',
    outputFormat: 'pdf',
    saveLocation: 'googleDrive',
    sendDocument: false,
  },
};
