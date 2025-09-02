import { percentChangeLabel } from './percentChange';

describe('percentChangeLabel', () => {
  test('previous 0 and current 0 -> 0%', () => {
    expect(percentChangeLabel(0, 0)).toBe('0%');
  });

  test('previous 0 and current > 0 -> +100%', () => {
    expect(percentChangeLabel(5, 0)).toBe('+100%');
    expect(percentChangeLabel(1, 0)).toBe('+100%');
  });

  test('increase with previous > 0', () => {
    expect(percentChangeLabel(200, 100)).toBe('+100%');
    expect(percentChangeLabel(150, 100)).toBe('+50%');
    expect(percentChangeLabel(110, 100)).toBe('+10%');
  });

  test('decrease with previous > 0', () => {
    expect(percentChangeLabel(50, 100)).toBe('-50%');
    expect(percentChangeLabel(90, 100)).toBe('-10%');
  });

  test('decimal rounding to 1 place', () => {
    expect(percentChangeLabel(105, 100)).toBe('+5%');
    expect(percentChangeLabel(106, 100)).toBe('+6%');
    expect(percentChangeLabel(111, 100)).toBe('+11%');
    expect(percentChangeLabel(101, 99)).toBe('+2%');
  });
});
