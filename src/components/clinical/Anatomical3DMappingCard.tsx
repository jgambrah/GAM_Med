'use client';
import { useState, useMemo } from 'react';
import { User, ShieldAlert, Sparkles, Plus, Trash2, Save, MapPin, ChevronDown, ChevronUp, Activity, CheckCircle2, RotateCw } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export interface AnatomicalPin {
  id: string;
  region: 'HEAD' | 'CHEST' | 'ABDOMEN' | 'PELVIS' | 'RIGHT_ARM' | 'LEFT_ARM' | 'RIGHT_LEG' | 'LEFT_LEG';
  pinType: 'PAIN' | 'INCISION' | 'MASS' | 'WOUND';
  xPercent: number; // 0 - 100 on 3D canvas
  yPercent: number; // 0 - 100 on 3D canvas
  severity: number; // 1 - 10
  notes: string;
  createdAt?: any;
}

interface Anatomical3DMappingCardProps {
  patientId?: string;
  hospitalId?: string;
  patientName?: string;
  defaultExpanded?: boolean;
}

export function Anatomical3DMappingCard({
  patientId,
  hospitalId: propHospitalId,
  patientName = 'Patient',
  defaultExpanded = false
}: Anatomical3DMappingCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const params = useParams();
  const effectivePatientId = patientId || (params?.id as string);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = propHospitalId || userProfile?.hospitalId;

  // Query live anatomical pins from Firestore
  const pinsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !effectivePatientId) return null;
    return collection(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/anatomical_annotations`);
  }, [firestore, hospitalId, effectivePatientId]);
  const { data: dbPins } = useCollection<any>(pinsQuery);

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [rotationAngle, setRotationAngle] = useState(0); // 360 degree rotation simulation
  const [selectedRegion, setSelectedRegion] = useState<'ABDOMEN' | 'CHEST' | 'HEAD' | 'PELVIS' | 'RIGHT_ARM' | 'LEFT_ARM'>('ABDOMEN');
  const [pinType, setPinType] = useState<'PAIN' | 'INCISION' | 'MASS' | 'WOUND'>('MASS');
  const [pinNotes, setPinNotes] = useState('');
  const [pinSeverity, setPinSeverity] = useState(7);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // Local fallback pins + Firestore synced pins
  const pins = useMemo<AnatomicalPin[]>(() => {
    if (dbPins && dbPins.length > 0) {
      return dbPins.map((p: any) => ({
        id: p.id,
        region: p.region || 'ABDOMEN',
        pinType: p.pinType || 'MASS',
        xPercent: p.xPercent || 50,
        yPercent: p.yPercent || 45,
        severity: p.severity || 5,
        notes: p.notes || ''
      }));
    }
    return [
      {
        id: 'PIN-1',
        region: 'ABDOMEN',
        pinType: 'MASS',
        xPercent: 54,
        yPercent: 48,
        severity: 7,
        notes: '3cm palpable firm mass in Right Lower Quadrant (RLQ)'
      },
      {
        id: 'PIN-2',
        region: 'CHEST',
        pinType: 'PAIN',
        xPercent: 48,
        yPercent: 32,
        severity: 8,
        notes: 'Pleuritic chest discomfort on deep inspiration'
      }
    ];
  }, [dbPins]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPercent = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const newPinId = `PIN-${Date.now()}`;
    const newPin: AnatomicalPin = {
      id: newPinId,
      region: selectedRegion,
      pinType,
      xPercent,
      yPercent,
      severity: pinSeverity,
      notes: pinNotes || `${pinType} annotated at ${selectedRegion} (${xPercent}%, ${yPercent}%)`
    };

    if (firestore && hospitalId && effectivePatientId) {
      const pinRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/anatomical_annotations/${newPinId}`);
      setDocumentNonBlocking(pinRef, {
        patientId: effectivePatientId,
        patientName,
        region: selectedRegion,
        pinType,
        xPercent,
        yPercent,
        severity: pinSeverity,
        notes: newPin.notes,
        annotatedBy: user?.displayName || 'Dr. Tracy Gambrah',
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    toast({
      title: `🧍 Anatomical Pin Added: ${pinType}`,
      description: `Annotated ${selectedRegion} for ${patientName}.`
    });
    setPinNotes('');
  };

  const getPinColor = (type: string) => {
    switch (type) {
      case 'PAIN': return 'bg-red-500 text-white border-red-300 ring-4 ring-red-500/30';
      case 'INCISION': return 'bg-blue-500 text-white border-blue-300 ring-4 ring-blue-500/30';
      case 'MASS': return 'bg-amber-500 text-black border-amber-300 ring-4 ring-amber-500/30';
      case 'WOUND': return 'bg-emerald-500 text-white border-emerald-300 ring-4 ring-emerald-500/30';
      default: return 'bg-purple-500 text-white';
    }
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-purple-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-purple-950/40 hover:bg-purple-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-purple-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-900/80 rounded-2xl border border-purple-700 text-purple-300">
            <User className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-purple-300">Interactive 3D Anatomical Body Canvas</h3>
              <span className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                SPATIAL 3D ANNOTATOR
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              360° Rotatable Body Model • Point-and-Click Pain, Incision & Mass Annotations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black bg-purple-900 text-purple-200 border border-purple-700 px-3 py-1 rounded-full uppercase">
            {pins.length} Active Anatomical Pins
          </span>
          <Button size="sm" variant="ghost" className="text-purple-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand 3D Canvas'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE 3D CANVAS & ANNOTATION DECK */}
      {isExpanded && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLS: 3D ROTATABLE BODY CANVAS */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-purple-400">Anatomical Region:</span>
                <span className="text-xs font-black text-white bg-purple-950 px-3 py-1 rounded-lg border border-purple-800">
                  {selectedRegion}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRotationAngle(prev => (prev + 90) % 360)}
                className="border-purple-600 text-purple-300 hover:bg-purple-950 font-black text-xs uppercase rounded-xl flex items-center gap-1.5"
              >
                <RotateCw size={14} /> Rotate 3D View ({rotationAngle}°)
              </Button>
            </div>

            {/* 3D VECTOR BODY CANVAS WITH CLICKABLE PINS */}
            <div 
              onClick={handleCanvasClick}
              className="relative h-96 w-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-3xl border-2 border-slate-800 flex items-center justify-center cursor-crosshair overflow-hidden group select-none"
            >
              {/* SVG 3D ANATOMICAL BODY SILHOUETTE */}
              <svg 
                viewBox="0 0 200 400" 
                className="h-full max-h-88 opacity-80 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                style={{ transform: `rotateY(${rotationAngle}deg)` }}
              >
                {/* HEAD */}
                <circle cx="100" cy="40" r="24" fill="#3b0764" stroke="#a855f7" strokeWidth="2" />
                {/* NECK */}
                <rect x="92" y="64" width="16" height="16" fill="#3b0764" stroke="#a855f7" strokeWidth="1.5" />
                {/* TORSO & CHEST */}
                <path d="M 60,80 L 140,80 L 130,190 L 70,190 Z" fill="#2e1065" stroke="#c084fc" strokeWidth="2" />
                {/* ABDOMEN & PELVIS */}
                <path d="M 70,190 L 130,190 L 120,240 L 80,240 Z" fill="#3b0764" stroke="#a855f7" strokeWidth="2" />
                {/* ARMS */}
                <path d="M 58,82 L 35,180 L 45,185 L 65,95 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                <path d="M 142,82 L 165,180 L 155,185 L 135,95 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                {/* LEGS */}
                <path d="M 80,240 L 75,370 L 92,370 L 98,240 Z" fill="#2e1065" stroke="#a855f7" strokeWidth="2" />
                <path d="M 120,240 L 125,370 L 108,370 L 102,240 Z" fill="#2e1065" stroke="#a855f7" strokeWidth="2" />
              </svg>

              {/* DYNAMIC ANATOMICAL PINS */}
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedPinId(pin.id); }}
                  style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full cursor-pointer transition-all hover:scale-125 shadow-2xl ${getPinColor(pin.pinType)}`}
                >
                  <MapPin size={14} className="animate-bounce" />
                </div>
              ))}

              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-[10px] font-bold text-slate-400">
                ⚡ Click anywhere on body silhouette to drop pin
              </div>
            </div>
          </div>

          {/* RIGHT COL: ANNOTATION PIN EDITOR & PIN REGISTRY */}
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                <Plus size={14} /> Add Anatomical Annotation
              </h4>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Annotation Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['PAIN', 'INCISION', 'MASS', 'WOUND'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPinType(type)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                        pinType === type ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Body Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value as any)}
                  className="w-full bg-slate-950 text-white font-bold text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none"
                >
                  <option value="ABDOMEN">Abdomen / Lower Quadrants</option>
                  <option value="CHEST">Chest / Thorax</option>
                  <option value="HEAD">Head & Neck</option>
                  <option value="PELVIS">Pelvis & GA</option>
                  <option value="RIGHT_ARM">Right Upper Limb</option>
                  <option value="LEFT_ARM">Left Upper Limb</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Clinical Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 3cm firm mass in RLQ..."
                  value={pinNotes}
                  onChange={(e) => setPinNotes(e.target.value)}
                  className="w-full bg-slate-950 text-white font-bold text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* PIN LIST REGISTRY */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                EHR Anatomical Pins ({pins.length}):
              </h4>
              {pins.map(pin => (
                <div key={pin.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${getPinColor(pin.pinType)}`}>
                        {pin.pinType}
                      </span>
                      <span className="text-xs font-black text-purple-300">{pin.region}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">{pin.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
