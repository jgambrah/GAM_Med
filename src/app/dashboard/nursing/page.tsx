
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NursingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nursing Station</h1>
        <p className="text-muted-foreground">
          Your central hub for patient care and vitals monitoring.
        </p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>My Ward Patients</CardTitle>
            <CardDescription>Select a patient to manage their care plan and log vitals.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="p-8 border-2 border-dashed rounded-lg text-center h-96 flex items-center justify-center">
                <p className="text-muted-foreground">
                    The patient worklist and vitals dashboard will be implemented here.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
