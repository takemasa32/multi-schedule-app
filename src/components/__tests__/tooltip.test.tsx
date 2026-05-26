import React from 'react';
import { render, screen } from '@testing-library/react';
import { Tooltip, TooltipState } from '../availability-summary/tooltip';

it('ツールチップにコメントが表示される', () => {
  const portal = document.createElement('div');
  document.body.appendChild(portal);
  const state: TooltipState = {
    show: true,
    x: 0,
    y: 0,
    dateId: 'd1',
    availableParticipants: [{ name: 'Alice', comment: 'よろしく' }],
    unavailableParticipants: [],
    dateLabel: '',
    timeLabel: '',
  };
  render(<Tooltip tooltip={state} portalElement={portal} />);
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('よろしく')).toBeInTheDocument();
  document.body.removeChild(portal);
});

it('ツールチップに参加者の最終更新日時が名前の右側に表示される', () => {
  const portal = document.createElement('div');
  document.body.appendChild(portal);
  const state: TooltipState = {
    show: true,
    x: 0,
    y: 0,
    dateId: 'd1',
    availableParticipants: [
      { name: 'Alice', comment: 'よろしく', updated_at: '2026-05-26T09:15:00' },
    ],
    unavailableParticipants: [],
    dateLabel: '',
    timeLabel: '',
  };
  render(<Tooltip tooltip={state} portalElement={portal} />);
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('最終更新 5/26 09:15')).toBeInTheDocument();
  document.body.removeChild(portal);
});
