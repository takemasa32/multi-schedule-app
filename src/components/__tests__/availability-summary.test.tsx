import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AvailabilitySummary from "../availability-summary";

// 回答集計表示コンポーネントのテスト雛形

describe("AvailabilitySummary", () => {
  const eventDates = [
    {
      id: "date1",
      start_time: "2025-05-10T10:00:00.000Z",
      end_time: "2025-05-10T11:00:00.000Z",
      label: "午前枠",
    },
    {
      id: "date2",
      start_time: "2025-05-11T15:00:00.000Z",
      end_time: "2025-05-11T16:00:00.000Z",
      label: "午後枠",
    },
  ];
  const participants = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
    { id: "p3", name: "Charlie" },
  ];
  const availabilities = [
    { participant_id: "p1", event_date_id: "date1", availability: true },
    { participant_id: "p2", event_date_id: "date1", availability: false },
    { participant_id: "p3", event_date_id: "date1", availability: true },
    { participant_id: "p1", event_date_id: "date2", availability: false },
    { participant_id: "p2", event_date_id: "date2", availability: true },
    { participant_id: "p3", event_date_id: "date2", availability: true },
  ];
  const defaultProps = {
    eventDates,
    participants,
    availabilities,
    viewMode: "list" as const,
    setViewMode: jest.fn(),
  };

  it("日程ごとの○人数/×人数が正しく表示される（リスト表示）", () => {
    render(<AvailabilitySummary {...defaultProps} viewMode="list" />);
    expect(screen.getByText(/午前枠/)).toBeInTheDocument();
    expect(screen.getByText(/午後枠/)).toBeInTheDocument();
    // ○人数/×人数
    expect(screen.getByText(/2人/)).toBeInTheDocument(); // 午前枠○2人
    expect(screen.getByText(/1人/)).toBeInTheDocument(); // 午前枠×1人
  });

  it("参加者ごとの回答マトリクスが正しく描画される（個別表示）", () => {
    render(<AvailabilitySummary {...defaultProps} viewMode="detailed" />);
    // 参加者名
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    // ○×マーク
    expect(screen.getAllByText("○").length).toBeGreaterThan(0);
    expect(screen.getAllByText("×").length).toBeGreaterThan(0);
  });

  it("ヒートマップ表示でセルが正しく描画される", () => {
    render(<AvailabilitySummary {...defaultProps} viewMode="heatmap" />);
    // セルの○×人数がどこかに表示されていること
    expect(screen.getByText(/午前枠/)).toBeInTheDocument();
    expect(screen.getByText(/午後枠/)).toBeInTheDocument();
  });

  it("参加者がいない場合はメッセージを表示する", () => {
    render(
      <AvailabilitySummary
        {...defaultProps}
        participants={[]}
        availabilities={[]}
      />
    );
    expect(screen.getByText(/表示中の参加者はいません/)).toBeInTheDocument();
  });

  it("タブ切り替えで各ビューが切り替わる", () => {
    const setViewMode = jest.fn();
    render(
      <AvailabilitySummary
        {...defaultProps}
        setViewMode={setViewMode}
        viewMode="list"
      />
    );
    fireEvent.click(screen.getByText("ヒートマップ表示"));
    expect(setViewMode).toHaveBeenCalledWith("heatmap");
    fireEvent.click(screen.getByText("個別表示"));
    expect(setViewMode).toHaveBeenCalledWith("detailed");
    fireEvent.click(screen.getByText("リスト表示"));
    expect(setViewMode).toHaveBeenCalledWith("list");
  });
});
