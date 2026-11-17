import { bestExcerptStart } from './match-position.js';

const filler = (size: number) => 'lorem ipsum dolor '.repeat(Math.ceil(size / 18)).slice(0, size);

describe('bestExcerptStart', () => {
  it('returns 0 when the matching cluster fits in the first window', () => {
    expect(bestExcerptStart(`canvas nodes here. ${filler(3000)}`, 'canvas nodes', 1000)).toBe(0);
  });

  it('returns 0 when nothing matches', () => {
    expect(bestExcerptStart(filler(3000), 'canvas nodes', 1000)).toBe(0);
  });

  it('moves to a cluster that straddles the end of the first window', () => {
    const text = `${filler(950)} many nodes ${filler(60)} performance of the canvas ${filler(2000)}`;
    const start = bestExcerptStart(text, 'how many nodes can the canvas handle performance', 1000);
    expect(start).toBeGreaterThan(900);
    expect(text.slice(start, start + 12)).toBe('many nodes l');
  });

  it('prefers the tightest cluster among equally complete ones', () => {
    const text = `${filler(1200)} canvas ${filler(700)} canvas nodes ${filler(500)}`;
    expect(text.slice(bestExcerptStart(text, 'canvas nodes', 1000)).startsWith('canvas nodes')).toBe(true);
  });

  it('ignores stopwords and short terms', () => {
    expect(bestExcerptStart(`${filler(2000)} the of and`, 'the of and', 1000)).toBe(0);
  });
});
