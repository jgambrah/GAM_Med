"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Send, Loader2 } from "lucide-react";
import * as React from "react";

export function AiAssistant() {
  const [prompt, setPrompt] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const handleSend = () => {
    setIsSending(true);
    // In a real application, you would send the prompt to your AI backend here.
    // For now, we can just log it to the console as a test.
    console.log("User prompt:", prompt);
    
    // Simulate network delay
    setTimeout(() => {
        alert(`AI Assistant received: "${prompt}"`);
        setPrompt("");
        setIsSending(false);
    }, 1000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            AI Assistant
          </DialogTitle>
          <DialogDescription>
            Ask the assistant to make changes to your app. Provide clear, specific instructions.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {/* This could be a chat history in the future */}
          <div className="h-64 rounded-lg border bg-muted p-4">
            <p className="text-sm text-muted-foreground">Chat history will appear here.</p>
          </div>
          <div className="relative">
            <Textarea
              placeholder="e.g., 'Change the primary color to green'"
              className="w-full text-sm pr-20"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
            <Button 
                size="sm" 
                className="absolute bottom-2 right-2" 
                onClick={handleSend} 
                disabled={!prompt || isSending}
            >
              {isSending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                </>
              ) : (
                <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
