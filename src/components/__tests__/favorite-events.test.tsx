/**
 * @file お気に入りイベント機能のユニットテスト雛形
 * @see src/components/favorite-events-context.tsx
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FavoriteEventsProvider } from "../favorite-events-context";
import FavoriteEvents from "../favorite-events";
import FavoriteToggle from "../favorite-toggle";

// テスト用イベントデータ
const TEST_EVENT = { id: "test-1234", title: "テストイベント" };

describe("お気に入りイベント機能", () => {
  it("お気に入り追加・削除が一覧に即時反映される", () => {
    render(
      <FavoriteEventsProvider>
        <FavoriteToggle eventId={TEST_EVENT.id} title={TEST_EVENT.title} />
        <FavoriteEvents />
      </FavoriteEventsProvider>
    );
    // 初期状態: お気に入りなし
    expect(screen.getByText("お気に入りイベントはありません。"));
    // 追加
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(TEST_EVENT.title)).toBeInTheDocument();
    // 解除
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("お気に入りイベントはありません。"));
  });
});
