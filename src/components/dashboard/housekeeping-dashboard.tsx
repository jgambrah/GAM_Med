
"use client";

import * as React from "react";
import { allBeds } from "@/lib/data";
import type { Bed } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, BedDouble } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { markBedAsCleanAction } from "@/lib/actions";

export default function HousekeepingDashboard() {
  const { toast } = useToast();
  const [beds, setBeds] = React.useState<Bed[]>(allBeds);
  const [isSubmitting, setIsSubmitting] = React.useState<string | null>(null);

  const bedsToClean = React.useMemo(() => {
    return beds.filter((b) => b.status === "cleaning");
  }, [beds]);
  
  const handleDataRefresh = () => {
    // In a real app, you would refetch data. Here, we simulate by creating a new array reference.
    setBeds([...allBeds]);
  };

  const handleMarkClean = async (bedId: string) => {
    setIsSubmitting(bedId);
    const result = await markBedAsCleanAction({ bedId });
    if (result.success) {
      toast({
        title: "Bed Status Updated",
        description: result.message,
      });
      handleDataRefresh();
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: result.message,
      });
    }
    setIsSubmitting(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Housekeeping Tasks
        </h2>
        <p className="text-muted-foreground">
          A list of all beds that require cleaning.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beds Pending Cleaning</CardTitle>
          <CardDescription>
            These beds have been vacated and are awaiting cleaning before they
            can be assigned to a new patient.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bedsToClean.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bed ID</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bedsToClean.map((bed) => (
                  <TableRow key={bed.bedId}>
                    <TableCell className="font-mono">{bed.bedId}</TableCell>
                    <TableCell>{bed.wardName}</TableCell>
                    <TableCell>{bed.roomNumber}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" disabled={isSubmitting === bed.bedId}>
                            {isSubmitting === bed.bedId ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Mark as Clean
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Confirm Bed is Clean
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will mark bed {bed.bedId} as clean and
                              available for new patients. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleMarkClean(bed.bedId)}
                            >
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
              <BedDouble className="w-12 h-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No beds are currently pending cleaning.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                When a patient is discharged or transferred, the bed will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
