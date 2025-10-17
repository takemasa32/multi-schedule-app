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
