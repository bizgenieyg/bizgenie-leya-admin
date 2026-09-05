import Link from 'next/link';
import { buttonClass, StepFrame } from '../step-frame';

export default function OnboardingStepThreePage() {
  return (
    <StepFrame step={3} title="Подключение WhatsApp — скоро">
      <Link className={`${buttonClass} inline-block`} href="/onboarding/step-4">Пропустить</Link>
    </StepFrame>
  );
}
