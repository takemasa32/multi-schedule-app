import React from "react";
import { render } from "@testing-library/react";

jest.mock("next/script", () => {
  return function MockScript(props: {
    id?: string;
    strategy?: string;
    dangerouslySetInnerHTML?: { __html: string };
    children?: React.ReactNode;
  }) {
    const { id, children, dangerouslySetInnerHTML, strategy } = props;
    return (
      <script id={id} data-strategy={strategy}>
        {dangerouslySetInnerHTML ? dangerouslySetInnerHTML.__html : children}
      </script>
    );
  };
});

import LineExternalBrowserRedirector from "../browser-banner/LineExternalBrowserRedirector";

describe("LineExternalBrowserRedirector", () => {
  it("LINEブラウザ検知用スクリプトが挿入される", () => {
    const { container } = render(<LineExternalBrowserRedirector />);
    const script = container.querySelector(
      "script#line-external-browser-redirector"
    );
    expect(script).not.toBeNull();
    expect(script?.textContent).toContain("openExternalBrowser");
    expect(script).toHaveAttribute("data-strategy", "afterInteractive");
  });
});
