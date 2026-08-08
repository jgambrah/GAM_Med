import { redirect } from 'next/navigation';

export default function LaboratoryRedirectPage() {
  redirect('/lab/queue');
}
