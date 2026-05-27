import { getHandleId } from './get-handle-id';

describe('getHandleId', () => {
  it('returns bare handleType for outer source handle', () => {
    expect(getHandleId({ handleType: 'source' })).toBe('source');
  });

  it('returns bare handleType for outer target handle', () => {
    expect(getHandleId({ handleType: 'target' })).toBe('target');
  });

  it('appends inner marker and innerId for sub-handles', () => {
    expect(getHandleId({ handleType: 'source', innerId: 'branch-1' })).toBe('source:inner:branch-1');
  });

  it('treats an empty innerId as no inner handle', () => {
    expect(getHandleId({ handleType: 'source', innerId: '' })).toBe('source');
  });

  it('does not embed the host node id (handle ids are node-scoped by xyflow)', () => {
    const id = getHandleId({ handleType: 'source', innerId: 'tool-42' });
    expect(id.startsWith('source')).toBe(true);
    expect(id).not.toContain('node-');
  });
});
