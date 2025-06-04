import React from "react";
import { render, screen } from "@testing-library/react";
import MobileInfoPanel from "../availability-summary/mobile-info-panel";

describe("MobileInfoPanel", () => {
  it("コメントが表示される", () => {
    render(
      <MobileInfoPanel
        show={true}
        dateLabel=""
        timeLabel=""
        availableParticipants={[{ name: "Alice", comment: "よろしく" }]}
        unavailableParticipants={[]}
        onClose={() => {}}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("よろしく")).toBeInTheDocument();
  });
});
