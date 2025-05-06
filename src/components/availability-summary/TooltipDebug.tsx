import React from "react";
import { TooltipState } from "./tooltip";

/**
 * デバッグ用: TooltipState の内容とデバイスタイプを表示するコンポーネント
 * 不要になったらこのファイルごと削除してください
 */
const TooltipDebug: React.FC<{ tooltip: TooltipState }> = ({ tooltip }) => {
  const [deviceType, setDeviceType] = React.useState<string>("判定中");
  React.useEffect(() => {
    const updateType = () => {
      if (typeof window !== "undefined") {
        setDeviceType(window.innerWidth < 640 ? "スマホ用" : "PC用");
      }
    };
    updateType();
    window.addEventListener("resize", updateType);
    return () => window.removeEventListener("resize", updateType);
  }, []);
  return (
    <div className="fixed bottom-2 right-2 z-[2000] bg-base-200 text-xs p-2 rounded shadow border border-base-300 max-w-xs break-all opacity-90">
      <div className="font-bold mb-1 text-secondary">Tooltipデバッグ情報</div>
      <div className="mb-1">
        デバイスタイプ: <span className="font-mono">{deviceType}</span>
      </div>
      <pre className="whitespace-pre-wrap text-xs leading-tight">
        {JSON.stringify(tooltip, null, 2)}
      </pre>
    </div>
  );
};

export default TooltipDebug;
