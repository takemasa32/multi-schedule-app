// --- JSDOMのrequestSubmit未実装対策（テスト安定化のため最上部で必ず定義）
if (!window.HTMLFormElement.prototype.requestSubmit) {
  window.HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AvailabilityForm from "../availability-form";

jest.mock("@/app/actions", () => ({
  submitAvailability: jest.fn(),
}));
import { submitAvailability } from "@/app/actions";

// fetchのグローバルモック
beforeAll(() => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ json: async () => ({ exists: false }) });
  // window.location.hrefのモック
  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "" },
  });
});

afterAll(() => {
  // fetch, locationのモックをリセット
  // @ts-expect-error テスト用リセット
  global.fetch = undefined;
  // @ts-expect-error テスト用リセット
  delete window.location;
});

describe("AvailabilityForm", () => {
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
  const defaultProps = {
    eventId: "event1",
    publicToken: "token1",
    eventDates,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("名前未入力時はバリデーションエラーを表示する", async () => {
    render(<AvailabilityForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole("button", { name: /回答を送信/ }));
    const alert = await screen.findByRole("alert");
    await waitFor(() => {
      expect(alert).toHaveTextContent("お名前を入力してください");
    });
  });

  it("利用規約未同意時はバリデーションエラーを表示する", async () => {
    render(<AvailabilityForm {...defaultProps} />);
    // 名前入力
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: "テスト太郎" },
    });
    // 送信
    fireEvent.click(screen.getByRole("button", { name: /回答を送信/ }));
    // エラー領域を取得し、文言を検証
    const alert = await screen.findByRole("alert");
    await waitFor(() => {
      expect(alert).toHaveTextContent("利用規約への同意が必要です");
    });
  });

  it("正常入力時にsubmitAvailabilityが呼ばれる", async () => {
    (submitAvailability as jest.Mock).mockResolvedValue({ success: true });
    render(<AvailabilityForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: "テスト太郎" },
    });
    fireEvent.click(screen.getByLabelText(/利用規約/));
    // 1つ目の日程を○にする
    const firstCell = screen.getAllByText("×")[0];
    fireEvent.click(firstCell);
    // 送信
    fireEvent.click(screen.getByRole("button", { name: /回答を送信/ }));
    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
    });
  });

  it("サーバーエラー時はエラーメッセージを表示する", async () => {
    (submitAvailability as jest.Mock).mockResolvedValue({
      success: false,
      message: "サーバーエラー",
    });
    render(<AvailabilityForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: "テスト太郎" },
    });
    fireEvent.click(screen.getByLabelText(/利用規約/));
    // 1つ目の日程を○にする
    const firstCell = screen.getAllByText("×")[0];
    fireEvent.click(firstCell);
    // 送信
    fireEvent.click(screen.getByRole("button", { name: /回答を送信/ }));
    expect(await screen.findByText(/サーバーエラー/)).toBeInTheDocument();
  });
});
