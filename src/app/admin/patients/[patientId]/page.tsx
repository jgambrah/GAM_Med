import { allPatients } from "@/lib/data";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function PatientDetailsPage({ params }: { params: { patientId: string } }) {
  const patient = allPatients.find(p => p.patientId === params.patientId);

  if (!patient) {
    notFound();
  }
  
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
          <AvatarImage src={`https://placehold.co/100x100/E3F2FD/333?text=${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`} alt={patient.fullName} />
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
      
      {/* Placeholder for future tabs like Admissions History, Clinical Notes, etc. */}
       <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-64">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight font-headline">
              Admissions & Notes
            </h3>
            <p className="text-sm text-muted-foreground">
              This area will contain tabs for admission history, clinical notes, and billing information.
            </p>
          </div>
        </div>

    </div>
  );
}
