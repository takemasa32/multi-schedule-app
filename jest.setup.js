import { TextEncoder, TextDecoder } from "util";
import {
  ReadableStream,
  WritableStream,
  TransformStream,
} from "web-streams-polyfill";

// Jestセットアップ: Node.js環境でWeb APIのグローバルポリフィル

// TextEncoder/TextDecoderのポリフィル
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
// Web Streams APIのポリフィル（undici用）
if (typeof global.ReadableStream === "undefined") {
  global.ReadableStream = ReadableStream;
}
if (typeof global.WritableStream === "undefined") {
  global.WritableStream = WritableStream;
}
if (typeof global.TransformStream === "undefined") {
  global.TransformStream = TransformStream;
}
// Requestの簡易モック（API Route/Next.js用）
if (typeof global.Request === "undefined") {
  global.Request = class {
    constructor(input, init) {
      this.url = typeof input === "string" ? input : input && input.url;
      this.method = (init && init.method) || "GET";
      this.headers = (init && init.headers) || {};
      this.body = init && init.body;
    }
  };
}
// Responseのポリフィルは削除（API Routeテストで個別にモック）
