'use client';
import KnowledgeEditor from '@/components/tenant/knowledge-editor';
import { StepFrame } from '../step-frame';
import {useI18n} from '@/lib/i18n';

export default function OnboardingStepFourPage() {
  const{t}=useI18n();return <StepFrame step={4} title={t('faqSetupTitle')}><KnowledgeEditor onboarding /></StepFrame>;
}
