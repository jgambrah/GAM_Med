'use client';

import type { GenerateDischargeInstructionsOutput } from '@/ai/flows/ai-discharge-instructions-tool';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CalendarCheck, FileText, HeartPulse, Hospital, Phone, Pill, UtensilsCrossed } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type DisplayProps = {
  instructions: GenerateDischargeInstructionsOutput | null;
  isLoading: boolean;
  error: string | null;
};

const InstructionSection = ({ icon: Icon, title, content }: { icon: React.ElementType, title: string, content?: string }) => {
  if (!content) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-6 w-6 text-primary" />
        <h3 className="text-xl font-headline font-semibold">{title}</h3>
      </div>
      <div className="prose prose-sm max-w-none text-foreground/80 ml-9" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
    </div>
  );
};

const LoadingSkeleton = () => (
    <Card className="w-full">
        <CardHeader>
            <Skeleton className="h-8 w-3/4 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-8">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-1/3 rounded-lg" />
                    </div>
                    <div className="ml-9 space-y-2">
                        <Skeleton className="h-4 w-full rounded-lg" />
                        <Skeleton className="h-4 w-5/6 rounded-lg" />
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
);

export function DischargeInstructionsDisplay({ instructions, isLoading, error }: DisplayProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
        <Card className="w-full flex flex-col items-center justify-center min-h-[400px]">
            <CardContent className="text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-headline font-semibold text-destructive">An Error Occurred</h2>
                <p className="text-muted-foreground">{error}</p>
            </CardContent>
        </Card>
    );
  }

  if (!instructions) {
    return (
      <Card className="w-full flex flex-col items-center justify-center min-h-[400px] bg-card/50 border-dashed">
        <CardContent className="text-center p-6">
            <Hospital className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-headline font-semibold text-muted-foreground">Discharge Instructions</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">Fill out the patient's details to generate personalized discharge instructions using AI.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Generated Discharge Instructions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <InstructionSection icon={FileText} title="Summary" content={instructions.summary} />
        <InstructionSection icon={Pill} title="Medication Guide" content={instructions.medicationGuide} />
        <InstructionSection icon={HeartPulse} title="Activity Recommendations" content={instructions.activityRecommendations} />
        <InstructionSection icon={CalendarCheck} title="Follow-up Appointments" content={instructions.followUpAppointments} />
        <InstructionSection icon={UtensilsCrossed} title="Diet and Lifestyle" content={instructions.dietAndLifestyle} />
        <InstructionSection icon={AlertTriangle} title="Warning Signs" content={instructions.warningSigns} />
        <InstructionSection icon={Phone} title="Emergency Contact" content={instructions.emergencyContact} />
      </CardContent>
    </Card>
  );
}
