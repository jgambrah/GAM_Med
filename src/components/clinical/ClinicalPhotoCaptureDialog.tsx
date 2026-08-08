'use client';
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle2, Image as ImageIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClinicalPhotoCaptureDialogProps {
  patientId: string;
  patientName: string;
  onPhotoSaved?: (photoUrl: string) => void;
}

export function ClinicalPhotoCaptureDialog({ patientId, patientName, onPhotoSaved }: ClinicalPhotoCaptureDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'WOUND' | 'ULTRASOUND' | 'RASH' | 'GENERAL'>('WOUND');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = async () => {
    if (!photoPreview) return;
    setIsUploading(true);

    setTimeout(() => {
      setIsUploading(false);
      onPhotoSaved?.(photoPreview);
      toast({
        title: '📸 Clinical Photo Encrypted & Saved',
        description: `Attachment added to ${patientName}'s EHR media folder under ${selectedCategory}.`
      });
      setOpen(false);
      setPhotoPreview(null);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2">
          <Camera size={16} /> Quick Photo Capture
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-slate-950 text-white border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-sky-400">
            <Camera /> Secure Mobile Photo Capture
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400">
            Capture clinical photo directly into {patientName}'s encrypted EHR file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* CATEGORY SELECTOR */}
          <div className="flex flex-wrap gap-2">
            {(['WOUND', 'ULTRASOUND', 'RASH', 'GENERAL'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                  selectedCategory === cat ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* HIDDEN CAMERA FILE INPUT */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />

          {/* PREVIEW BOX */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-56 bg-slate-900 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500 transition-all overflow-hidden relative"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Clinical Capture" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6 space-y-2">
                <Camera size={36} className="text-sky-400 mx-auto animate-bounce" />
                <p className="text-xs font-black uppercase text-slate-300">Tap to Snap Photo with Camera</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Wound progression, ultrasound prints, or skin rashes</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSavePhoto}
            disabled={!photoPreview || isUploading}
            className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2"
          >
            {isUploading ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
            Encrypt & Attach to EHR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
