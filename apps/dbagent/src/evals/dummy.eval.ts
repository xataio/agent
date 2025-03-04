import { describe, expect, test } from 'vitest';

describe('dummy', () => {
  test('eval', () => {
    console.log('env', JSON.stringify(process.env));
    expect(1 + 2).toBe(3);
  });
});
