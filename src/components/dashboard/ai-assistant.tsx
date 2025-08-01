"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";
import * as React from "react";

export function AiAssistant() {
  const [prompt, setPrompt] = React.useState("");

  const handleSend = () => {
    // In a real application, you would send the prompt to your AI backend here.
    // For now, we can just log it to the console as a test.
    console.log("User prompt:", prompt);
    alert(`AI Assistant received: "${prompt}"`);
    setPrompt("");
  };

  return (
    <Alert>
      <Sparkles className="h-4 w-4" />
      <AlertTitle>AI Assistant</AlertTitle>
      <AlertDescription>
        Ask the assistant to make changes to your app.
      </AlertDescription>
      <div className="mt-4 space-y-2">
        <Textarea
          placeholder="e.g., 'Change the primary color to green'"
          className="w-full text-sm"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <Button size="sm" className="w-full" onClick={handleSend} disabled={!prompt}>
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>
    </Alert>
  );
}
