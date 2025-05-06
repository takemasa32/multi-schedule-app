/**
 * 指定IDのポータル要素を取得または生成して返す
 */
export function ensurePortal(id = "tooltip-portal"): HTMLDivElement {
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
  return el;
}
