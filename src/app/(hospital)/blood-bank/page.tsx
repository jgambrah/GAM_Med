import { redirect } from 'next/navigation';

export default function BloodBankRedirectPage() {
  redirect('/lab/blood-bank/inventory');
}
