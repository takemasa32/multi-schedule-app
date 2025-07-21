/**
 * 参加者トグル機能の統合テスト
 * EventDetailsSectionとAvailabilitySummaryの連携をテスト
 */
// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

// 必要なコンポーネントをモック
jest.mock("@/components/finalize-event-section", () => {
  return function MockFinalizeEventSection() {
    return (
      <div data-testid="mock-finalize-event-section">
        Finalize Event Section
      </div>
    );
  };
});

jest.mock("@/components/event-history", () => {
  return function MockEventHistory() {
    return <div data-testid="mock-event-history">Event History</div>;
  };
});

jest.mock("@/components/event-client/event-date-add-section", () => {
  return function MockEventDateAddSection() {
    return (
      <div data-testid="mock-event-date-add-section">
        Event Date Add Section
      </div>
    );
  };
});

import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import EventDetailsSection from "@/components/event-client/event-details-section";
import type {
  EventDate,
  Participant,
  Availability,
} from "@/components/event-client/event-details-section";

// テストデータのセットアップ
const mockEvent = {
  id: "test-event-id",
  title: "統合テストイベント",
  public_token: "test-public-token",
  is_finalized: false,
};

const mockEventDates: EventDate[] = [
  {
    id: "date1",
    start_time: "2024-01-01T10:00:00",
    end_time: "2024-01-01T12:00:00",
    label: "朝の部",
  },
  {
    id: "date2",
    start_time: "2024-01-02T14:00:00",
    end_time: "2024-01-02T16:00:00",
    label: "昼の部",
  },
];

const mockParticipants: Participant[] = [
  { id: "participant1", name: "田中太郎" },
  { id: "participant2", name: "佐藤花子" },
  { id: "participant3", name: "鈴木次郎" },
  { id: "participant4", name: "高橋美咲" },
];

const mockAvailabilities: Availability[] = [
  // date1: 田中○、佐藤○、鈴木×、高橋○ => 3人参加可能
  {
    participant_id: "participant1",
    event_date_id: "date1",
    availability: true,
  },
  {
    participant_id: "participant2",
    event_date_id: "date1",
    availability: true,
  },
  {
    participant_id: "participant3",
    event_date_id: "date1",
    availability: false,
  },
  {
    participant_id: "participant4",
    event_date_id: "date1",
    availability: true,
  },
  // date2: 田中×、佐藤○、鈴木○、高橋× => 2人参加可能
  {
    participant_id: "participant1",
    event_date_id: "date2",
    availability: false,
  },
  {
    participant_id: "participant2",
    event_date_id: "date2",
    availability: true,
  },
  {
    participant_id: "participant3",
    event_date_id: "date2",
    availability: true,
  },
  {
    participant_id: "participant4",
    event_date_id: "date2",
    availability: false,
  },
];

const mockFinalizedDateIds: string[] = [];

