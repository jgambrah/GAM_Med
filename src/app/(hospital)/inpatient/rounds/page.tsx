'use client';
import { useState } from 'react';
import { BedDouble, CheckCircle2, Save, FileText, Activity, AlertTriangle, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function WardRoundingWorkspace() {
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);

  const [patients, setPatients] = useState([
    {
      id: 'BED-01',
      name: 'Ama Serwaa',
      ehr: 'EHR-88392',
      ward: 'Maternity Ward',
      bed: 'Bed 01',
      vitals: 'BP 138/88 • HR 82 • Temp 36.8°C',
      soapNote: 'Patient feels better this morning. No vaginal bleeding. Pedal edema resolving.',
      status: 'ROUNDED'
    },
    {
      id: 'BED-02',
      name: 'Kofi Mensah',
      ehr: 'EHR-99201',
      ward: 'Male Medical Ward',
      bed: 'Bed 04',
      vitals: 'BP 152/94 • HR 90 • Temp 37.2°C',
      soapNote: 'Hypertension remains elevated. Increase Amlodipine to 10mg daily. Re-check BP in 4 hrs.',
      status: 'PENDING'
    },
    {
      id: 'BED-03',
      name: 'Yaa Asantewaa',
      ehr: 'EHR-44102',
      ward: 'Female Surgical Ward',
      bed: 'Bed 08',
      vitals: 'BP 120/78 • HR 74 • Temp 36.5°C',
      soapNote: 'Post-op Day 2 clean surgical site. Dressing intact. Discontinue IV fluids, start oral diet.',
      status: 'PENDING'
    }
  ]);

  const handleUpdateNote = (id: string, newNote: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, soapNote: newNote } : p));
  };

  const handleSaveRound = (id: string) => {
    setSavingId(id);
    setTimeout(() => {
      setSavingId(null);
      setPatients(prev => prev.map(p => p.id === id ? { ...p, status: 'ROUNDED' } : p));
      toast({
        title: '📋 Ward Round Note Saved',
        description: `Soap note and orders updated for ${patients.find(p => p.id === id)?.name}.`
      });
    }, 600);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Multi-Patient <span className="text-sky-600">Ward Rounding Workspace</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Review vitals, update SOAP notes, and queue orders for all admitted patients simultaneously.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-2xl border">
          <BedDouble className="text-sky-600" size={20} />
          <span className="text-xs font-black uppercase">{patients.filter(p => p.status === 'ROUNDED').length} / {patients.length} Rounded Today</span>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="space-y-6">
        {patients.map(patient => (
          <div key={patient.id} className="bg-white p-6 rounded-[32px] border-2 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b pb-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black uppercase text-slate-900">{patient.name}</h3>
                  <span className="text-[10px] font-black bg-sky-100 text-sky-800 px-3 py-1 rounded-full uppercase">{patient.ward} — {patient.bed}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{patient.ehr}</span>
                </div>
                <p className="text-xs font-black text-emerald-600 mt-1 flex items-center gap-1">
                  <Activity size={14} /> Vitals: {patient.vitals}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => handleSaveRound(patient.id)} 
                  disabled={savingId === patient.id}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  <CheckCircle2 size={14} /> {patient.status === 'ROUNDED' ? 'Update Round Note' : 'Complete Floor Round'}
                </Button>
              </div>
            </div>

            {/* SOAP NOTE TEXTAREA */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <FileText size={12} /> Daily Ward Round SOAP Note:
              </label>
              <Textarea 
                value={patient.soapNote}
                onChange={(e) => handleUpdateNote(patient.id, e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-900 font-bold text-xs rounded-2xl"
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
