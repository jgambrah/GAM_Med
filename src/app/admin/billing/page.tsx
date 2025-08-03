import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Billing & Finance
        </h2>
        <p className="text-muted-foreground">
          Manage patient bills, and financial reporting.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patients Pending Financial Clearance</CardTitle>
          <CardDescription>
            These patients have been clinically cleared for discharge by a
            doctor and are awaiting financial sign-off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <FileText className="w-12 h-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              No patients are currently pending financial clearance.
            </p>
             <p className="mt-2 text-sm text-muted-foreground">
              This is where the billing team would see a list of patients, review charges, and finalize the discharge.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
