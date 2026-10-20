import { render } from '@testing-library/react';
import ace from 'ace-builds';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SyntaxHighlighter } from './syntax-highlighter';

type WorkerMode = { prototype: { createWorker: () => unknown } };

describe('SyntaxHighlighter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Ace builds its worker from a blob: URL, which a Content Security Policy without worker-src blocks.
  it('never asks the JSON mode for a worker when it mounts', () => {
    const { Mode } = ace.require('ace/mode/json') as { Mode: WorkerMode };
    const createWorker = vi.spyOn(Mode.prototype, 'createWorker');

    render(<SyntaxHighlighter value='{"a": 1}' />);

    expect(createWorker).not.toHaveBeenCalled();
  });
});
