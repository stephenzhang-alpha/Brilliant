import { describe, it, expect } from 'vitest';
import {
  generateGroupCode,
  normalizeGroupCode,
  isValidGroupCode,
  sanitizeGroupName,
  sanitizeHandle,
  GROUP_CODE_LENGTH,
} from '../groupCode';

describe('generateGroupCode', () => {
  it('produces a valid code of the right length from the unambiguous charset', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateGroupCode();
      expect(code).toHaveLength(GROUP_CODE_LENGTH);
      expect(isValidGroupCode(code)).toBe(true);
      // never includes the excluded look-alike characters
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('is deterministic with an injected rng', () => {
    const rng = () => 0; // always picks the first char ('A')
    expect(generateGroupCode(rng)).toBe('AAAAAA');
  });
});

describe('normalizeGroupCode', () => {
  it('uppercases, strips non-alphanumerics, and clamps to length', () => {
    expect(normalizeGroupCode(' ab-c 23x ')).toBe('ABC23X');
    expect(normalizeGroupCode('abcdefghij')).toBe('ABCDEF');
    expect(normalizeGroupCode('a!b@c#2$3%4')).toBe('ABC234');
    expect(normalizeGroupCode('')).toBe('');
  });
});

describe('isValidGroupCode', () => {
  it('accepts well-formed codes and rejects malformed / ambiguous ones', () => {
    expect(isValidGroupCode('ABC234')).toBe(true);
    expect(isValidGroupCode('ABC23')).toBe(false); // too short
    expect(isValidGroupCode('ABC2345')).toBe(false); // too long
    expect(isValidGroupCode('ABC23O')).toBe(false); // 'O' not in charset
    expect(isValidGroupCode('ABC230')).toBe(false); // '0' not in charset
    expect(isValidGroupCode('abc234')).toBe(false); // lowercase
  });
});

describe('sanitizeGroupName', () => {
  it('collapses whitespace, trims, and clamps length', () => {
    expect(sanitizeGroupName('  Period   3  Algebra ')).toBe('Period 3 Algebra');
    expect(sanitizeGroupName('x'.repeat(60))).toHaveLength(40);
    expect(sanitizeGroupName('   ')).toBe('');
  });
});

describe('sanitizeHandle', () => {
  it('strips unsafe characters and clamps to the handle length', () => {
    expect(sanitizeHandle('A<b>c&d')).toBe('Abcd');
    expect(sanitizeHandle('cool_name-1 2')).toBe('cool_name-1 2');
    expect(sanitizeHandle('y'.repeat(40))).toHaveLength(20);
  });
});
