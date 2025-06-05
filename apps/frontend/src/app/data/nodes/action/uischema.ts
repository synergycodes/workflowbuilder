import { PaletteItem } from '@workflow-builder/types/common';
import {
  actionTypeOptions,
  priorityOptions,
  dataSourceOptions,
  objectTypeOptions,
  httpMethodOptions,
  expectedResponseOptions,
  storeResponseOptions,
  assignOptions,
  scriptOptions,
  templateOptions,
  outputFormatOptions,
  saveLocationOptions,
  ActionNodeSchema,
} from './schema';
import { generalInformation } from '../shared/general-information';
import { UISchema } from '@/features/json-form/types/uischema';
import { getScope } from '@/features/json-form/utils/get-scope';

const scope = getScope<ActionNodeSchema>;

type ActionNodeUISchema = PaletteItem<ActionNodeSchema>['uischema'];

const sendEmailProperties: ActionNodeUISchema = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: actionTypeOptions.email.value },
    },
  },
  type: 'Accordion',
  label: 'Email Settings',
  elements: [
    {
      type: 'Text',
      scope: scope('properties.sendEmail.properties.address'),
      label: 'Send To',
      placeholder: 'user@example.com',
    },
    {
      type: 'Text',
      scope: scope('properties.sendEmail.properties.copy'),
      label: 'CC / BCC',
      placeholder: 'manager@example.com',
    },
    {
      type: 'Text',
      scope: scope('properties.sendEmail.properties.subject'),
      label: 'Subject',
      placeholder: 'Type your subject here...',
    },
    {
      type: 'TextArea',
      scope: scope('properties.sendEmail.properties.body'),
      label: 'Email Body',
      placeholder: 'Type your message here...',
      minRows: 5,
    },
    {
      type: 'Select',
      scope: scope('properties.sendEmail.properties.priority'),
      label: 'Priority',
      options: priorityOptions,
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Label',
          text: 'Retry on Failure:',
        },
        {
          type: 'Switch',
          scope: scope('properties.sendEmail.properties.retryOnFailure'),
        },
      ],
    },
    {
      type: 'HorizontalLayout',
      elements: [
        { type: 'Label', text: 'Number of retries' },
        {
          type: 'Text',
          scope: scope('properties.sendEmail.properties.retries'),
          rule: {
            effect: 'DISABLE',
            condition: {
              scope: scope('properties.sendEmail.properties.retryOnFailure'),
              schema: { const: false },
            },
          },
        },
      ],
    },
  ],
};

const updateRecordProperties: ActionNodeUISchema = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: actionTypeOptions.updateRecord.value },
    },
  },
  type: 'Accordion',
  label: 'Update Record Settings',
  elements: [
    {
      type: 'Select',
      scope: scope('properties.updateRecord.properties.dataSource'),
      label: 'Data Source',
      options: dataSourceOptions,
    },
    {
      type: 'Select',
      scope: scope('properties.updateRecord.properties.objectType'),
      label: 'Object Type',
      options: objectTypeOptions,
    },
    {
      type: 'Text',
      scope: scope('properties.updateRecord.properties.recordId'),
      label: 'Record ID',
    },
    {
      label: 'Fields to Update',
      type: 'TextArea',
      scope: scope('properties.updateRecord.properties.fieldsToUpdate'),
      placeholder: 'Type your fields here',
      minRows: 5,
    },
    {
      label: 'Conditions for Update',
      type: 'TextArea',
      scope: scope('properties.updateRecord.properties.conditionForUpdates'),
      placeholder: 'Type your conditions here',
      minRows: 5,
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Label',
          text: 'Include Updated Data in Workflow:',
        },
        {
          type: 'Switch',
          scope: scope('properties.updateRecord.properties.includeData'),
        },
      ],
    },
  ],
};

