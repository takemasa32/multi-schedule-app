import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExistingAnswerMenu from '@/components/event-client/existing-answer-menu';

const participants = [
  { id: 'participant-1', name: '田中太郎' },
  { id: 'participant-2', name: '佐藤花子' },
];

describe('ExistingAnswerMenu', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('クリックで開閉状態を切り替える', () => {
    render(
      <ExistingAnswerMenu
        eventPublicToken="event-token"
        linkedParticipantId={null}
        participants={participants}
      />,
    );

    const button = screen.getByRole('button', { name: '既存の回答を編集' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('外側の操作とEscapeキーで閉じる', () => {
    render(
      <ExistingAnswerMenu
        eventPublicToken="event-token"
        linkedParticipantId={null}
        participants={participants}
      />,
    );

    const button = screen.getByRole('button', { name: '既存の回答を編集' });
    fireEvent.click(button);
    fireEvent.pointerDown(document.body);
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  test('編集先と現在の利用者の回答を区別して表示する', () => {
    render(
      <ExistingAnswerMenu
        eventPublicToken="event-token"
        linkedParticipantId="participant-1"
        participants={participants}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '既存の回答を編集' }));

    expect(screen.getByRole('menuitem', { name: '自分の回答を編集' })).toHaveAttribute(
      'href',
      '/event/event-token/input?participant_id=participant-1',
    );
    expect(screen.getByRole('menuitem', { name: '田中太郎（自分）' })).toHaveAttribute(
      'href',
      '/event/event-token/input?participant_id=participant-1',
    );
  });

  test('下矢印キーで開き、最初の項目へフォーカスを移す', () => {
    render(
      <ExistingAnswerMenu
        eventPublicToken="event-token"
        linkedParticipantId={null}
        participants={participants}
      />,
    );

    const button = screen.getByRole('button', { name: '既存の回答を編集' });
    fireEvent.keyDown(button, { key: 'ArrowDown' });

    expect(button).toHaveAttribute('aria-expanded', 'true');
    const firstItem = screen.getByRole('menuitem', { name: '田中太郎' });
    expect(firstItem).toHaveFocus();

    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: '佐藤花子' })).toHaveFocus();
  });

  test('クリックで開いた後の下矢印キーでも先頭項目へ移動する', () => {
    render(
      <ExistingAnswerMenu
        eventPublicToken="event-token"
        linkedParticipantId={null}
        participants={participants}
      />,
    );

    const button = screen.getByRole('button', { name: '既存の回答を編集' });
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'ArrowDown' });

    expect(screen.getByRole('menuitem', { name: '田中太郎' })).toHaveFocus();
  });
});
