
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BedDouble, User, Wrench, Ban, Sparkles, X } from "lucide-react"
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
import { markBedAsCleanAction, transferPatientBedAction } from "@/lib/actions"
import { Button } from "../ui/button"
import { Loader2 } from "lucide-react"

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
  
  // State for dialogs/alerts
  const [isAdmissionDialogOpen, setIsAdmissionDialogOpen] = React.useState(false);
  const [isCleaningAlertOpen, setIsCleaningAlertOpen] = React.useState(false);
  const [isTransferConfirmAlertOpen, setIsTransferConfirmAlertOpen] = React.useState(false);
  
  // State for data handling
  const [selectedBed, setSelectedBed] = React.useState<Bed | null>(null);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // State for the new transfer workflow
  const [isTransferMode, setIsTransferMode] = React.useState(false);
  const [transferSource, setTransferSource] = React.useState<{ patient: Patient; currentBed: Bed } | null>(null);

  const handleDataRefresh = () => {
    // In a real app, you'd fetch the latest data from your server.
    // For this mock, we'll just force a re-render by creating a new array reference.
    const newBeds = [...allBeds];
    setBeds(newBeds);
  }

  const handleMarkClean = async () => {
      if (!selectedBed) return;
      setIsSubmitting(true);
      const result = await markBedAsCleanAction({ bedId: selectedBed.bedId });
      if (result.success) {
          toast({ title: "Bed Status Updated", description: result.message });
          handleDataRefresh();
      } else {
          toast({ variant: "destructive", title: "Update Failed", description: result.message });
      }
      setIsSubmitting(false);
      setIsCleaningAlertOpen(false);
      setSelectedBed(null);
  }

  const handleBedTransfer = async () => {
      if (!transferSource || !selectedBed) return;

      setIsSubmitting(true);
      const result = await transferPatientBedAction({
        admissionId: transferSource.currentBed.currentAdmissionId!,
        newBedId: selectedBed.bedId,
      });

      if (result.success) {
        toast({ title: "Transfer Successful", description: result.message });
        handleDataRefresh();
      } else {
        toast({ variant: "destructive", title: "Transfer Failed", description: result.message });
      }

      // Reset all states
      setIsSubmitting(false);
      setIsTransferMode(false);
      setTransferSource(null);
      setSelectedBed(null);
      setIsTransferConfirmAlertOpen(false);
  }

  const handleBedClick = (bed: Bed) => {
    if (isSubmitting) return;

    // --- Transfer Workflow ---
    if (isTransferMode) {
        if (bed.status === 'vacant') {
            setSelectedBed(bed);
            setIsTransferConfirmAlertOpen(true);
        } else {
            toast({ variant: "destructive", title: "Invalid Selection", description: "Please select a vacant bed for the transfer."})
        }
        return;
    }

    // --- Standard Workflow ---
    if (bed.status === 'maintenance') {
      toast({ variant: "destructive", title: "Bed Unavailable", description: `This bed is currently under maintenance and cannot be used.` });
      return;
    }
    
    if (bed.status === 'cleaning') {
      setSelectedBed(bed);
      setIsCleaningAlertOpen(true);
      return;
    }

    if (bed.status === 'vacant') {
      const patientToAdmit = allPatients.find(p => !p.isAdmitted);
       if (!patientToAdmit) {
        toast({ variant: "destructive", title: "No Patients to Admit", description: "There are no outpatients available to be admitted." });
        return;
      }
      setSelectedPatient(patientToAdmit);
      setIsAdmissionDialogOpen(true);
    }

    if (bed.status === 'occupied' && bed.currentPatientId) {
      const patient = allPatients.find(p => p.patientId === bed.currentPatientId);
      if (patient) {
        setIsTransferMode(true);
        setTransferSource({ patient, currentBed: bed });
        toast({ title: "Transfer Mode Activated", description: `Select a vacant bed for ${patient.fullName}.`})
      }
    }
  }


  return (
    <>
     <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Bed Management</CardTitle>
              <CardDescription>
                {isTransferMode 
                    ? `Transferring ${transferSource?.patient.fullName}. Please select a vacant bed.`
                    : "Click on a bed to perform an action like admission or transfer."
                }
              </CardDescription>
            </div>
            {isTransferMode && (
                <Button variant="destructive" onClick={() => {
                    setIsTransferMode(false);
                    setTransferSource(null);
                }}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Transfer
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {wards.map(ward => (
                <div key={ward}>
                    <h3 className="text-lg font-semibold mb-3 font-headline">{ward} Ward</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {beds.filter(b => b.wardName === ward).map(bed => {
                            const config = statusConfig[bed.status];
                            const isClickable = !isTransferMode || bed.status === 'vacant';

                            return (
                                <div 
                                    key={bed.bedId} 
                                    className={cn(
                                      "rounded-lg border p-4 flex flex-col items-center justify-center space-y-2 transition-all ease-in-out duration-200", 
                                      config.color, 
                                      isClickable ? config.cursor : "cursor-not-allowed opacity-50",
                                      isTransferMode && bed.status === 'vacant' && "animate-pulse border-2 border-green-500 shadow-lg ring-4 ring-green-300 ring-opacity-50",
                                      isTransferMode && bed.status !== 'vacant' && "grayscale"
                                    )}
                                    onClick={() => isClickable && handleBedClick(bed)}
                                >
                                    <config.icon className="w-8 h-8"/>
                                    <p className="font-bold text-lg">{bed.bedId} <span className="text-sm font-normal text-muted-foreground">({bed.roomNumber})</span></p>
                                    <Badge variant={config.badge}>{config.label}</Badge>
                                    {bed.status === 'occupied' && bed.currentPatientId ? (
                                        <div className="flex items-center text-xs pt-1 text-center">
                                            <User className="w-3 h-3 mr-1" />
                                            <span>{allPatients.find(p => p.patientId === bed.currentPatientId)?.fullName || 'Unknown'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-xs pt-1 text-center text-transparent">
                                            <Ban className="w-3 h-3 mr-1" />
                                            <span>-</span>
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
      
      <Dialog open={isAdmissionDialogOpen} onOpenChange={setIsAdmissionDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Admit Patient: {selectedPatient?.fullName}</DialogTitle>
                   <DialogDescription>
                    Fill out the admission details below.
                  </DialogDescription>
              </DialogHeader>
              {selectedPatient && 
                <PatientAdmissionForm patient={selectedPatient} onFormSubmit={() => {
                  setIsAdmissionDialogOpen(false);
                  toast({ title: "Patient Admitted", description: `${selectedPatient.fullName} has been admitted.`});
                  handleDataRefresh();
                }} />
              }
          </DialogContent>
      </Dialog>
      
       <AlertDialog open={isCleaningAlertOpen} onOpenChange={setIsCleaningAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bed Cleaning</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark Bed {selectedBed?.bedId} as clean and available? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBed(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkClean} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Mark as Vacant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isTransferConfirmAlertOpen} onOpenChange={setIsTransferConfirmAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Patient Transfer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to transfer <span className="font-bold">{transferSource?.patient.fullName}</span> from bed <span className="font-mono">{transferSource?.currentBed.bedId}</span> to bed <span className="font-mono">{selectedBed?.bedId}</span>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setSelectedBed(null);
                setIsTransferConfirmAlertOpen(false);
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBedTransfer} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Transfer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </>
  )
}
