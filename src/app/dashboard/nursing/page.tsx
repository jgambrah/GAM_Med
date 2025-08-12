
export default function NursingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nursing Station</h1>
        <p className="text-muted-foreground">
          Your central hub for patient care and vitals monitoring.
        </p>
      </div>

      <div className="p-8 border-2 border-dashed rounded-lg text-center h-96 flex items-center justify-center">
        <p className="text-muted-foreground">
          Your nursing dashboard and worklist will appear here.
        </p>
      </div>
    </div>
  );
}
