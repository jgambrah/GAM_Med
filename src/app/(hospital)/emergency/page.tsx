import { redirect } from 'next/navigation';

export default function EmergencyRedirectPage() {
  redirect('/nurse/triage');
}
