import WhatsAppConnection from '@/components/tenant/whatsapp-connection';
import { StepFrame } from '../step-frame';

export default function OnboardingStepThreePage() {
  return <StepFrame step={3} title="Подключение WhatsApp"><WhatsAppConnection /></StepFrame>;
}
