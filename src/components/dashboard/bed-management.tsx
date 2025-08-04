
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BedDouble, User, Wrench, Ban, Sparkles } from "lucide-react"
import type { Bed, Patient } from "@/lib/types"
import { allBeds, allPatients } from "@/lib/data"
import { cn } from "@/lib/utils"
import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PatientAdmissionForm } from "./patient-admission-form"
import { useToast } from "@/hooks/use-toast"
import { BedTransferForm } from "./bed-transfer-form"
import { markBedAsCleanAction } from "@/lib/actions"
import { Button } from "../ui/button"

const statusConfig = {
    occupied: {
        icon: BedDouble,
        label: "Occupied",
        color: "bg-blue-100 border-blue-200 text-blue-800",
        badge: "default" as const,
        cursor: "cursor-pointer hover:shadow-lg hover:border-blue-300",
    },
    vacant: {
        icon: BedDouble,
        label: "Vacant",
        color: "bg-green-100 border-green-200 text-green-800",
        badge: "default" as const,
        cursor: "cursor-pointer hover:shadow-lg hover:border-green-300",
    },
    maintenance: {
        icon: Wrench,
        label: "Maintenance",
        color: "bg-red-100 border-red-200 text-red-800",
        badge: "destructive" as const,
        cursor: "cursor-not-allowed",
    },
    cleaning: {
        icon: Sparkles,
        label: "Cleaning",
        color: "bg-yellow-100 border-yellow-200 text-yellow-800",
        badge: "secondary" as const,
        cursor: "cursor-pointer hover:shadow-lg hover:border-yellow-300",
    }
}


export function BedManagement() {
  const { toast } = useToast();
  const [beds, setBeds] = React.useState(allBeds);
  const [wards, setWards] = React.useState([...new Set(beds.map(b => b.wardName))]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [dialogContent, setDialogContent] = React.useState<React.ReactNode | null>(null);
  const [dialogTitle, setDialogTitle] = React.useState("");
  const [selectedBed, setSelectedBed] = React.useState<Bed | null>(null);

  const handleDataRefresh = () => {
    // In a real app, you'd fetch the latest data from your server.
    // For this mock, we'll just force a re-render by creating a new array reference.
    const newBeds = [...allBeds];
    setBeds(newBeds);
  }

  const handleMarkClean = async () => {
      if (!selectedBed) return;
      const result = await markBedAsCleanAction({ bedId: selectedBed.bedId });
      if (result.success) {
          toast({ title: "Bed Status Updated", description: result.message });
          handleDataRefresh();
      } else {
          toast({ variant: "destructive", title: "Update Failed", description: result.message });
      }
      setIsAlertOpen(false);
      setSelectedBed(null);
  }

  const handleBedClick = (bed: Bed) => {
    if (bed.status === 'maintenance') {
      toast({ variant: "destructive", title: "Bed Unavailable", description: `This bed is currently under ${bed.status} and cannot be used.` });
      return;
    }
    
    if (bed.status === 'cleaning') {
      setSelectedBed(bed);
      setIsAlertOpen(true);
      return;
    }

    if (bed.status === 'vacant') {
      setDialogTitle(`Admit Patient to Bed ${bed.bedId}`);
      const patientToAdmit = allPatients.find(p => !p.isAdmitted);
      if (!patientToAdmit) {
        toast({ variant: "destructive", title: "No Patients to Admit", description: "There are no outpatients available to be admitted." });
        return;
      }
      setDialogContent(<PatientAdmissionForm patient={patientToAdmit} onFormSubmit={() => {
          setIsDialogOpen(false);
          toast({ title: "Patient Admitted", description: `Patient has been assigned to bed ${bed.bedId}`});
          handleDataRefresh();
      }} />);
      setIsDialogOpen(true);
    }

    if (bed.status === 'occupied' && bed.currentPatientId && bed.currentAdmissionId) {
      const patient = allPatients.find(p => p.patientId === bed.currentPatientId);
      if (patient) {
        setDialogTitle(`Transfer Patient: ${patient.fullName}`);
        setDialogContent(<BedTransferForm patient={patient} admissionId={bed.currentAdmissionId} currentBed={bed} onFormSubmit={() => {
          setIsDialogOpen(false);
          toast({ title: "Transfer Successful", description: `${patient.fullName} has been transferred.` });
          handleDataRefresh();
        }} />);
        setIsDialogOpen(true);
      }
    }
  }


  return (
    <>
     <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Bed Management</CardTitle>
          <CardDescription>Click on a bed to perform an action like admission or transfer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {wards.map(ward => (
                <div key={ward}>
                    <h3 className="text-lg font-semibold mb-3 font-headline">{ward} Ward</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {beds.filter(b => b.wardName === ward).map(bed => {
                            const config = statusConfig[bed.status];
                            return (
                                <div 
                                    key={bed.bedId} 
                                    className={cn("rounded-lg border p-4 flex flex-col items-center justify-center space-y-2 transition-shadow", config.color, config.cursor)}
                                    onClick={() => handleBedClick(bed)}
                                >
                                    <config.icon className="w-8 h-8"/>
                                    <p className="font-bold text-lg">{bed.bedId}</p>
                                    <Badge variant={config.badge}>{config.label}</Badge>
                                    {bed.status === 'occupied' && bed.currentPatientId ? (
                                        <div className="flex items-center text-xs pt-1 text-center">
                                            <User className="w-3 h-3 mr-1" />
                                            <span>{allPatients.find(p => p.patientId === bed.currentPatientId)?.fullName || 'Unknown'}</span>
                                        </div>
                                    ) : bed.status === 'vacant' ? (
                                         <div className="flex items-center text-xs pt-1 text-center text-transparent">
                                            <Ban className="w-3 h-3 mr-1" />
                                            <span>-</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-xs pt-1 text-center">
                                            <Ban className="w-3 h-3 mr-1" />
                                            <span>Unavailable</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{dialogTitle}</DialogTitle>
              </DialogHeader>
              {dialogContent}
          </DialogContent>
      </Dialog>
      
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bed Cleaning</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark Bed {selectedBed?.bedId} as clean and available? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBed(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkClean}>Confirm & Mark as Vacant</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
