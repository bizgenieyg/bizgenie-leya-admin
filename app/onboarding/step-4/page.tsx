import { redirect } from 'next/navigation';

/** Z6: FAQ left the onboarding path («Расскажите о бизнесе» replaces it); the data stays. Step 4 was the last one. */
export default function OnboardingStepFourPage() { redirect('/admin'); }
