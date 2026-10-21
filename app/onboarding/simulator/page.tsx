'use client';
import Link from 'next/link';
import ConversationSimulator from '@/components/tenant/conversation-simulator';
import { StepFrame, buttonClass } from '../step-frame';
import { useI18n } from '@/lib/i18n';
import { useInstructionMode } from '@/lib/tenant/instruction-mode';

/** Z6, step 4: check in the simulator — three client questions of the tenant's deal type + «Свой вопрос». */
export default function OnboardingSimulatorPage() {
  const { t } = useI18n();
  const { suggestions, loaded } = useInstructionMode();
  return <StepFrame step={4} title={t('simulatorStepTitle')}>
    <p className="mb-4 text-sm muted">{t('simulatorStepHelp')}</p>
    {/* Z8: the suggested questions come with the settings — the simulator waits for them instead of growing later. */}
    {loaded ? <ConversationSimulator suggestions={suggestions} /> : <div className="skeleton-block" aria-busy="true" />}
    <div className="mt-6 step-actions"><Link href="/onboarding/knowledge">{t('back')}</Link><Link className={buttonClass} href="/onboarding/step-3">{t('next')} <span className="direction-icon">→</span></Link></div>
  </StepFrame>;
}
