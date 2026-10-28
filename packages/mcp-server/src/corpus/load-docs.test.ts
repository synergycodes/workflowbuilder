import { FIXTURE_DOCS_ROOT, loadFixtureDocs } from '../__fixtures__/fixtures.js';
import { loadDocs } from './load-docs.js';

describe('loadDocs', () => {
  it('maps each PropsTable component and its props types to the pages that document them', async () => {
    const { docsBySymbolName } = await loadFixtureDocs();
    expect(docsBySymbolName).toEqual({
      Button: ['guides/props'],
      LabelButtonProps: ['guides/props'],
      IconButtonProps: ['guides/props'],
      Plain: ['guides/props'],
    });
  });

  it('returns plain data that survives a JSON round trip', async () => {
    const snapshot = await loadFixtureDocs();
    const written = JSON.stringify(snapshot);
    expect(JSON.parse(written)).toEqual(snapshot);
  });

  it('fails when the docs root is missing', async () => {
    await expect(loadDocs({ docsRoot: `${FIXTURE_DOCS_ROOT}-missing`, uiComponents: [] })).rejects.toThrow(
      /Docs root not found/,
    );
  });
});
