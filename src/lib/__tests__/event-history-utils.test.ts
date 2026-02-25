import {
  addEventToHistory,
  getEventHistory,
  removeEventFromHistory,
  clearEventHistory,
  setEventHistory,
} from '../utils';

describe('イベント履歴ユーティリティ', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('履歴が存在しない場合は空配列を返す', () => {
    expect(getEventHistory()).toEqual([]);
  });

  it('イベントを追加すると履歴に保存される', () => {
    const now = new Date().toISOString();
    addEventToHistory({
      id: '1',
      title: 'テスト',
      createdAt: now,
      isCreatedByMe: false,
    });
    const history = getEventHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('1');
  });

  it('同じIDのイベントは上書きされ先頭に来る', () => {
    const now = new Date().toISOString();
    addEventToHistory({
      id: '1',
      title: 'A',
      createdAt: now,
      isCreatedByMe: false,
    });
    addEventToHistory({
      id: '2',
      title: 'B',
      createdAt: now,
      isCreatedByMe: false,
    });
    addEventToHistory({
      id: '1',
      title: 'C',
      createdAt: now,
      isCreatedByMe: false,
    });
    const history = getEventHistory();
    expect(history[0].title).toBe('C');
    expect(history).toHaveLength(2);
  });

  it('最大保持数を超えると古いものから削除される', () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 12; i++) {
      addEventToHistory({
        id: String(i),
        title: `t${i}`,
        createdAt: now,
        isCreatedByMe: false,
      });
    }
    const history = getEventHistory();
    expect(history).toHaveLength(10);
    expect(history[0].id).toBe('11');
    expect(history[9].id).toBe('2');
  });

  it('特定のイベントを削除できる', () => {
    const now = new Date().toISOString();
    addEventToHistory({
      id: '1',
      title: 'A',
      createdAt: now,
      isCreatedByMe: false,
    });
    addEventToHistory({
      id: '2',
      title: 'B',
      createdAt: now,
      isCreatedByMe: false,
    });
    removeEventFromHistory('1');
    const history = getEventHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('2');
  });

  it('履歴をクリアできる', () => {
    const now = new Date().toISOString();
    addEventToHistory({
      id: '1',
      title: 'A',
      createdAt: now,
      isCreatedByMe: false,
    });
    clearEventHistory();
    expect(getEventHistory()).toEqual([]);
  });

  it('履歴を上書きできる', () => {
    const now = new Date().toISOString();
    setEventHistory([
      {
        id: '9',
        title: '上書き',
        createdAt: now,
        isCreatedByMe: true,
        answeredByMe: true,
        myParticipantName: '自分の回答名',
      },
    ]);
    const history = getEventHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('9');
    expect(history[0].answeredByMe).toBe(true);
    expect(history[0].myParticipantName).toBe('自分の回答名');
  });
});
