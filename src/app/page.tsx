import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to GamMed</h1>
      <p className="mt-4 text-lg">Your modern Hospital Management ERP System.</p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </main>
  );
}
