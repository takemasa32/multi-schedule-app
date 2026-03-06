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
  subSteps?: WizardProgressStep[];
  currentSubStep?: number | null;
  subStepLabel?: string;
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
  subSteps,
  currentSubStep = null,
  subStepLabel = 'このステップの進行',
}: WizardProgressProps) {
  const safeStep = Math.min(Math.max(currentStep, 1), steps.length || 1);

  return (
    <section className="rounded-2xl border border-base-300 bg-base-200/70 p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-base-content/50">
          Step {safeStep} / {steps.length}
        </p>
        <h3 className="text-base font-semibold text-base-content">
          {currentLabel ?? steps[safeStep - 1]?.label ?? ''}
        </h3>
      </div>

      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === safeStep;
          const isCompleted = stepNumber < safeStep;
          return (
            <li
              key={step.label}
              aria-current={isActive ? 'step' : undefined}
              className={`min-w-fit rounded-full border px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'border-primary bg-primary text-primary-content'
                  : isCompleted
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-base-300 bg-base-100 text-base-content/60'
              }`}
            >
              {stepNumber}. {step.shortLabel ?? step.label}
            </li>
          );
        })}
      </ol>

      {subSteps && subSteps.length > 1 && currentSubStep !== null && (
        <div className="mt-3 rounded-xl border border-base-300 bg-base-100 p-3">
          <p className="text-xs font-semibold tracking-wide text-base-content/60">{subStepLabel}</p>
          <ol className="mt-2 flex flex-wrap gap-2">
            {subSteps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentSubStep;
              const isCompleted = stepNumber < currentSubStep;
              return (
                <li
                  key={step.label}
                  aria-current={isActive ? 'step' : undefined}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    isActive
                      ? 'border-primary bg-primary text-primary-content'
                      : isCompleted
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-base-300 bg-base-100 text-base-content/65'
                  }`}
                >
                  {stepNumber}. {step.shortLabel ?? step.label}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
