'use client';
import AssistantSettings from '@/components/tenant/assistant-settings';
import { StepFrame } from '../step-frame';
import {useI18n} from '@/lib/i18n';

export default function OnboardingStepTwoPage() {
  const{t}=useI18n();return <StepFrame step={2} title={t('assistantSetupTitle')}><AssistantSettings onboarding /></StepFrame>;
}
