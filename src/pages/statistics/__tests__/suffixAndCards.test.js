import { percentChangeLabel } from '../../../utils/percentChange';

const suffix = (period) => (period === 'weekly' ? 'last day' : period === 'monthly' ? 'last month' : 'last year');

describe('suffix mapping', () => {
  test('weekly -> last day', () => expect(suffix('weekly')).toBe('last day'));
  test('monthly -> last month', () => expect(suffix('monthly')).toBe('last month'));
  test('yearly -> last year', () => expect(suffix('yearly')).toBe('last year'));
});

describe('card percent rules - key cases', () => {
  test('0->0 should be 0%', () => {
    expect(percentChangeLabel(0, 0)).toBe('0%');
  });
  test('0->positive should be +100%', () => {
    expect(percentChangeLabel(10, 0)).toBe('+100%');
  });
  test('positive->0 should be -100%', () => {
    expect(percentChangeLabel(0, 10)).toBe('-100%');
  });
  test('increase with values', () => {
    expect(percentChangeLabel(300, 200)).toBe('+50%');
  });
  test('decrease with values', () => {
    expect(percentChangeLabel(80, 100)).toBe('-20%');
  });
});
