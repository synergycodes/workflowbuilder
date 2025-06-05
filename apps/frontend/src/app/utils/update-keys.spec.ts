import { vi } from 'vitest';
import { updateKeys } from './update-keys';

describe('updateKeys', () => {
  const mockUUID = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => mockUUID);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update all key properties in node data object', () => {
    const data = {
      fields: [
        {
          id: '1',
          label: 'Label',
          value: 'Top Ports',
        },
        {
          id: '2',
          label: 'Additional info',
          value: 'Here connection ports are located at the top and at the bottom',
        },
        {
          id: '3',
          label: 'Options',
          value: 'Dropdown',
          data: [
            {
              key: '',
              label: 'A drop-down',
              value: 'Dropdown',
            },
            {
              key: '',
              label: 'With multiple',
              value: 'WithMultiple',
            },
            {
              key: '',
              label: 'Options',
              value: 'Options',
            },
          ],
        },
      ],
    };

    const updatedData = updateKeys(data);

    expect(updatedData.fields[2].data[0].key).toBe(mockUUID);
    expect(updatedData.fields[2].data[1].key).toBe(mockUUID);
    expect(updatedData.fields[2].data[2].key).toBe(mockUUID);

    expect(crypto.randomUUID).toHaveBeenCalledTimes(3);
  });

  it('should update all key properties in segment data object', () => {
    const data = {
      hasSegmentPort: true,
      hasSegmentItemsPorts: false,
      data: {
        hasSegmentPort: false,
        hasSegmentItemsPorts: false,
        data: {
          selectedValue: '',
          options: [
            {
              label: 'test without port',
              value: 'test-without-port',
              key: '',
            },
          ],
        },
      },
    };

    const updatedData = updateKeys(data);

    expect(updatedData.data.data.options[0].key).toBe(mockUUID);

    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it('should not modify other properties', () => {
    const data = {
      fields: [
        {
          id: '1',
          label: 'Label',
          type: 'Text',
          propertyType: 'Label',
          value: 'Options',
        },
        {
          id: '2',
          label: 'Select 1',
          type: 'Select',
          value: 'Option1',
          data: [{ key: 'old-uuid-1', label: 'Option 1', value: 'Option1' }],
        },
      ],
    };

    const updatedData = updateKeys(data);

    expect(updatedData.fields[0]).toEqual({
      id: '1',
      label: 'Label',
      type: 'Text',
      propertyType: 'Label',
      value: 'Options',
    });
    expect(updatedData.fields[1].label).toBe('Select 1');
    expect(updatedData.fields[1].type).toBe('Select');
    expect(updatedData.fields[1].value).toBe('Option1');
    expect(updatedData.fields[1].data[0].label).toBe('Option 1');
    expect(updatedData.fields[1].data[0].value).toBe('Option1');
  });
});
