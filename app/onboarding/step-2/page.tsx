import { redirect } from 'next/navigation';

/** Z6: tone, style and greetings left the onboarding path (they do not affect instruction answers); the page and
 *  its data stay in the cabinet. A direct URL goes to the next step. */
export default function OnboardingStepTwoPage() { redirect('/onboarding/owner'); }
