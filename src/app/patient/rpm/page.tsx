'use client';
import { useState } from 'react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Activity, Thermometer, HeartPulse, Scale, Droplets, CheckCircle2, Send, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PatientRpmPortalPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [readingType, setReadingType] = useState<'BP' | 'GLUCOSE' | 'WEIGHT' | 'TEMP'>('BP');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [glucoseLevel, setGlucoseLevel] = useState('');
  const [glucoseTiming, setGlucoseTiming] = useState<'FASTING' | 'POST_PRANDIAL'>('FASTING');
  const [weight, setWeight] = useState('');
  const [temp, setTemp] = useState('');
  const [notes, setNotes] = useState('');

  const handleLogReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Authentication Required', description: 'Please sign in to log readings.' });
      return;
    }
    setLoading(true);

    try {
      const rpmRef = collection(firestore, `patients/${user.uid}/rpm_logs`);
      await addDocumentNonBlocking(rpmRef, {
        patientId: user.uid,
        patientName: user.displayName || 'Patient',
        readingType,
        bp: readingType === 'BP' ? `${systolic}/${diastolic}` : null,
        systolic: readingType === 'BP' ? Number(systolic) : null,
        diastolic: readingType === 'BP' ? Number(diastolic) : null,
        pulse: readingType === 'BP' ? Number(pulse) : null,
        glucoseLevel: readingType === 'GLUCOSE' ? Number(glucoseLevel) : null,
        glucoseTiming: readingType === 'GLUCOSE' ? glucoseTiming : null,
        weight: readingType === 'WEIGHT' ? Number(weight) : null,
        temp: readingType === 'TEMP' ? Number(temp) : null,
        notes: notes || null,
        createdAt: serverTimestamp(),
      });

      toast({ title: '✅ Home Reading Synchronized!', description: 'Your health data has been sent to your doctor.' });
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setGlucoseLevel('');
      setWeight('');
      setTemp('');
      setNotes('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Log Failed', description: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link href="/patient/login">
          <Button variant="ghost" className="text-slate-400 hover:text-white p-0 flex items-center gap-2">
            <ArrowLeft size={16} /> Portal Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-sky-400" />
          <span className="text-xs font-black uppercase tracking-widest text-sky-400">Remote Patient Monitoring</span>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">Log Home Health Readings</h1>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          Sync daily blood pressure, blood glucose (gestational diabetes), or weight directly with your medical team.
        </p>
      </div>

      {/* READING TYPE SELECTION CHIPS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setReadingType('BP')}
          className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all ${
            readingType === 'BP' ? 'bg-red-950 border-red-500 text-red-300 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <HeartPulse size={20} /> Blood Pressure
        </button>

        <button
          type="button"
          onClick={() => setReadingType('GLUCOSE')}
          className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all ${
            readingType === 'GLUCOSE' ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <Droplets size={20} /> Blood Glucose
        </button>

        <button
          type="button"
          onClick={() => setReadingType('WEIGHT')}
          className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all ${
            readingType === 'WEIGHT' ? 'bg-sky-950 border-sky-500 text-sky-300 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <Scale size={20} /> Weight (kg)
        </button>

        <button
          type="button"
          onClick={() => setReadingType('TEMP')}
          className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all ${
            readingType === 'TEMP' ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <Thermometer size={20} /> Temperature
        </button>
      </div>

      {/* FORM LOGGING */}
      <form onSubmit={handleLogReading} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6">
        {readingType === 'BP' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
              <HeartPulse size={16} /> Home Blood Pressure Monitor
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Systolic (Top #)</label>
                <Input
                  type="number"
                  required
                  value={systolic}
                  onChange={e => setSystolic(e.target.value)}
                  placeholder="e.g. 120"
                  className="bg-slate-950 border-slate-800 text-white font-black text-lg h-12 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Diastolic (Bottom #)</label>
                <Input
                  type="number"
                  required
                  value={diastolic}
                  onChange={e => setDiastolic(e.target.value)}
                  placeholder="e.g. 80"
                  className="bg-slate-950 border-slate-800 text-white font-black text-lg h-12 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Heart Rate / Pulse (bpm)</label>
              <Input
                type="number"
                value={pulse}
                onChange={e => setPulse(e.target.value)}
                placeholder="e.g. 72"
                className="bg-slate-950 border-slate-800 text-white font-black text-lg h-12 mt-1"
              />
            </div>
          </div>
        )}

        {readingType === 'GLUCOSE' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
              <Droplets size={16} /> Home Blood Glucose Log
            </h3>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Glucose Reading (mg/dL or mmol/L)</label>
              <Input
                type="number"
                step="0.1"
                required
                value={glucoseLevel}
                onChange={e => setGlucoseLevel(e.target.value)}
                placeholder="e.g. 95"
                className="bg-slate-950 border-slate-800 text-white font-black text-lg h-12 mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Measurement Timing</label>
              <div className="flex gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setGlucoseTiming('FASTING')}
                  className={`flex-1 py-3 rounded-2xl font-bold text-xs uppercase transition-all ${
                    glucoseTiming === 'FASTING' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  Fasting (Morning)
                </button>
                <button
                  type="button"
                  onClick={() => setGlucoseTiming('POST_PRANDIAL')}
                  className={`flex-1 py-3 rounded-2xl font-bold text-xs uppercase transition-all ${
                    glucoseTiming === 'POST_PRANDIAL' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  2 Hrs Post Meal
                </button>
              </div>
            </div>
          </div>
        )}

        {readingType === 'WEIGHT' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
              <Scale size={16} /> Body Weight Log
            </h3>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Current Weight (kg)</label>
              <Input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="e.g. 68.5"
                className="bg-slate-950 border-slate-800 text-white font-black text-lg h-12 mt-1"
              />
            </div>
          </div>
        )}

        {readingType === 'TEMP' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <Thermometer size={16} /> Body Temperature Log
            </h3>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Body Temp (°C)</label>
              <Input
                type="number"
                step="0.1"
                required
                value={temp}
                onChange={e => setTemp(e.target.value)}
                placeholder="e.g. 36.8"
                className="bg-slate-950 border-slate-800 text-white font-black text-lg h-12 mt-1"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Additional Symptoms / Notes</label>
          <Textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any headache, dizziness, or unusual feeling?"
            className="bg-slate-950 border-slate-800 text-white font-bold text-xs mt-1"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-widest h-14 rounded-2xl flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Sync Reading to Hospital EHR
        </Button>
      </form>
    </div>
  );
}
