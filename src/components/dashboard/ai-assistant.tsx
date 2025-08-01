"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Send, Loader2 } from "lucide-react";
import * as React from "react";
import { assistantFlow } from "@/ai/flows/assistantFlow";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AiAssistant() {
  const [prompt, setPrompt] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);


  React.useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages])

  const handleSend = async () => {
    if (!prompt.trim()) return;

    setIsSending(true);
    const userMessage: Message = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt("");

    try {
        const response = await assistantFlow({ prompt });
        const assistantMessage: Message = { role: 'assistant', content: response };
        setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
        console.error("Error calling assistant flow:", error);
        const errorMessage: Message = { role: 'assistant', content: "Sorry, I encountered an error. Please try again." };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsSending(false);
    }
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
            Ask me anything about the hospital, patients, or schedules.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div ref={chatContainerRef} className="h-64 rounded-lg border bg-muted p-4 space-y-4 overflow-y-auto">
            {messages.length === 0 ? (
                 <p className="text-sm text-muted-foreground">Chat history will appear here.</p>
            ) : (
                messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                           <p className="text-sm">{message.content}</p>
                        </div>
                    </div>
                ))
            )}
          </div>
          <div className="relative">
            <Textarea
              placeholder="e.g., 'How many patients are currently admitted?'"
              className="w-full text-sm pr-20"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
              }}
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
