'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeprecatedPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app-ceo/leads');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4">Redirecting...</p>
    </div>
  );
}
