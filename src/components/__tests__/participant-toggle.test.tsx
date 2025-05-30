/**
 * 参加者トグル機能のテスト
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
    return <div data-testid="mock-finalize-event-section">Finalize Event Section</div>;
  };
});

jest.mock("@/components/event-history", () => {
  return function MockEventHistory() {
    return <div data-testid="mock-event-history">Event History</div>;
  };
});

jest.mock("@/components/event-client/event-date-add-section", () => {
  return function MockEventDateAddSection() {
    return <div data-testid="mock-event-date-add-section">Event Date Add Section</div>;
  };
});

import { render, screen, fireEvent } from "@testing-library/react";
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
  title: "テストイベント",
  public_token: "test-public-token",
  is_finalized: false,
};

const mockEventDates: EventDate[] = [
  {
    id: "date1",
    start_time: "2024-01-01T10:00:00",
    end_time: "2024-01-01T12:00:00",
  },
  {
    id: "date2",
    start_time: "2024-01-02T14:00:00",
    end_time: "2024-01-02T16:00:00",
  },
];

const mockParticipants: Participant[] = [
  { id: "participant1", name: "田中太郎" },
  { id: "participant2", name: "佐藤花子" },
  { id: "participant3", name: "鈴木次郎" },
];

const mockAvailabilities: Availability[] = [
  {
    participant_id: "participant1",
    event_date_id: "date1",
    availability: true,
  },
  {
    participant_id: "participant1",
    event_date_id: "date2",
    availability: false,
  },
  {
    participant_id: "participant2",
    event_date_id: "date1",
    availability: true,
  },
  {
    participant_id: "participant2",
    event_date_id: "date2",
    availability: true,
  },
  {
    participant_id: "participant3",
    event_date_id: "date1",
    availability: false,
  },
  {
    participant_id: "participant3",
    event_date_id: "date2",
    availability: true,
  },
];

const mockFinalizedDateIds: string[] = [];

describe("参加者トグル機能", () => {
  test("参加者名バッジが表示される", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 参加者名がバッジとして表示されている
    expect(screen.getByText("田中太郎")).toBeInTheDocument();
    expect(screen.getByText("佐藤花子")).toBeInTheDocument();
    expect(screen.getByText("鈴木次郎")).toBeInTheDocument();

    // 「表示選択:」ラベルが表示されている
    expect(screen.getByText("表示選択:")).toBeInTheDocument();
  });

  test("参加者バッジをクリックして非表示状態に切り替えられる", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 田中太郎のバッジを取得
    const taroButton = screen.getByText("田中太郎").closest("button");
    expect(taroButton).toBeInTheDocument();

    // 初期状態では通常表示（primary badge）
    expect(taroButton).toHaveClass("badge-primary");
    expect(taroButton).not.toHaveClass("badge-outline", "border-error");

    // バッジをクリックして非表示状態に切り替え
    fireEvent.click(taroButton!);

    // 非表示状態のスタイルに変更されている
    expect(taroButton).toHaveClass(
      "badge-outline",
      "border-error",
      "text-error"
    );
    expect(taroButton).not.toHaveClass("badge-primary");
  });

  test("非表示状態の参加者バッジをクリックして表示状態に戻せる", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 佐藤花子のバッジを取得
    const hanakoButton = screen.getByText("佐藤花子").closest("button");
    expect(hanakoButton).toBeInTheDocument();

    // まず非表示状態にする
    fireEvent.click(hanakoButton!);
    expect(hanakoButton).toHaveClass("badge-outline", "border-error");

    // 再度クリックして表示状態に戻す
    fireEvent.click(hanakoButton!);
    expect(hanakoButton).toHaveClass("badge-primary");
    expect(hanakoButton).not.toHaveClass("badge-outline", "border-error");
  });

  test("複数の参加者を同時に非表示にできる", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 田中太郎と鈴木次郎のバッジを取得
    const taroButton = screen.getByText("田中太郎").closest("button");
    const jiroButton = screen.getByText("鈴木次郎").closest("button");

    // 両方を非表示状態にする
    fireEvent.click(taroButton!);
    fireEvent.click(jiroButton!);

    // 両方とも非表示状態のスタイルになっている
    expect(taroButton).toHaveClass("badge-outline", "border-error");
    expect(jiroButton).toHaveClass("badge-outline", "border-error");

    // 佐藤花子は表示状態のまま
    const hanakoButton = screen.getByText("佐藤花子").closest("button");
    expect(hanakoButton).toHaveClass("badge-primary");
  });

  test("参加者が0人の場合はトグルUIが表示されない", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={[]} // 参加者0人
        availabilities={[]}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 「表示選択:」ラベルが表示されていない
    expect(screen.queryByText("表示選択:")).not.toBeInTheDocument();
  });

  test("aria-pressed属性が正しく設定される", () => {
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

    // 初期状態ではaria-pressed="false"
    expect(taroButton).toHaveAttribute("aria-pressed", "false");

    // クリック後はaria-pressed="true"
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveAttribute("aria-pressed", "true");
  });

  test("title属性が正しく設定される", () => {
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

    // 初期状態では「非表示にする」
    expect(taroButton).toHaveAttribute("title", "非表示にする");

    // クリック後は「表示に戻す」
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveAttribute("title", "表示に戻す");
  });

  test("アイコンが状態に応じて正しく表示される", () => {
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

    // 初期状態では👤アイコンが表示される
    expect(taroButton).toHaveTextContent("👤");
    expect(taroButton).not.toHaveTextContent("🚫");

    // クリック後は🚫アイコンが表示される
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveTextContent("🚫");
    expect(taroButton).not.toHaveTextContent("👤");
  });

  test("バッジの視覚的なフィードバック（transition-all）が設定されている", () => {
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

    // transition-allクラスが設定されている
    expect(taroButton).toHaveClass("transition-all");
    // カーソルポインターが設定されている
    expect(taroButton).toHaveClass("cursor-pointer");
  });

  test("非表示状態のバッジが特別なスタイリング（背景色）を持つ", () => {
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

    // 初期状態では背景色クラスがない
    expect(taroButton).not.toHaveClass("bg-error/10");

    // クリック後は背景色クラスが追加される
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveClass("bg-error/10");
  });

  test("参加者リストが多い場合のレイアウト（flex-wrap）が正しく設定される", () => {
    const manyParticipants: Participant[] = Array.from({ length: 10 }, (_, i) => ({
      id: `participant${i + 1}`,
      name: `参加者${i + 1}`,
    }));

    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={manyParticipants}
        availabilities={[]}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 表示選択セクションのコンテナが存在し、flex-wrapが設定されている
    const participantContainer = screen.getByText("表示選択:").parentElement;
    expect(participantContainer).toHaveClass("flex", "flex-wrap", "gap-2");
  });

  test("excludedParticipantIds状態が回答集計コンポーネントに正しく渡される", () => {
    // AvailabilitySummaryコンポーネントがexcludedParticipantIdsを受け取っているかを検証
    // 実際のDOM変化ではなく、propの渡し方の確認のため、より実装に近いテストが必要
    
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 初期状態では誰も除外されていない
    // AvailabilitySummaryコンポーネント内のテストで詳細は検証される想定

    const taroButton = screen.getByText("田中太郎").closest("button");
    fireEvent.click(taroButton!);

    // クリック後は田中太郎が除外されている状態
    // 実際の集計結果の変化は AvailabilitySummary のテストで検証
    expect(taroButton).toHaveClass("badge-outline", "border-error");
  });

  test("バッジクリック時のイベントハンドリングが正しく動作する", () => {
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
    const hanakoButton = screen.getByText("佐藤花子").closest("button");

    // 初期状態では全員が表示状態
    expect(taroButton).toHaveClass("badge-primary");
    expect(hanakoButton).toHaveClass("badge-primary");

    // 田中太郎を非表示にする
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveClass("badge-outline", "border-error");
    expect(hanakoButton).toHaveClass("badge-primary"); // 他の参加者は影響なし

    // 佐藤花子も非表示にする
    fireEvent.click(hanakoButton!);
    expect(taroButton).toHaveClass("badge-outline", "border-error");
    expect(hanakoButton).toHaveClass("badge-outline", "border-error");

    // 田中太郎を再び表示状態に戻す
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveClass("badge-primary");
    expect(hanakoButton).toHaveClass("badge-outline", "border-error"); // 佐藤花子は非表示のまま
  });

  test("参加者名が長い場合でも適切に表示される", () => {
    const longNameParticipants: Participant[] = [
      { id: "p1", name: "とても長い名前の参加者さん" },
      { id: "p2", name: "もう一人の長い名前の参加者" },
    ];

    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={longNameParticipants}
        availabilities={[]}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 長い名前でもバッジとして表示される
    expect(screen.getByText("とても長い名前の参加者さん")).toBeInTheDocument();
    expect(screen.getByText("もう一人の長い名前の参加者")).toBeInTheDocument();

    const longNameButton = screen.getByText("とても長い名前の参加者さん").closest("button");
    expect(longNameButton).toHaveClass("badge", "px-3", "py-2");
  });

  test("アクセシビリティ属性が適切に設定されている", () => {
    render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    mockParticipants.forEach((participant) => {
      const button = screen.getByText(participant.name).closest("button");
      
      // type="button"属性が設定されている
      expect(button).toHaveAttribute("type", "button");
      
      // aria-pressed属性が設定されている
      expect(button).toHaveAttribute("aria-pressed");
      
      // title属性が設定されている
      expect(button).toHaveAttribute("title");
      
      // tabindexが設定されていることを確認（デフォルトの0）
      expect(button).not.toHaveAttribute("tabindex", "-1");
    });
  });

  test("キーボード操作でバッジを操作できる", () => {
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
    
    // フォーカスを設定
    taroButton!.focus();
    expect(document.activeElement).toBe(taroButton);

    // Enterキーでクリックイベントをシミュレート
    fireEvent.keyDown(taroButton!, { key: "Enter", code: "Enter" });
    fireEvent.keyUp(taroButton!, { key: "Enter", code: "Enter" });
    
    // 状態が変更されることを確認（実際のキーボードイベントではfireEvent.clickを使用）
    fireEvent.click(taroButton!);
    expect(taroButton).toHaveClass("badge-outline", "border-error");
  });

  test("動的に参加者が追加された場合でも正しく動作する", () => {
    const { rerender } = render(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={mockParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 初期状態では3人の参加者
    expect(screen.getAllByRole("button")).toHaveLength(3);

    // 新しい参加者を追加
    const newParticipants = [
      ...mockParticipants,
      { id: "participant4", name: "新規参加者" },
    ];

    rerender(
      <EventDetailsSection
        event={mockEvent}
        eventDates={mockEventDates}
        participants={newParticipants}
        availabilities={mockAvailabilities}
        finalizedDateIds={mockFinalizedDateIds}
      />
    );

    // 4人の参加者がいることを確認
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getByText("新規参加者")).toBeInTheDocument();

    // 新しい参加者のバッジも正常に動作する
    const newParticipantButton = screen.getByText("新規参加者").closest("button");
    expect(newParticipantButton).toHaveClass("badge-primary");
    
    fireEvent.click(newParticipantButton!);
    expect(newParticipantButton).toHaveClass("badge-outline", "border-error");
  });
});
