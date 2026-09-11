'use client';
import WhatsAppConnection from '@/components/tenant/whatsapp-connection';
import { StepFrame } from '../step-frame';
import {useI18n} from '@/lib/i18n';

export default function OnboardingStepThreePage() {
  const{t}=useI18n();return <StepFrame step={3} title={t('whatsappSetupTitle')}><WhatsAppConnection /></StepFrame>;
}
