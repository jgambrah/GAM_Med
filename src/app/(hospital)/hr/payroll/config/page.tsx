'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { 
  Settings, Percent, Table, Save, 
  ShieldCheck, Loader2, Info, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

export default function PayrollConfigurationPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const defaultConfig = {
    ssnitEmployeeRate: 5.5,
    ssnitEmployerRate: 13.0,
    tier2Rate: 5.0,
    payeBrackets: [
        { upTo: 490.50, rate: 0 },
        { upTo: 110, rate: 5 },
        { upTo: 130, rate: 10 },
        { upTo: 3000, rate: 17.5 },
        { upTo: 16270, rate: 25 },
        { upTo: 30000, rate: 30 },
        { upTo: 50000, rate: 35 },
    ]
  };

  const [config, setConfig] = useState(defaultConfig);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER'].includes(userRole);

  const configRef = useMemoFirebase(() => {
      if(!firestore || !hospitalId) return null;
      return doc(firestore, `hospitals/${hospitalId}/payroll_config/main`);
  }, [firestore, hospitalId]);
  
  const { data: remoteConfig, isLoading: isConfigLoading } = useDoc(configRef);

  useEffect(() => {
      if(remoteConfig) {
          setConfig(remoteConfig as any);
      } else {
        setConfig(defaultConfig);
      }
  }, [remoteConfig]);

  const saveConfig = async () => {
    if (!configRef) return;
    setSaving(true);
    
    const dataToSave = {
        ...config,
        hospitalId,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
    };
    
    setDocumentNonBlocking(configRef, dataToSave, { merge: true });
    
    toast({ title: "Payroll Configuration Synchronized" });
    setSaving(false);
  };
  
  const pageIsLoading = isUserLoading || isClaimsLoading || isConfigLoading;

  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
  }

  if (!isAuthorized) {
     return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Payroll <span className="text-primary">Statutory Config</span></h1>
          <p className="text-muted-foreground font-medium">Align your facility with GRA and SSNIT regulations.</p>
        </div>
        <Button 
          onClick={saveConfig} disabled={saving}
          className="bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-foreground transition-all"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card p-8 rounded-[40px] border shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
            <Percent size={16} className="text-primary" /> Pension & Social Security (SSNIT)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground">Employee Contribution (%)</label>
                <Input type="number" step="0.1" className="w-full mt-1 font-black text-xl" 
                  value={config.ssnitEmployeeRate} onChange={e => setConfig({...config, ssnitEmployeeRate: parseFloat(e.target.value) || 0})}/>
             </div>
             <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground">Employer Contribution (%)</label>
                <Input type="number" step="0.1" className="w-full mt-1 font-black text-xl" 
                   value={config.ssnitEmployerRate} onChange={e => setConfig({...config, ssnitEmployerRate: parseFloat(e.target.value) || 0})}/>
             </div>
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
             <Info size={20} className="text-primary shrink-0" />
             <p className="text-[9px] text-primary/80 font-bold uppercase leading-relaxed">
                Standard Act 766 requires 13.5% employer and 5.5% employee. Tier 2 (5%) is typically carved out of the employer's 13.5%. Consult your accountant.
             </p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[40px] border shadow-sm space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
            <Table size={16} className="text-destructive" /> GRA PAYE Graduated Tax Table
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {config.payeBrackets.map((bracket, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-muted/50 p-3 rounded-2xl">
                 <span className="text-[10px] font-black w-16">Step {idx + 1}</span>
                 <div className="flex-1 flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground uppercase">Next GHS</span>
                    <Input type="number" step="0.01" className="w-full bg-card rounded-lg p-2 text-xs font-bold" 
                      value={bracket.upTo} onChange={(e) => {
                         const newB = [...config.payeBrackets];
                         newB[idx].upTo = parseFloat(e.target.value) || 0;
                         setConfig({...config, payeBrackets: newB});
                      }}/>
                 </div>
                 <div className="w-24 flex items-center gap-2">
                    <Input type="number" step="0.1" className="w-full bg-card rounded-lg p-2 text-xs font-black text-primary text-right" 
                      value={bracket.rate} onChange={(e) => {
                        const newB = [...config.payeBrackets];
                        newB[idx].rate = parseFloat(e.target.value) || 0;
                        setConfig({...config, payeBrackets: newB});
                      }}/>
                    <span className="text-[10px] font-black">%</span>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
