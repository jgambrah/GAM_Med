'use client';
import { useState, useEffect } from 'react';
import { ShieldAlert, Bell, Volume2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface CriticalLabAlert {
  id: string;
  patientName: string;
  testName: string;
  resultValue: string;
  threshold: string;
  timestamp: string;
}

export function CriticalLabPushNotification() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<CriticalLabAlert[]>([
    {
      id: 'CRIT-1',
      patientName: 'Ama Serwaa',
      testName: 'Hemoglobin (Hb)',
      resultValue: '5.8 g/dL',
      threshold: '< 6.5 g/dL (Severe Anemia Alert)',
      timestamp: '2 mins ago',
    }
  ]);

  const handleAcknowledge = (id: string) => {
    const alert = alerts.find(a => a.id === id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast({
      title: '✅ Critical Lab Acknowledged & Signed',
      description: `Doctor digital sign-off recorded for ${alert?.patientName || 'Patient'}'s ${alert?.testName} (${alert?.resultValue}).`
    });
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-2">
      {alerts.map(alert => (
        <div key={alert.id} className="bg-red-950 text-red-100 p-4 rounded-3xl border-2 border-red-500 shadow-2xl space-y-2 animate-bounce">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-red-400 animate-pulse" size={20} />
              <span className="text-xs font-black uppercase tracking-widest text-red-300">CRITICAL LAB PUSH ALERT</span>
            </div>
            <button onClick={() => dismissAlert(alert.id)} className="text-red-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div>
            <p className="text-sm font-black uppercase text-white">{alert.patientName}</p>
            <p className="text-xs font-bold text-red-200">{alert.testName}: <span className="text-white text-base font-black underline">{alert.resultValue}</span> ({alert.threshold})</p>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-red-900 text-[10px] font-bold text-red-400 uppercase">
            <span>{alert.timestamp}</span>
            <Button 
              size="sm" 
              onClick={() => handleAcknowledge(alert.id)}
              className="h-7 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase rounded-xl shadow-lg"
            >
              Acknowledge & Sign ✍️
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
