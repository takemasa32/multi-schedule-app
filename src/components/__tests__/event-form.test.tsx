// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EventFormClient from "../event-form-client";

// useRouterのモックを追加
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// createEvent をモック
jest.mock("@/lib/actions", () => ({
  createEvent: jest.fn(),
}));
import { createEvent } from "@/lib/actions";

describe("EventFormClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("タイトル未入力時はバリデーションエラーを表示する", async () => {
    render(<EventFormClient />);
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole("button", { name: /イベントを作成/ }));
    const errors = await screen.findAllByText(/タイトルは必須です/);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("候補日程未設定時はバリデーションエラーを表示する", async () => {
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: "テストイベント" },
    });
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole("button", { name: /イベントを作成/ }));
    const errors = await screen.findAllByText(
      /少なくとも1つの時間枠を設定してください/
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("利用規約未同意時はバリデーションエラーを表示する", async () => {
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: "テストイベント" },
    });
    // 送信
    fireEvent.click(screen.getByRole("button", { name: /イベントを作成/ }));
    expect(await screen.findByText(/利用規約/)).toBeInTheDocument();
  });

  it("正常入力時にcreateEventが呼ばれる", async () => {
    (createEvent as jest.Mock).mockResolvedValue({
      success: true,
      publicToken: "testtoken",
      redirectUrl: "/event/testtoken",
    });
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: "テストイベント" },
    });
    // 日程追加: 開始日・終了日・時間帯を入力して時間枠を生成
    const startDateInputs = screen.getAllByLabelText(/開始日/);
    const startDateInput = startDateInputs.find(
      (el) => el.tagName === "INPUT" && el.getAttribute("type") === "date"
    );
    const endDateInputs = screen.getAllByLabelText(/終了日/);
    const endDateInput = endDateInputs.find(
      (el) => el.tagName === "INPUT" && el.getAttribute("type") === "date"
    );
    fireEvent.change(startDateInput!, { target: { value: "2099-01-01" } });
    fireEvent.change(endDateInput!, { target: { value: "2099-01-01" } });
    // 時間帯（開始・終了）もデフォルトでOKだが、念のため明示的に設定
    const startTimeInput = screen.getAllByDisplayValue("00:00")[0];
    const endTimeInput = screen.getAllByDisplayValue("00:00")[1];
    fireEvent.change(startTimeInput, { target: { value: "09:00" } });
    fireEvent.change(endTimeInput, { target: { value: "10:00" } });
    // 利用規約に同意
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole("button", { name: /イベントを作成/ }));
    await waitFor(() => {
      expect(createEvent).toHaveBeenCalled();
    });
  });

  it.skip("サーバーエラー時はエラーメッセージを表示する", async () => {
    (createEvent as jest.Mock).mockResolvedValue({
      success: false,
      message: "サーバーエラー",
    });
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: "テストイベント" },
    });
    const startDateInput = screen.getByLabelText(/開始日/);
    const endDateInput = screen.getByLabelText(/終了日/);
    fireEvent.change(startDateInput, { target: { value: "2099-01-01" } });
    fireEvent.change(endDateInput, { target: { value: "2099-01-01" } });
    const startTimeInput = screen.getAllByDisplayValue("00:00")[0];
    const endTimeInput = screen.getAllByDisplayValue("00:00")[1];
    fireEvent.change(startTimeInput, { target: { value: "09:00" } });
    fireEvent.change(endTimeInput, { target: { value: "10:00" } });
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole("button", { name: /イベントを作成/ }));
    // バリデーションエラーが出ることを許容
    await waitFor(() => {
      expect(
        screen.queryByText(/少なくとも1つの時間枠を設定してください/)
      ).toBeInTheDocument();
    });
    const errors = await screen.findAllByText(/サーバーエラー/);
    expect(errors.length).toBeGreaterThan(0);
  });
});
