import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileInfoPanel from '../availability-summary/mobile-info-panel';

describe('MobileInfoPanel', () => {
  it('コメントが表示される', () => {
    render(
      <MobileInfoPanel
        show={true}
        dateLabel=""
        timeLabel=""
        availableParticipants={[{ name: 'Alice', comment: 'よろしく' }]}
        unavailableParticipants={[]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('よろしく')).toBeInTheDocument();
  });

  it('参加者の最終更新日時が名前の右側に表示される', () => {
    render(
      <MobileInfoPanel
        show={true}
        dateLabel=""
        timeLabel=""
        availableParticipants={[
          { name: 'Alice', comment: 'よろしく', updated_at: '2026-05-26T09:15:00' },
        ]}
        unavailableParticipants={[]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('最終更新 5/26 09:15')).toBeInTheDocument();
  });
});
