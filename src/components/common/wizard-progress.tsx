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
    <section aria-label="入力の進行状況" className="border-base-300 border-b pb-5">
      <div className="space-y-1">
        <h2 className="text-base-content text-lg font-semibold">
          {currentLabel ?? steps[safeStep - 1]?.label ?? ''}
        </h2>
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-flow-col sm:auto-cols-fr">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === safeStep;
          const isCompleted = stepNumber < safeStep;
          return (
            <li
              key={step.label}
              aria-current={isActive ? 'step' : undefined}
              className={`border-l-2 px-2 py-1 text-xs font-medium sm:text-sm ${
                isActive
                  ? 'border-primary text-base-content'
                  : isCompleted
                    ? 'border-primary/50 text-base-content/70'
                    : 'border-base-300 text-base-content/50'
              }`}
            >
              <span className="mr-1" aria-hidden="true">
                {isCompleted ? '✓' : stepNumber}.
              </span>
              {step.shortLabel ?? step.label}
              <span className="sr-only">
                {isCompleted ? '（完了）' : isActive ? '（現在）' : '（未完了）'}
              </span>
            </li>
          );
        })}
      </ol>

      {subSteps && subSteps.length > 1 && currentSubStep !== null && (
        <div className="border-base-300 mt-4 border-l-2 pl-3">
          <p className="text-base-content/60 text-xs font-semibold tracking-wide">{subStepLabel}</p>
          <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {subSteps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentSubStep;
              const isCompleted = stepNumber < currentSubStep;
              return (
                <li
                  key={step.label}
                  aria-current={isActive ? 'step' : undefined}
                  className={`text-sm ${
                    isActive
                      ? 'text-primary font-semibold'
                      : isCompleted
                        ? 'text-base-content/70'
                        : 'text-base-content/50'
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
