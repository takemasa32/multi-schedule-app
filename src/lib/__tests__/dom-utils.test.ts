import { ensurePortal } from '../dom-utils';

describe('ensurePortal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('要素が存在しない場合は生成される', () => {
    const el = ensurePortal('test-portal');
    expect(el.id).toBe('test-portal');
    expect(document.getElementById('test-portal')).toBe(el);
  });

  it('既存要素がある場合はそれを返す', () => {
    const first = ensurePortal('dup');
    const second = ensurePortal('dup');
    expect(first).toBe(second);
    expect(document.querySelectorAll('#dup').length).toBe(1);
  });
});
