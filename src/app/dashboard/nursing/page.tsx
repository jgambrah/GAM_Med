
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
                    Your central hub for managing patient care on the ward.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>My Ward</CardTitle>
                    <CardDescription>
                        A list of all patients currently admitted to your ward.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Nurse dashboard features will be implemented here.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
