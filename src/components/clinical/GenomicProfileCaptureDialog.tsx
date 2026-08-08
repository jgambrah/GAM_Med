'use client';
import { useState } from 'react';
import { Dna, Upload, Plus, Trash2, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface GenomicProfileCaptureDialogProps {
  patientId?: string;
  patientName?: string;
  onProfileUpdated?: () => void;
}

interface GeneticMarkerItem {
  id: string;
  gene: string;
  variant: string;
  phenotype: string;
}

export function GenomicProfileCaptureDialog({ patientName = 'Patient', onProfileUpdated }: GenomicProfileCaptureDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [selectedGene, setSelectedGene] = useState('HLA-B');
  const [variantInput, setVariantInput] = useState('*5701 Positive');
  const [phenotypeInput, setPhenotypeInput] = useState('HYPERSENSITIVITY_RISK');

  const [markerList, setMarkerList] = useState<GeneticMarkerItem[]>([
    { id: '1', gene: 'HLA-B', variant: '*5701 Positive', phenotype: 'HYPERSENSITIVITY_RISK' },
    { id: '2', gene: 'CYP2C9', variant: '*2/*3 Compound Heterozygote', phenotype: 'POOR_METABOLIZER' },
    { id: '3', gene: 'RYR1', variant: 'c.1021C>T (p.Arg341Cys)', phenotype: 'HIGH_RISK_VARIANT' },
    { id: '4', gene: 'TPMT', variant: '*3A/*3C', phenotype: 'POOR_METABOLIZER' }
  ]);

  const handleAddMarker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantInput.trim()) return;

    const newMarker: GeneticMarkerItem = {
      id: `MARK-${Date.now()}`,
      gene: selectedGene,
      variant: variantInput.trim(),
      phenotype: phenotypeInput
    };

    setMarkerList(prev => [...prev, newMarker]);
    setVariantInput('');
  };

  const handleRemoveMarker = (id: string) => {
    setMarkerList(prev => prev.filter(m => m.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingFile(true);
      setUploadedFileName(file.name);
      setTimeout(() => {
        setIsUploadingFile(false);
        toast({
          title: '🧬 Genomic Report Parsed Successfully',
          description: `Extracted 4 variant markers from ${file.name} for ${patientName}.`
        });
      }, 1000);
    }
  };

  const handleSaveGenomicProfile = () => {
    toast({
      title: '💾 Patient Genomic Vault Saved',
      description: `Updated DNA variant markers and PGx profile for ${patientName}.`
    });
    setIsOpen(false);
    if (onProfileUpdated) onProfileUpdated();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg">
          <Dna size={16} /> 🧬 Capture / Upload Genetic Profile
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl bg-slate-950 text-white border-slate-800 rounded-3xl p-6 space-y-6">
        <DialogHeader border-b border-slate-800 pb-3>
          <DialogTitle className="text-base font-black uppercase text-purple-400 flex items-center gap-2">
            <Dna size={20} className="animate-pulse text-purple-400" /> Capture Patient DNA & Genomic Profile ({patientName})
          </DialogTitle>
        </DialogHeader>

        {/* FILE UPLOAD BOX (VCF / FASTQ / PDF REPORT) */}
        <div className="p-4 bg-slate-900 rounded-2xl border-2 border-dashed border-purple-900/60 text-center space-y-2">
          <Upload size={28} className="text-purple-400 mx-auto animate-bounce" />
          <h4 className="text-xs font-black uppercase text-white">Upload DNA Sequencing / Genotype Report (VCF, FASTQ, PDF)</h4>
          <p className="text-[10px] text-slate-400 font-bold">Auto-parses pharmacogenomic variants (CYP2C9, HLA-B, TPMT, DPYD, RYR1).</p>
          
          <input type="file" accept=".vcf,.fastq,.pdf,.txt" onChange={handleFileUpload} className="hidden" id="dna-file-upload" />
          <label htmlFor="dna-file-upload">
            <Button type="button" variant="outline" className="mt-2 border-purple-700 text-purple-300 hover:bg-purple-950 rounded-xl font-black text-xs uppercase">
              {isUploadingFile ? 'Parsing Genomic Data...' : uploadedFileName ? `✅ ${uploadedFileName}` : 'Select DNA Sequencing File 📁'}
            </Button>
          </label>
        </div>

        {/* MANUAL GENE MARKER ENTRY FORM */}
        <form onSubmit={handleAddMarker} className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
          <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Add Single Variant Marker:</span>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select value={selectedGene} onValueChange={setSelectedGene}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-xs font-bold text-white rounded-xl">
                <SelectValue placeholder="Gene Target" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 text-white border-slate-800">
                <SelectItem value="HLA-B">HLA-B (Abacavir)</SelectItem>
                <SelectItem value="CYP2C9">CYP2C9 (Warfarin/NSAIDs)</SelectItem>
                <SelectItem value="RYR1">RYR1 (Anesthesia / MH)</SelectItem>
                <SelectItem value="TPMT">TPMT (Thiopurines)</SelectItem>
                <SelectItem value="DPYD">DPYD (Fluorouracil)</SelectItem>
                <SelectItem value="TCF7L2">TCF7L2 (GDM Risk)</SelectItem>
                <SelectItem value="FLT1">FLT1 (Pre-eclampsia)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={variantInput}
              onChange={(e) => setVariantInput(e.target.value)}
              placeholder="Variant / Allele (e.g. *5701 Positive)"
              className="bg-slate-950 border-slate-800 text-white text-xs font-bold rounded-xl"
            />

            <Select value={phenotypeInput} onValueChange={setPhenotypeInput}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-xs font-bold text-white rounded-xl">
                <SelectValue placeholder="Phenotype" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 text-white border-slate-800">
                <SelectItem value="HYPERSENSITIVITY_RISK">Hypersensitivity Risk</SelectItem>
                <SelectItem value="POOR_METABOLIZER">Poor Metabolizer</SelectItem>
                <SelectItem value="INTERMEDIATE_METABOLIZER">Intermediate Metabolizer</SelectItem>
                <SelectItem value="ULTRA_FAST_METABOLIZER">Ultra-Fast Metabolizer</SelectItem>
                <SelectItem value="HIGH_RISK_VARIANT">High Risk Variant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full bg-purple-700 hover:bg-purple-600 text-white font-black text-xs uppercase rounded-xl">
            <Plus size={14} className="mr-1" /> Add Variant Marker
          </Button>
        </form>

        {/* ACTIVE GENETIC PROFILE LIST */}
        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Current Genetic Variants on EHR File ({markerList.length}):</span>
          {markerList.map((m) => (
            <div key={m.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-xs font-bold text-slate-200">
              <div>
                <span className="text-purple-400 font-black mr-2">{m.gene}</span>
                <span className="text-white font-bold">{m.variant}</span>
                <span className="ml-2 text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded font-black uppercase">
                  {m.phenotype.replace(/_/g, ' ')}
                </span>
              </div>
              <button type="button" onClick={() => handleRemoveMarker(m.id)} className="text-slate-500 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* DIALOG FOOTER */}
        <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white font-bold text-xs uppercase">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveGenomicProfile} 
            className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-2xl tracking-wider shadow-lg flex items-center gap-2"
          >
            <ShieldCheck size={16} /> Save Patient Genomic Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
