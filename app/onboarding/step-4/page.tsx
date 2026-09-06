import KnowledgeEditor from '@/components/tenant/knowledge-editor';
import { StepFrame } from '../step-frame';

export default function OnboardingStepFourPage() {
  return <StepFrame step={4} title="Добавьте первые FAQ"><KnowledgeEditor onboarding /></StepFrame>;
}
