'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import {useI18n} from '@/lib/i18n';
import {StepFrame,inputClass,buttonClass} from '../step-frame';

export default function OnboardingStepOnePage() {
  const {t}=useI18n();
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessSector, setBusinessSector] = useState('');
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);
  const [category, setCategory] = useState('services');
  const [language, setLanguage] = useState('he');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.replace('/login');
        router.refresh();
        return;
      }

      // Plan is assigned by the system (starter); it is never chosen here.
      let tenantId=createdTenantId;
      if(!tenantId){
        const { data, error: createError } = await supabase.rpc('create_tenant_with_owner', {
          p_name: ownerName.trim(),
          p_business_name: businessName.trim(),
          p_language: language,
        });
        if (createError || typeof data !== 'string' || !data) {
          if (process.env.NODE_ENV === 'development') console.error('Tenant creation failed', { code: createError?.code });
          setError(createError?.code === '54000' || createError?.hint === 'max_tenants_per_owner' ? t('businessExists') : t('createBusinessError'));
          return;
        }
        tenantId=data;
        setCreatedTenantId(data);
      }

      if(businessSector.trim()){
        const saved=await fetch('/api/tenant-settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_sector:businessSector.trim()})});
        if(!saved.ok){setError(t('businessSectorSaveError'));return;}
      }

      sessionStorage.setItem('onboarding_tenant_id', tenantId);
      sessionStorage.setItem('onboarding_business_category', category);
      router.push('/onboarding/step-2');
    } catch {
      if (process.env.NODE_ENV === 'development') console.error('Tenant creation request failed');
      setError(t('createBusinessError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <StepFrame step={1} title={t('onboardingBusinessTitle')}>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium muted" htmlFor="owner-name">
              {t('ownerName')}
            </label>
            <input
              className={inputClass}
              disabled={loading}
              id="owner-name"
              onChange={(event) => setOwnerName(event.target.value)}
              placeholder={t('ownerNameExample')}
              required
              value={ownerName}
            />
          </div>

          <div>
            <label className="text-sm font-medium muted" htmlFor="business-name">
              {t('businessLabel')}
            </label>
            <input
              className={inputClass}
              disabled={loading}
              id="business-name"
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder={t('businessExample')}
              required
              value={businessName}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="onboarding-business-sector">{t('businessSector')}<span className="field-help">{t('businessSectorHelp')}</span></label>
            <input className={inputClass} disabled={loading} id="onboarding-business-sector" dir="auto" list="onboarding-business-sector-options" maxLength={100} onChange={event=>setBusinessSector(event.target.value)} placeholder={t('businessSectorPlaceholder')} value={businessSector}/>
            <datalist id="onboarding-business-sector-options">{t('businessSectorSuggestions').split('|').map(value=><option key={value} value={value}/>)}</datalist>
          </div>

          <div>
            <label className="field-label" htmlFor="business-category">{t('businessCategory')}</label>
            <select className={inputClass} disabled={loading} id="business-category" value={category} onChange={event=>setCategory(event.target.value)}>
              <option value="beauty">{t('categoryBeauty')}</option><option value="food">{t('categoryFood')}</option><option value="services">{t('categoryServices')}</option><option value="other">{t('categoryOther')}</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium muted" htmlFor="language">
              {t('primaryLanguage')}
            </label>
            <select
              className={inputClass}
              disabled={loading}
              id="language"
              onChange={(event) => setLanguage(event.target.value)}
              value={language}
            >
              <option value="he">עברית</option>
              <option value="ru">{t('russian')}</option>
              <option value="en">English</option>
            </select>
          </div>

          {error ? (
            <p aria-live="polite" className="text-sm error-copy" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className={`${buttonClass} full`}
            disabled={!ownerName.trim() || !businessName.trim() || loading}
            type="submit"
          >
            {loading ? t('saving') : <>{t('next')} <span className="direction-icon">→</span></>}
          </button>
        </form>
    </StepFrame>
  );
}
