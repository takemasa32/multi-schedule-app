// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function() {
    this.submit();
  };
}

import { GET } from "@/app/api/generate-ics/route";
import { NextRequest } from "next/server";
import { generateGoogleCalendarUrl } from "../utils";
import { createSupabaseClient } from "@/lib/supabase";

jest.mock("@/lib/supabase");
const mockedCreateSupabaseClient = createSupabaseClient as jest.Mock;

// Jest環境用の簡易Responseクラスをグローバル定義
if (typeof global.Response === 'undefined') {
  class TestResponse {
    status: number;
    _text: string;
    _headers: Record<string, string>;
    ok = true;
    redirected = false;
    statusText = '';
    type = 'basic';
    url = '';
    constructor(text: string, { status = 200, headers = {} as Record<string, string> } = {}) {
      this.status = status;
      this._text = text;
      // keyを小文字化して格納
      this._headers = {};
      for (const k in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, k)) {
          this._headers[k.toLowerCase()] = headers[k];
        }
      }
    }
    text() {
      return Promise.resolve(this._text);
    }
    get headers() {
      return {
        get: (key: string) => {
          return this._headers[key.toLowerCase()] || '';
        },
      };
    }
    // 型エラー回避のためダミーのstaticメソッドを追加
    static error(_?: unknown) { return undefined; }
    static json(_?: unknown, __?: unknown) { return undefined; }
    static redirect(_?: unknown, __?: unknown) { return undefined; }
  }
  // @ts-expect-error Jest用のResponseモックのため型不一致を許容
  global.Response = TestResponse;
}

describe("/api/generate-ics/route.ts", () => {
  const createRequest = (url: string) => ({ url } as NextRequest);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("eventパラメータがない場合は400", async () => {
    const res = await GET(createRequest("http://localhost/api/generate-ics"));
    expect(res.status).toBe(400);
  });

  it("イベントが存在しない場合は404", async () => {
    mockedCreateSupabaseClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      })),
    });
    const res = await GET(createRequest("http://localhost/api/generate-ics?event=abc"));
    expect(res.status).toBe(404);
  });

  it("確定日程がない場合は400", async () => {
    mockedCreateSupabaseClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "eid", title: "テスト", description: "desc", final_date_id: null }, error: null }),
      })),
    });
    const res = await GET(createRequest("http://localhost/api/generate-ics?event=abc"));
    expect(res.status).toBe(400);
  });

  it("日程情報が取得できない場合は404", async () => {
    const fromMock = jest.fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "eid", title: "テスト", description: "desc", final_date_id: "dateid" }, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      });
    mockedCreateSupabaseClient.mockReturnValue({ from: fromMock });
    const res = await GET(createRequest("http://localhost/api/generate-ics?event=abc"));
    expect(res.status).toBe(404);
  });

  it("正常に.icsファイルが生成される", async () => {
    const fromMock = jest.fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "eid", title: "テストイベント", description: "説明", final_date_id: "dateid" }, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { start_time: "2025-05-10T10:00:00Z", end_time: "2025-05-10T11:00:00Z" }, error: null }),
      });
    mockedCreateSupabaseClient.mockReturnValue({ from: fromMock });
    const res = await GET(createRequest("http://localhost/api/generate-ics?event=abc"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/BEGIN:VCALENDAR/);
    expect(text).toMatch(/SUMMARY:テストイベント/);
    expect(text).toMatch(/DTSTART:20250510T100000Z/);
    expect(res.headers.get("content-type")).toMatch(/text\/calendar/);
  });
});

describe("generateGoogleCalendarUrl", () => {
  it("正しいGoogleカレンダーURLが生成される", () => {
    const url = generateGoogleCalendarUrl({
      title: "テストイベント",
      start: "2025-05-10T10:00:00Z",
      end: "2025-05-10T11:00:00Z",
      description: "説明文",
      location: "東京駅"
    });
    expect(url).toMatch(/^https:\/\/calendar.google.com\/calendar\/r\/eventedit\?/);
    expect(url).toContain("text=%E3%83%86%E3%82%B9%E3%83%88%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88");
    expect(url).toContain("dates=20250510T100000Z%2F20250510T110000Z");
    expect(url).toContain("details=%E8%AA%AC%E6%98%8E%E6%96%87");
    expect(url).toContain("location=%E6%9D%B1%E4%BA%AC%E9%A7%85");
  });

  it("日本語や特殊文字もURLエンコードされる", () => {
    const url = generateGoogleCalendarUrl({
      title: "会議 & 打合せ",
      start: "2025-12-01T09:30:00Z",
      end: "2025-12-01T10:30:00Z",
      description: "詳細: テスト\n改行もOK",
      location: "大阪・梅田"
    });
    // +と%20の違いを許容するため正規表現で判定
    expect(url).toMatch(new RegExp(encodeURIComponent("会議 & 打合せ").replace(/%20/g, "(\\+|%20)")));
    expect(url).toMatch(new RegExp(encodeURIComponent("詳細: テスト\n改行もOK").replace(/%20/g, "(\\+|%20)")));
    expect(url).toMatch(new RegExp(encodeURIComponent("大阪・梅田").replace(/%20/g, "(\\+|%20)")));
    expect(url).toContain("dates=20251201T093000Z%2F20251201T103000Z");
  });

  it("省略パラメータも問題なく生成される", () => {
    const url = generateGoogleCalendarUrl({
      title: "タイトルのみ",
      start: "2025-01-01T00:00:00Z",
      end: "2025-01-01T01:00:00Z"
    });
    expect(url).toContain("text=%E3%82%BF%E3%82%A4%E3%83%88%E3%83%AB%E3%81%AE%E3%81%BF");
    expect(url).toContain("dates=20250101T000000Z%2F20250101T010000Z");
  });
});
