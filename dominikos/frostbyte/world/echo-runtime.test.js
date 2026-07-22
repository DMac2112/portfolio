import { describe, expect, it } from 'vitest';
import { echoLinePosition } from './echo-runtime.js';

describe('The Echo floating song', () => {
  it('cycles authored positions and moves only on scene time', () => {
    expect(echoLinePosition(0, 0, true)).toEqual(echoLinePosition(3, 0, true));
    expect(echoLinePosition(1, 1)).not.toEqual(echoLinePosition(1, 2));
  });

  it('keeps text still for reduced motion', () => {
    expect(echoLinePosition(2, 0, true)).toEqual(echoLinePosition(2, 20, true));
  });
});
