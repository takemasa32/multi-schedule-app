// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AvailabilitySummary from "../availability-summary";

// 回答集計表示コンポーネントのテスト雛形

describe("AvailabilitySummary", () => {
  const eventDates = [
    {
      id: "date1",
      start_time: "2025-05-10 19:00:00",
      end_time: "2025-05-10 20:00:00",
      label: "午前枠",
    },
    {
      id: "date2",
      start_time: "2025-05-12 00:00:00",
      end_time: "2025-05-12 01:00:00",
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
    // 日付の表示（1つ目は5/10、2つ目は5/11で検証）
    expect(
      screen.queryAllByText((content) =>
        /10日|5\/10|5月10日|5\/10\(.+\)|5\/10\(.*?\)/.test(content)
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryAllByText((content) =>
        /12日|5\/12|5月12日|5\/12\(.+\)|5\/12\(.*?\)/.test(content)
      ).length
    ).toBeGreaterThan(0);
    // ラベル（午前枠/午後枠）がどこかに含まれている
    expect(screen.queryAllByText(/午前枠/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/午後枠/).length).toBeGreaterThan(0);
    // 時間（19:00, 20:00, 0:00, 1:00 など）は部分一致で検証
    expect(
      screen.getAllByText(
        (content) =>
          content.includes("19:00") ||
          content.includes("20:00") ||
          content.includes("0:00") ||
          content.includes("1:00")
      ).length
    ).toBeGreaterThan(0);
    // ○人数/×人数（2 / 1 などの組み合わせで検証）
    expect(screen.getByTestId("available-count-date1")).toHaveTextContent("2");
    expect(screen.getByTestId("unavailable-count-date1")).toHaveTextContent(
      "1"
    );
    expect(screen.getByTestId("available-count-date2")).toHaveTextContent("2");
    expect(screen.getByTestId("unavailable-count-date2")).toHaveTextContent(
      "1"
    );
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
    // セルの○人数がどこかに表示されていること
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    // 不可人数は括弧付き(1)で表示されるのでそれで検証
    expect(screen.getAllByText("(1)").length).toBeGreaterThan(0);
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
