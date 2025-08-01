import { allPatients, allAdmissions } from "@/lib/data";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function PatientDetailsPage({ params }: { params: { patientId: string } }) {
  const patient = allPatients.find(p => p.patientId === params.patientId);

  if (!patient) {
    notFound();
  }

  const patientAdmissions = allAdmissions.filter(a => a.patientId === params.patientId);
  
  const getAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center space-x-4">
        <Avatar className="h-24 w-24 border">
          <AvatarImage src={`https://placehold.co/100x100/E3F2FD/333?text=${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`} alt={patient.fullName} data-ai-hint="avatar profile" />
          <AvatarFallback>{patient.firstName.charAt(0)}{patient.lastName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold font-headline">{patient.fullName}</h1>
          <p className="text-muted-foreground">Patient ID: {patient.patientId}</p>
          <Badge className="mt-2" variant={patient.isAdmitted ? "default" : "secondary"}>
            {patient.isAdmitted ? "Inpatient" : "Outpatient"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
          <CardDescription>Demographic and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Date of Birth</p>
            <p>{patient.dob} ({getAge(patient.dob)} years old)</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Gender</p>
            <p>{patient.gender}</p>
          </div>
           <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Phone Number</p>
            <p>{patient.contact.phone}</p>
          </div>
           <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Email Address</p>
            <p>{patient.contact.email || 'N/A'}</p>
          </div>
           <div className="space-y-1 md:col-span-2">
            <p className="font-medium text-muted-foreground">Address</p>
            <p>{patient.address.street}, {patient.address.city}, {patient.address.region}</p>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Name</p>
            <p>{patient.emergencyContact.name}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Relationship</p>
            <p>{patient.emergencyContact.relationship}</p>
          </div>
           <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Phone Number</p>
            <p>{patient.emergencyContact.phone}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Admission History</CardTitle>
            <CardDescription>A log of all past and current admissions for this patient.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Admission ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {patientAdmissions.length > 0 ? (
                        patientAdmissions.map((admission) => (
                            <TableRow key={admission.admissionId}>
                                <TableCell className="font-mono">{admission.admissionId}</TableCell>
                                <TableCell>{format(new Date(admission.admissionDate), "PPP")}</TableCell>
                                <TableCell>{admission.reasonForAdmission}</TableCell>
                                <TableCell>{admission.ward}</TableCell>
                                <TableCell>
                                    <Badge variant={admission.isDischarged ? "secondary" : "default"}>
                                        {admission.isDischarged ? `Discharged on ${format(new Date(admission.dischargeDate!), "PPP")}` : "Active"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No admission history found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

    </div>
  );
}
