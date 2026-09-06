import AssistantSettings from '@/components/tenant/assistant-settings';
import { StepFrame } from '../step-frame';

export default function OnboardingStepTwoPage() {
  return <StepFrame step={2} title="Настройте помощника"><AssistantSettings onboarding /></StepFrame>;
}
