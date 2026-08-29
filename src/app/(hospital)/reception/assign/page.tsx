'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ReceptionAssignRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reception/assign-doctor');
  }, [router]);

  return (
    <div className="flex h-96 w-full items-center justify-center text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mr-2" />
      <span className="text-xs font-bold uppercase tracking-wider">Routing to Doctor Assignment & Consult Queue...</span>
    </div>
  );
}
