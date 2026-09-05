import { type ReactNode } from 'react';

export const inputClass = 'mt-1 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500';
export const buttonClass = 'rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

export function StepFrame({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <section className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div aria-label={`Шаг ${step} из 4`} className="mb-4 flex gap-2">
            {[1, 2, 3, 4].map((number) => <div key={number} className={`h-1 flex-1 rounded-full ${number === step ? 'bg-blue-600' : 'bg-gray-200'}`} />)}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">Шаг {step} из 4</p>
        </div>
        {children}
      </section>
    </main>
  );
}
