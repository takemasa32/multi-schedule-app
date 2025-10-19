import React from 'react';
import { TooltipState } from './tooltip';

/**
 * デバッグ用: TooltipState の内容とデバイスタイプを表示するコンポーネント
 * 不要になったらこのファイルごと削除してください
 */
const TooltipDebug: React.FC<{ tooltip: TooltipState }> = ({ tooltip }) => {
  const [deviceType, setDeviceType] = React.useState<string>('判定中');
  React.useEffect(() => {
    const updateType = () => {
      if (typeof window !== 'undefined') {
        setDeviceType(window.innerWidth < 640 ? 'スマホ用' : 'PC用');
      }
    };
    updateType();
    window.addEventListener('resize', updateType);
    return () => window.removeEventListener('resize', updateType);
  }, []);
  return (
    <div className="bg-base-200 border-base-300 fixed bottom-2 right-2 z-[2000] max-w-xs break-all rounded border p-2 text-xs opacity-90 shadow">
      <div className="text-secondary mb-1 font-bold">Tooltipデバッグ情報</div>
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
