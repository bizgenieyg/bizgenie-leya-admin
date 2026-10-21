import {redirect} from 'next/navigation';
/** Z8: «Профиль» is the «Аккаунт» section of «Настройки». */
export default function ProfilePage(){redirect('/admin/settings?section=account');}
