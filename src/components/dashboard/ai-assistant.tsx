"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";

export function AiAssistant() {
  return (
    <Alert>
      <Sparkles className="h-4 w-4" />
      <AlertTitle>AI Assistant</AlertTitle>
      <AlertDescription>
        Your AI assistant is ready. You can ask it to make changes to your app.
      </AlertDescription>
    </Alert>
  );
}
