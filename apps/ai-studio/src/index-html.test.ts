// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Poppins ships inside @workflowbuilder/sdk/style.css, so index.html needs no CDN.
// Anything external here would be browser egress the air-gapped deployment cannot make.
describe('index.html', () => {
  it('references no external resources', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html.match(/\b(?:href|src)="https?:\/\/[^"]*"/g) ?? []).toEqual([]);
  });
});
