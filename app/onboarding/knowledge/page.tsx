'use client';
import Link from 'next/link';
import KnowledgeProfile from '@/components/tenant/knowledge-profile';
import { StepFrame, buttonClass } from '../step-frame';
import { useI18n } from '@/lib/i18n';

/** Z6, step 3: «Расскажите о бизнесе» — the cabinet's «Добавить знания» (text, voice, file, photo, link). */
export default function OnboardingKnowledgePage() {
  const { t } = useI18n();
  return <StepFrame step={3} title={t('knowledgeStepTitle')}>
    <p className="mb-4 text-sm muted">{t('knowledgeStepHelp')}</p>
    <KnowledgeProfile onboarding />
    <div className="mt-6 step-actions"><Link href="/onboarding/owner">{t('back')}</Link><Link className={buttonClass} href="/onboarding/simulator">{t('next')} <span className="direction-icon">→</span></Link></div>
  </StepFrame>;
}
