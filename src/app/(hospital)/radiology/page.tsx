import { redirect } from 'next/navigation';

export default function RadiologyRedirectPage() {
  redirect('/radiology/queue');
}
