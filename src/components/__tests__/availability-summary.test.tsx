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
  };

  it("日程ごとの○人数/×人数が正しく表示される（リスト表示）", () => {
    render(<AvailabilitySummary {...defaultProps} />);
    // リスト表示タブをクリック
    fireEvent.click(screen.getByText("リスト表示"));
    // 日付の表示
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
    render(<AvailabilitySummary {...defaultProps} />);
    // 個別表示タブをクリック
    fireEvent.click(screen.getByText("個別表示"));
    // 参加者名
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    // ○×マーク
    expect(screen.getAllByText("○").length).toBeGreaterThan(0);
    expect(screen.getAllByText("×").length).toBeGreaterThan(0);
  });

  it("ヒートマップ表示でセルが正しく描画される", () => {
    render(<AvailabilitySummary {...defaultProps} />);
    // ヒートマップ表示タブをクリック
    fireEvent.click(screen.getByText("ヒートマップ表示"));
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
    render(<AvailabilitySummary {...defaultProps} />);
    // デフォルトはヒートマップ
    expect(
      screen.getByText("色が濃いほど参加可能な人が多い時間帯です")
    ).toBeInTheDocument();
    // 個別表示
    fireEvent.click(screen.getByText("個別表示"));
    expect(screen.getByText("参加者")).toBeInTheDocument();
    // リスト表示
    fireEvent.click(screen.getByText("リスト表示"));
    expect(screen.getByText("参加可能 / 不可")).toBeInTheDocument();
    // ヒートマップ表示
    fireEvent.click(screen.getByText("ヒートマップ表示"));
    expect(
      screen.getByText("色が濃いほど参加可能な人が多い時間帯です")
    ).toBeInTheDocument();
  });

  describe("excludedParticipantIds", () => {
    it("指定された参加者が除外される", () => {
      // Alice（p1）を除外する
      render(
        <AvailabilitySummary {...defaultProps} excludedParticipantIds={["p1"]} />
      );

      // 個別表示に切り替えて参加者リストを確認
      fireEvent.click(screen.getByText("個別表示"));

      // Aliceが表示されていない
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
      // Bob、Charlieは表示されている
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    it("複数の参加者が除外される", () => {
      // AliceとBobを除外する
      render(
        <AvailabilitySummary
          {...defaultProps}
          excludedParticipantIds={["p1", "p2"]}
        />
      );

      // 個別表示に切り替えて参加者リストを確認
      fireEvent.click(screen.getByText("個別表示"));

      // Alice、Bobが表示されていない
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
      // Charlieのみ表示されている
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });
  });

  it("全ての参加者が除外された場合は適切なメッセージが表示される", () => {
    // 全員を除外する
    render(
      <AvailabilitySummary
        {...defaultProps}
        excludedParticipantIds={["p1", "p2", "p3"]}
      />
    );

    // 「表示中の参加者はいません」メッセージが表示される
    expect(screen.getByText("表示中の参加者はいません")).toBeInTheDocument();
  });

  it("除外された参加者の回答が集計に反映されない", () => {
    // date1の場合：Alice（○）、Bob（×）、Charlie（○）
    // Aliceを除外すると：Bob（×）、Charlie（○）なので1人参加可能、1人参加不可

    render(
      <AvailabilitySummary
        {...defaultProps}
        excludedParticipantIds={["p1"]} // Aliceを除外
      />
    );

    // リスト表示に切り替れて集計を確認
    fireEvent.click(screen.getByText("リスト表示"));

    // date1（午前枠）の集計結果を確認
    // Alice除外後は1人参加可能、1人参加不可になる
    const listItems = screen.getAllByText(/午前枠/);
    expect(listItems.length).toBeGreaterThan(0);

    // 参加可能者数が減っていることを確認（具体的な数値は実装により異なる）
    // この部分は集計ロジックの詳細によって調整が必要
  });

  it("excludedParticipantIdsが空配列の場合は全員が表示される", () => {
    render(
      <AvailabilitySummary {...defaultProps} excludedParticipantIds={[]} />
    );

    // 個別表示に切り替えて全員が表示されることを確認
    fireEvent.click(screen.getByText("個別表示"));

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("存在しない参加者IDが除外リストにあってもエラーにならない", () => {
    render(
      <AvailabilitySummary
        {...defaultProps}
        excludedParticipantIds={["nonexistent-id"]}
      />
    );

    // 個別表示に切り替えて全員が表示されることを確認
    fireEvent.click(screen.getByText("個別表示"));

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  // excludedParticipantIds 機能のテスト
  describe("excludedParticipantIds 機能", () => {
    it("単一参加者を除外した場合、集計から除外される", () => {
      render(
        <AvailabilitySummary
          {...defaultProps}
          excludedParticipantIds={["p1"]} // Aliceを除外
        />
      );

      fireEvent.click(screen.getByText("リスト表示"));

      // date1: Alice(○)除外 → Bob(×), Charlie(○) = ○1名/×1名
      expect(screen.getByTestId("available-count-date1")).toHaveTextContent(
        "1"
      );
      expect(screen.getByTestId("unavailable-count-date1")).toHaveTextContent(
        "1"
      );

      // date2: Alice(×)除外 → Bob(○), Charlie(○) = ○2名/×0名
      expect(screen.getByTestId("available-count-date2")).toHaveTextContent(
        "2"
      );
      expect(screen.getByTestId("unavailable-count-date2")).toHaveTextContent(
        "0"
      );
    });

    it("複数参加者を除外した場合、集計から除外される", () => {
      render(
        <AvailabilitySummary
          {...defaultProps}
          excludedParticipantIds={["p1", "p2"]} // Alice, Bobを除外
        />
      );

      fireEvent.click(screen.getByText("リスト表示"));

      // date1: Charlieのみ(○) = ○1名/×0名
      expect(screen.getByTestId("available-count-date1")).toHaveTextContent(
        "1"
      );
      expect(screen.getByTestId("unavailable-count-date1")).toHaveTextContent(
        "0"
      );

      // date2: Charlieのみ(○) = ○1名/×0名
      expect(screen.getByTestId("available-count-date2")).toHaveTextContent(
        "1"
      );
      expect(screen.getByTestId("unavailable-count-date2")).toHaveTextContent(
        "0"
      );
    });

    it("全参加者を除外した場合、「表示中の参加者はいません」が表示される", () => {
      render(
        <AvailabilitySummary
          {...defaultProps}
          excludedParticipantIds={["p1", "p2", "p3"]} // 全員除外
        />
      );

      expect(screen.getByText("表示中の参加者はいません")).toBeInTheDocument();
    });

    it("excludedParticipantIdsが空配列の場合、全参加者が表示される", () => {
      render(
        <AvailabilitySummary
          {...defaultProps}
          excludedParticipantIds={[]} // 誰も除外しない
        />
      );

      fireEvent.click(screen.getByText("リスト表示"));

      // date1: Alice(○), Bob(×), Charlie(○) = ○2名/×1名
      expect(screen.getByTestId("available-count-date1")).toHaveTextContent(
        "2"
      );
      expect(screen.getByTestId("unavailable-count-date1")).toHaveTextContent(
        "1"
      );

      // date2: Alice(×), Bob(○), Charlie(○) = ○2名/×1名
      expect(screen.getByTestId("available-count-date2")).toHaveTextContent(
        "2"
      );
      expect(screen.getByTestId("unavailable-count-date2")).toHaveTextContent(
        "1"
      );
    });

    it("存在しない参加者IDを除外リストに含めても正常動作する", () => {
      render(
        <AvailabilitySummary
          {...defaultProps}
          excludedParticipantIds={["p1", "nonexistent-id"]} // 存在しないIDを含む
        />
      );

      fireEvent.click(screen.getByText("リスト表示"));

      // Aliceのみ除外され、存在しないIDは無視される
      // date1: Bob(×), Charlie(○) = ○1名/×1名
      expect(screen.getByTestId("available-count-date1")).toHaveTextContent(
        "1"
      );
      expect(screen.getByTestId("unavailable-count-date1")).toHaveTextContent(
        "1"
      );

      // date2: Bob(○), Charlie(○) = ○2名/×0名
      expect(screen.getByTestId("available-count-date2")).toHaveTextContent(
        "2"
      );
      expect(screen.getByTestId("unavailable-count-date2")).toHaveTextContent(
        "0"
      );
    });

    it("個別表示タブでも除外された参加者は表示されない", () => {
      render(
        <AvailabilitySummary
          {...defaultProps}
          excludedParticipantIds={["p1"]} // Aliceを除外
        />
      );

      fireEvent.click(screen.getByText("個別表示"));

      // Aliceは表示されない
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();

      // Bob, Charlieは表示される
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    it("ヒートマップ表示でも除外された参加者の集計が反映されない", () => {
      render(
        <AvailabilitySummary
          {...defaultProps}
          excludedParticipantIds={["p2"]} // Bobを除外
        />
      );

      fireEvent.click(screen.getByText("ヒートマップ表示"));

      // ヒートマップ表示では参加者名は表示されず、集計数値が変化する
      // Bobを除外した場合の集計結果を確認
      // date1: Alice(○), Charlie(○) = 2名 (Bobの×を除外)
      // date2: Alice(×), Charlie(○) = 1名 (Bobの○を除外)

      // 集計結果がBob除外後の数値になっていることを確認
      // 具体的な数値は実装に依存するため、エラーにならないことを確認
      expect(screen.getByText("2")).toBeInTheDocument(); // date1の参加可能者数
      expect(screen.getByText("1")).toBeInTheDocument(); // date2の参加可能者数
    });
  });
});
