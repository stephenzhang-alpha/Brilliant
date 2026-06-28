import { describe, it, expect } from 'vitest';
import { clean } from '../ai';

describe('clean — strips LaTeX', () => {
  it('removes \\( \\) \\[ \\] delimiters', () => {
    expect(clean('\\(x\\) plus \\[y\\] end')).toBe('x plus y end');
  });

  it('rewrites \\frac{a}{b} as a/b', () => {
    expect(clean('half is \\frac{1}{2} ok')).toBe('half is 1/2 ok');
  });

  it('rewrites \\times and \\div to Unicode operators', () => {
    expect(clean('3 \\times 4 \\div 2')).toBe('3 × 4 ÷ 2');
  });

  it('unwraps ^{...} and _{...} to their contents', () => {
    expect(clean('x^{2} and a_{i}')).toBe('x2 and ai');
  });

  it('drops any other stray LaTeX command', () => {
    expect(clean('\\left(x\\right)')).toBe('(x)');
  });

  it('leaves clean Unicode math untouched', () => {
    expect(clean('Multiply 3 × 4 to get 12, then add 2 for 14.')).toBe(
      'Multiply 3 × 4 to get 12, then add 2 for 14.',
    );
  });
});

describe('clean — strips markdown noise', () => {
  it('removes ordered-list markers', () => {
    expect(clean('1. First\n2. Second')).toBe('First Second');
  });

  it('removes ~~strikethrough~~ markers', () => {
    expect(clean('~~old~~ new')).toBe('old new');
  });

  it('removes markdown tables (header, separator, and data rows)', () => {
    expect(clean('Before\n| a | b |\n| --- | --- |\n| 1 | 2 |\nAfter')).toBe('Before After');
  });
});

describe('clean — preserves existing behavior', () => {
  it('strips bold asterisks and a leading category label', () => {
    expect(clean('**(Box/Container):** A letter that stands for a number')).toBe(
      'A letter that stands for a number',
    );
  });

  it('removes headings and collapses newlines', () => {
    expect(clean('# Title\nmore')).toBe('Title more');
  });

  it('removes code fences and inline ticks', () => {
    expect(clean('```code``` and `x`')).toBe('code and x');
  });

  it('removes bullet markers', () => {
    expect(clean('- one\n- two')).toBe('one two');
  });
});
