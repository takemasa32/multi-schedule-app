import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShareEventButton from "../share-event-button";

// navigator.share, navigator.clipboard のモック
const originalShare = navigator.share;

// 元のclipboardプロパティ記述子を保存しておく
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  window.navigator,
  "clipboard"
);

describe("ShareEventButton", () => {
  const url = "https://example.com/event/abc123";
  const title = "テストイベント";
  const text = "イベントに参加してください";

  afterEach(() => {
    // navigator.share を復元
    navigator.share = originalShare;

    // navigator.clipboard を元のプロパティ記述子で復元
    if (originalClipboardDescriptor) {
      Object.defineProperty(
        window.navigator,
        "clipboard",
        originalClipboardDescriptor
      );
    }

    // Jest モックをクリア
    jest.clearAllMocks();
  });

  it("navigator.shareが使える場合は正しいURL/タイトル/テキストで共有される", async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    navigator.share = shareMock;
    render(<ShareEventButton url={url} title={title} text={text} />);
    fireEvent.click(screen.getByRole("button", { name: /共有/ }));
    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith({ url, title, text });
    });
  });

  it("navigator.clipboardが使える場合はURLがクリップボードにコピーされる", async () => {
    // @ts-expect-error navigator.shareの型上書き
    navigator.share = undefined;
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    render(<ShareEventButton url={url} />);
    fireEvent.click(screen.getByRole("button", { name: /共有/ }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(url);
    });
  });

  it("navigator.share/clipboardが両方使えない場合はinput要素でコピーされる", async () => {
    // @ts-expect-error navigator.shareの型上書き
    navigator.share = undefined;
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    document.execCommand = jest.fn();
    render(<ShareEventButton url={url} />);
    fireEvent.click(screen.getByRole("button", { name: /共有/ }));
    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith("copy");
    });
  });
});
