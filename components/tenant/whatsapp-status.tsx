'use client';

import { useEffect, useState } from 'react';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import WhatsAppConnection from './whatsapp-connection';

export default function WhatsAppStatus() {
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    let disposed = false;
    void getOnboardingTenant().then(tenant => {
      tenant.requireRole(['owner', 'admin']);
      if (!disposed) setCanEdit(true);
    }).catch(() => { if (!disposed) setCanEdit(false); });
    return () => { disposed = true; };
  }, []);
  return <WhatsAppConnection cabinet canEdit={canEdit} />;
}
