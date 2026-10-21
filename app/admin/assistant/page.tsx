import {redirect} from 'next/navigation';
/** Z8: «Ассистент» is a section of «Настройки» now (name, the language it writes to you in). */
export default function AssistantPage(){redirect('/admin/settings?section=assistant');}
