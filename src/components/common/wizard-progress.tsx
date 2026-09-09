'use client';

type WizardProgressStep = {
  label: string;
  shortLabel?: string;
  description?: string;
};

type WizardProgressProps = {
  currentStep: number;
  steps: WizardProgressStep[];
  currentLabel?: string;
  headingId?: string;
};

/**
 * ウィザードの進行状況を表示するコンポーネント
 * @param {WizardProgressProps} props 進捗表示に必要なプロパティ
 * @returns {JSX.Element} 進捗表示UI
 */
export default function WizardProgress({
  currentStep,
  steps,
  currentLabel,
  headingId,
}: WizardProgressProps) {
  const safeStep = Math.min(Math.max(currentStep, 1), steps.length || 1);
  const label = currentLabel ?? steps[safeStep - 1]?.label ?? '';
  const progressValue = steps.length > 0 ? (safeStep / steps.length) * 100 : 0;

  return (
    <section aria-label="入力の進行状況" className="border-base-300 border-b pb-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-base-content text-lg font-semibold">
          {label}
        </h2>
        <span className="text-base-content/60 shrink-0 text-sm tabular-nums" aria-hidden="true">
          {safeStep} / {steps.length}
        </span>
      </div>
      <div
        className="bg-base-200 mt-3 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={`${label}（${safeStep}/${steps.length}）`}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={safeStep}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </section>
  );
}