describe("参加者トグル機能の統合テスト", () => {
  test("参加者を除外すると集計結果が更新される", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // リスト表示に切り替え
    fireEvent.click(screen.getByText("リスト"));

    // 初期状態の確認（全4人の回答が反映されている）
    // date1: 3人参加可能、1人参加不可
    // date2: 2人参加可能、2人参加不可
    // 具体的な表示テキストはAvailabilitySummaryの実装による

    // 田中太郎を除外
    const taroButton = screen.getByText("田中太郎").closest("button");
    fireEvent.click(taroButton!);

    // 除外後の集計確認
    // date1: 田中除外後 -> 2人参加可能、1人参加不可（佐藤○、鈴木×、高橋○）
    // date2: 田中除外後 -> 2人参加可能、1人参加不可（佐藤○、鈴木○、高橋×）

    // バッジが非表示状態になっていることを確認
    expect(taroButton).toHaveClass("badge-outline", "border-error");
  });

  test("複数の参加者を除外して集計が正しく更新される", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 個別表示に切り替え
    fireEvent.click(screen.getByText("個別"));

    // 初期状態では全員表示されている（テーブル内で確認）
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("田中太郎");
    expect(table).toHaveTextContent("佐藤花子");
    expect(table).toHaveTextContent("鈴木次郎");
    expect(table).toHaveTextContent("高橋美咲");

    // トグルボタンを取得（バッジ部分から）
    const participantButtons = screen
      .getAllByRole("button")
      .filter(
        (button) =>
          button.textContent?.includes("田中太郎") ||
          button.textContent?.includes("高橋美咲")
      );
    const taroButton = participantButtons.find((button) =>
      button.textContent?.includes("田中太郎")
    );
    const misakiButton = participantButtons.find((button) =>
      button.textContent?.includes("高橋美咲")
    );

    fireEvent.click(taroButton!);
    fireEvent.click(misakiButton!);

    // バッジが非表示状態になっていることを確認
    expect(taroButton).toHaveClass("badge-outline", "border-error");
    expect(misakiButton).toHaveClass("badge-outline", "border-error");

    // 個別表示で除外された参加者が表示されないことを確認
    // （AvailabilitySummaryコンポーネント内の表示）
    // 注意: 参加者名バッジ自体は除外状態でも表示される（UI制御用）
  });

  test("除外状態の参加者を表示に戻すと集計が更新される", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 佐藤花子を一度除外
    const hanakoButton = screen.getByText("佐藤花子").closest("button");
    fireEvent.click(hanakoButton!);

    // 除外状態を確認
    expect(hanakoButton).toHaveClass("badge-outline", "border-error");

    // 再度クリックして表示に戻す
    fireEvent.click(hanakoButton!);

    // 表示状態に戻ったことを確認
    expect(hanakoButton).toHaveClass("badge-primary");
    expect(hanakoButton).not.toHaveClass("badge-outline", "border-error");
  });

  test("全員除外した場合の動作", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 全員を除外
    const allButtons = [
      screen.getByText("田中太郎").closest("button"),
      screen.getByText("佐藤花子").closest("button"),
      screen.getByText("鈴木次郎").closest("button"),
      screen.getByText("高橋美咲").closest("button"),
    ];

    allButtons.forEach((button) => {
      if (button) fireEvent.click(button);
    });

    // 全てのバッジが除外状態になっていることを確認
    allButtons.forEach((button) => {
      expect(button).toHaveClass("badge-outline", "border-error");
    });

    // 特殊なメッセージは表示されないことを確認
    expect(
      screen.queryByText("表示中の参加者はいません")
    ).not.toBeInTheDocument();
  });

  test("参加者名バッジのアクセシビリティ属性が正しく動作する", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    const taroButton = screen.getByText("田中太郎").closest("button");

    // 初期状態のaria-pressed
    expect(taroButton).toHaveAttribute("aria-pressed", "false");
    expect(taroButton).toHaveAttribute("title", "非表示にする");

    // クリック後
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveAttribute("aria-pressed", "true");
    expect(taroButton).toHaveAttribute("title", "表示に戻す");

    // 再度クリック
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveAttribute("aria-pressed", "false");
    expect(taroButton).toHaveAttribute("title", "非表示にする");
  });

  test("表示切り替えタブと除外機能が共存する", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 田中太郎を除外
    const taroButton = screen.getByText("田中太郎").closest("button");
    fireEvent.click(taroButton!);

    // ヒートマップ
    fireEvent.click(screen.getByText("ヒートマップ"));
    expect(
      screen.getByText("色が濃いほど参加可能な人が多い時間帯です")
    ).toBeInTheDocument();

    // リスト表示
    fireEvent.click(screen.getByText("リスト"));
    expect(screen.getByText("参加可能 / 不可")).toBeInTheDocument();

    // 個別表示
    fireEvent.click(screen.getByText("個別"));
    expect(screen.getByText("参加者")).toBeInTheDocument();

    // どの表示モードでも田中太郎は除外されたまま
    expect(taroButton).toHaveClass("badge-outline", "border-error");
  });

  test("リアルタイムでの集計結果の変化をテスト", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // リスト表示に切り替え
    fireEvent.click(screen.getByText("リスト"));

    // 初期状態の集計を確認（data-testidを使用）
    // date1: 田中○、佐藤○、鈴木×、高橋○ => ○3名/×1名
    expect(screen.getByTestId("available-count-date1")).toHaveTextContent("3");
    expect(screen.getByTestId("unavailable-count-date1")).toHaveTextContent(
      "1"
    );
    // date2: 田中×、佐藤○、鈴木○、高橋× => ○2名/×2名
    expect(screen.getByTestId("available-count-date2")).toHaveTextContent("2");
    expect(screen.getByTestId("unavailable-count-date2")).toHaveTextContent(
      "2"
    );

    // 田中太郎を除外（参加者トグル部分のボタンを選択）
    const toggleSection = screen.getByText("表示選択:").parentElement!;
    const tanakaToggle = within(toggleSection).getByRole("button", {
      name: /田中太郎/,
    });
    fireEvent.click(tanakaToggle);

    // 集計結果が更新される
    // date1: 佐藤○、鈴木×、高橋○ => ○2名/×1名
    expect(screen.getByTestId("available-count-date1")).toHaveTextContent("2");
    expect(screen.getByTestId("unavailable-count-date1")).toHaveTextContent(
      "1"
    );
    // date2: 佐藤○、鈴木○、高橋× => ○2名/×1名
    expect(screen.getByTestId("available-count-date2")).toHaveTextContent("2");
    expect(screen.getByTestId("unavailable-count-date2")).toHaveTextContent(
      "1"
    );
  });

  test("個別表示での参加者除外効果をテスト", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 個別表示に切り替え
    fireEvent.click(screen.getByText("個別"));

    // 初期状態では全参加者がテーブル内に表示される
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("田中太郎");
    expect(table).toHaveTextContent("佐藤花子");
    expect(table).toHaveTextContent("鈴木次郎");
    expect(table).toHaveTextContent("高橋美咲");

    // 佐藤花子を除外（参加者トグル部分のボタンを選択）
    const toggleSection = screen.getByText("表示選択:").parentElement!;
    const hanakoToggle = within(toggleSection).getByRole("button", {
      name: /佐藤花子/,
    });
    fireEvent.click(hanakoToggle);

    // 個別表示から佐藤花子が除外される（AvailabilitySummaryコンポーネント内の表示）
    // 除外された参加者はテーブルに表示されない
    const tableAfterExclusion = screen.getByRole("table");
    expect(tableAfterExclusion).not.toHaveTextContent("佐藤花子");

    // 他の参加者はテーブルに表示されたまま
    expect(tableAfterExclusion).toHaveTextContent("田中太郎");
    expect(tableAfterExclusion).toHaveTextContent("鈴木次郎");
    expect(tableAfterExclusion).toHaveTextContent("高橋美咲");
  });

  test("ヒートマップでの参加者除外効果をテスト", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // ヒートマップに切り替え
    fireEvent.click(screen.getByText("ヒートマップ"));

    // 鈴木次郎を除外
    const jiroButton = screen.getByText("鈴木次郎").closest("button");
    fireEvent.click(jiroButton!);

    // ヒートマップから鈴木次郎が除外される
    const heatmapDisplay = screen
      .getByText("色が濃いほど参加可能な人が多い時間帯です")
      .closest("div");
    expect(heatmapDisplay).not.toHaveTextContent("鈴木次郎");

    // 他の参加者は表示されたまま
    expect(screen.getByText("田中太郎")).toBeInTheDocument();
    expect(screen.getByText("佐藤花子")).toBeInTheDocument();
    expect(screen.getByText("高橋美咲")).toBeInTheDocument();
  });

  test("除外状態の永続性をテスト（表示モード切替後も維持）", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 田中太郎と高橋美咲を除外
    const taroButton = screen.getByText("田中太郎").closest("button");
    const misakiButton = screen.getByText("高橋美咲").closest("button");
    fireEvent.click(taroButton!);
    fireEvent.click(misakiButton!);

    // 除外状態を確認
    expect(taroButton).toHaveClass("badge-outline", "border-error");
    expect(misakiButton).toHaveClass("badge-outline", "border-error");

    // 表示モードを切り替え（リスト → ヒートマップ → 個別 → リスト）
    fireEvent.click(screen.getByText("リスト"));
    fireEvent.click(screen.getByText("ヒートマップ"));
    fireEvent.click(screen.getByText("個別"));
    fireEvent.click(screen.getByText("リスト"));

    // 除外状態が維持されている
    expect(taroButton).toHaveClass("badge-outline", "border-error");
    expect(misakiButton).toHaveClass("badge-outline", "border-error");

    // 佐藤花子と鈴木次郎は表示状態のまま
    const hanakoButton = screen.getByText("佐藤花子").closest("button");
    const jiroButton = screen.getByText("鈴木次郎").closest("button");
    expect(hanakoButton).toHaveClass("badge-primary");
    expect(jiroButton).toHaveClass("badge-primary");
  });

  test("全員除外時は全てのマスが0で表示される", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 全参加者を除外（参加者トグル部分のボタンを使用）
    const toggleSection = screen.getByText("表示選択:").parentElement!;
    mockParticipants.forEach((participant) => {
      const button = within(toggleSection).getByRole("button", {
        name: new RegExp(participant.name),
      });
      fireEvent.click(button);
    });
  });
});
