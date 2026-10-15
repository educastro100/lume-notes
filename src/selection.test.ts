import { describe, expect, it } from 'vitest';
import { rangeSelection } from './selection';
describe('file range selection', () => {
  it('uses visible order across groups and supports a backwards Shift range', () => {
    expect(rangeSelection(['a', 'b', 'c', 'd'], 'd', 'b', ['d'], true, false)).toEqual([
      'b',
      'c',
      'd',
    ]);
  });
  it('adds and removes individual files with Ctrl without losing the rest', () => {
    expect(rangeSelection(['a', 'b', 'c'], 'a', 'c', ['a'], false, true)).toEqual(['a', 'c']);
    expect(rangeSelection(['a', 'b', 'c'], 'a', 'a', ['a', 'c'], false, true)).toEqual(['c']);
  });
  it('resets to one file on a plain click and handles a missing anchor', () => {
    expect(rangeSelection(['a', 'b'], 'missing', 'b', ['a'], true, false)).toEqual(['b']);
    expect(rangeSelection(['a', 'b'], 'a', 'b', ['a'], false, false)).toEqual(['b']);
  });
});