const makeApiCallProperties: ActionNodeUISchema = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: actionTypeOptions.api.value },
    },
  },
  type: 'Accordion',
  label: 'API Call Settings',
  elements: [
    {
      type: 'Text',
      scope: scope('properties.makeAPICall.properties.apiUrl'),
      label: 'API Endpoint URL',
    },
    {
      type: 'Select',
      scope: scope('properties.makeAPICall.properties.httpMethod'),
      label: 'HTTP Method',
      options: httpMethodOptions,
    },
    {
      label: 'Headers',
      type: 'TextArea',
      scope: scope('properties.makeAPICall.properties.headers'),
      placeholder: 'Type your headers here',
      minRows: 5,
    },
    {
      label: 'Body/Payload',
      type: 'TextArea',
      scope: scope('properties.makeAPICall.properties.body'), //fixed - wrong scope before
      placeholder: 'Type your body here',
      minRows: 5,
    },
    {
      type: 'Select',
      scope: scope('properties.makeAPICall.properties.responseFormat'),
      label: 'Expected Response Format',
      options: expectedResponseOptions,
    },
    {
      type: 'Select',
      scope: scope('properties.makeAPICall.properties.storeResponse'),
      label: 'Store Response in Variable',
      options: storeResponseOptions,
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Label',
          text: 'Retry on Failure:',
        },
        {
          type: 'Switch',
          scope: scope('properties.makeAPICall.properties.retryOnFailure'),
        },
      ],
    },
  ],
};

const createRecordProperties: ActionNodeUISchema = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: actionTypeOptions.createRecord.value },
    },
  },
  type: 'Accordion',
  label: 'Record Settings',
  elements: [
    {
      type: 'Select',
      scope: scope('properties.createRecord.properties.dataSource'),
      label: 'Data Source',
      options: dataSourceOptions,
    },
    {
      type: 'Select',
      scope: scope('properties.createRecord.properties.objectType'),
      label: 'Object Type',
      options: objectTypeOptions,
    },
    {
      label: 'Fields to Populate',
      type: 'TextArea',
      scope: scope('properties.createRecord.properties.fieldsToPopulate'),
      placeholder: 'Type your fields here',
      minRows: 5,
    },
    {
      type: 'Select',
      scope: scope('properties.createRecord.properties.assign'),
      label: 'Assign to User/Team',
      options: assignOptions,
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Label',
          text: 'Include Created Record in Workflow:',
        },
        {
          type: 'Switch',
          scope: scope('properties.createRecord.properties.includeRecord'),
        },
      ],
    },
  ],
};

const executeScriptProperties: ActionNodeUISchema = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: actionTypeOptions.script.value },
    },
  },
  type: 'Accordion',
  label: 'Script Settings',
  elements: [
    {
      type: 'Select',
      scope: scope('properties.executeScript.properties.scriptLanguage'),
      label: 'Script Language',
      options: scriptOptions,
    },
    {
      label: 'Fields to Populate',
      type: 'TextArea',
      scope: scope('properties.executeScript.properties.scriptEditor'),
      placeholder: 'Type your code here',
      minRows: 5,
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Label',
          text: 'Pass Workflow Variables to Script:',
        },
        {
          type: 'Switch',
          scope: scope('properties.executeScript.properties.passWorkflow'),
        },
      ],
    },
    {
      type: 'Text',
      scope: scope('properties.executeScript.properties.scriptStoring'),
      label: 'Store ScriptOutput in Variable',
    },
  ],
};

const createNewDocumentProperties: ActionNodeUISchema = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: actionTypeOptions.document.value },
    },
  },
  type: 'Accordion',
  label: 'Document Settings',
  elements: [
    {
      type: 'Select',
      scope: scope('properties.createDocument.properties.template'),
      label: 'Template',
      options: templateOptions,
    },
    {
      label: 'Fields to Populate',
      type: 'TextArea',
      scope: scope('properties.createDocument.properties.fieldsToPopulate'),
      placeholder: 'Type your fields here',
      minRows: 5,
    },
    {
      type: 'Select',
      scope: scope('properties.createDocument.properties.outputFormat'),
      label: 'Output Format',
      options: outputFormatOptions,
    },
    {
      type: 'Select',
      scope: scope('properties.createDocument.properties.saveLocation'),
      label: 'Save Location',
      options: saveLocationOptions,
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Label',
          text: 'Send Document viaEmail:',
        },
        {
          type: 'Switch',
          scope: scope('properties.createDocument.properties.sendDocument'),
        },
      ],
    },
  ],
};

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      label: 'Select Action Type',
      type: 'Select',
      scope: scope('properties.type'),
    },
    ...(generalInformation ? [generalInformation] : []),
    sendEmailProperties,
    updateRecordProperties,
    makeApiCallProperties,
    createRecordProperties,
    executeScriptProperties,
    createNewDocumentProperties,
  ],
};
