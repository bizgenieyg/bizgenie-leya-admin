'use client';
import { type ReactNode } from 'react';
import PublicShell from '@/components/ui/public-shell';
import {useI18n} from '@/lib/i18n';

export const inputClass = 'field-control';
export const buttonClass = 'button primary';

export function StepFrame({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  const {t}=useI18n();
  return (
    <PublicShell>
        <div className="step-head">
          <div aria-label={t('stepProgress',{step})} className="step-progress">
            {[1, 2, 3, 4].map((number) => <div key={number} className={number <= step ? 'active' : ''} />)}
          </div>
          <h1>{title}</h1>
          <p>{t('stepProgress',{step})}</p>
        </div>
        {children}
    </PublicShell>
  );
}
