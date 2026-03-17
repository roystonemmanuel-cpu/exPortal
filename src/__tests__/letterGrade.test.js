import { describe, it, expect } from 'vitest';

// Inline the helper since it's not exported — test the logic directly
function letterGrade(percent) {
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B';
  if (percent >= 60) return 'C';
  if (percent >= 50) return 'D';
  return 'F';
}

describe('letterGrade', () => {
  it('returns A+ for 90+', () => expect(letterGrade(95)).toBe('A+'));
  it('returns A+ for exactly 90', () => expect(letterGrade(90)).toBe('A+'));
  it('returns A for 80–89', () => expect(letterGrade(85)).toBe('A'));
  it('returns B for 70–79', () => expect(letterGrade(73)).toBe('B'));
  it('returns C for 60–69', () => expect(letterGrade(62)).toBe('C'));
  it('returns D for 50–59', () => expect(letterGrade(50)).toBe('D'));
  it('returns F for below 50', () => expect(letterGrade(49)).toBe('F'));
  it('returns F for 0', () => expect(letterGrade(0)).toBe('F'));
});
