'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { mockMessages, allUsers } from '@/lib/data';
import { Message, User } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Send, Paperclip } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { NewMessageDialog } from './components/new-message-dialog';

function ConversationList({ conversations, onSelect, selectedConversationId }: { conversations: any[], onSelect: (id: string) => void, selectedConversationId?: string }) {
    const { user } = useAuth();

    return (
        <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
                {conversations.map(convo => (
                     <button
                        key={convo.id}
                        onClick={() => onSelect(convo.id)}
                        className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            selectedConversationId === convo.id 
                                ? "bg-primary text-primary-foreground border-primary" 
                                : "hover:bg-accent"
                        )}
                    >
                        <div className="flex items-center gap-3">
                             <Avatar className="h-10 w-10">
                                <AvatarImage src={convo.otherUser.photoURL} alt={convo.otherUser.name} />
                                <AvatarFallback>{convo.otherUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 truncate">
                                <p className="font-semibold">{convo.otherUser.name}</p>
                                <p className="text-xs truncate">{convo.lastMessage.messageBody}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </ScrollArea>
    )
}

function MessageArea({ messages, onSendMessage }: { messages: Message[], onSendMessage: (text: string) => void }) {
    const { user } = useAuth();
    const [newMessage, setNewMessage] = React.useState('');
    const inputRef = React.useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage('');
    }

     React.useEffect(() => {
        inputRef.current?.focus();
    }, [messages]);

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-grow p-4">
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div key={msg.messageId} className={cn("flex items-end gap-2", msg.senderId === user?.uid ? 'justify-end' : 'justify-start')}>
                             {msg.senderId !== user?.uid && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={allUsers.find(u => u.uid === msg.senderId)?.photoURL} />
                                    <AvatarFallback>{allUsers.find(u => u.uid === msg.senderId)?.name.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                             )}
                            <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg", msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                <p className="text-sm whitespace-pre-wrap">{msg.messageBody}</p>
                                {msg.attachmentUrl && (
                                    <Button asChild variant={msg.senderId === user?.uid ? 'secondary' : 'outline'} size="sm" className="mt-2">
                                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                            <Paperclip className="h-4 w-4 mr-2" />
                                            {msg.attachmentName || 'View Attachment'}
                                        </a>
                                    </Button>
                                )}
                                <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(msg.timestamp), 'p')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="p-4 border-t flex items-center gap-2">
                <Textarea 
                    ref={inputRef}
                    placeholder="Type your message..." 
                    className="flex-grow" 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <Button onClick={handleSend} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}


export default function MessagesPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = React.useState<any[]>([]);
    const [selectedConversationId, setSelectedConversationId] = React.useState<string | undefined>();
    const [messages, setMessages] = useLocalStorage<Message[]>('messages', mockMessages);
    
    React.useEffect(() => {
        if (!user) return;
        
        const myMessages = messages.filter(m => m.senderId === user.uid || m.receiverId === user.uid);
        const convos = myMessages.reduce((acc, msg) => {
            const otherUserId = msg.senderId === user.uid ? msg.receiverId : msg.senderId;
            if (!acc[otherUserId]) {
                const otherUser = allUsers.find(u => u.uid === otherUserId);
                if (!otherUser) return acc; // Skip if other user not found

                acc[otherUserId] = {
                    id: otherUserId,
                    otherUser: otherUser,
                    messages: []
                };
            }
            acc[otherUserId].messages.push(msg);
            return acc;
        }, {} as Record<string, { id: string, otherUser: User | undefined, messages: Message[] }>);

        const convosArray = Object.values(convos).map(c => ({
            ...c,
            lastMessage: c.messages.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
        })).sort((a,b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

        setConversations(convosArray);
        if (convosArray.length > 0 && !selectedConversationId) {
            setSelectedConversationId(convosArray[0].id);
        }

    }, [user, messages, selectedConversationId]);
    
    const handleNewMessage = (newMessage: Message) => {
        setMessages(prev => [newMessage, ...prev]);
        setSelectedConversationId(newMessage.receiverId);
    }

    const handleSendMessage = (text: string) => {
        if (!user || !selectedConversationId) return;

        const newMessage: Message = {
            messageId: `msg-${Date.now()}`,
            hospitalId: user.hospitalId,
            senderId: user.uid,
            senderName: user.name,
            receiverId: selectedConversationId,
            messageBody: text,
            timestamp: new Date().toISOString(),
            isRead: false,
        };
        setMessages(prev => [...prev, newMessage]);
    }
    
    const selectedConversation = conversations.find(c => c.id === selectedConversationId);
    const displayedMessages = selectedConversation ? messages.filter(m => 
        (m.senderId === user?.uid && m.receiverId === selectedConversationId) ||
        (m.receiverId === user?.uid && m.senderId === selectedConversationId)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [];


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Secure Messaging</h1>
                    <p className="text-muted-foreground">
                        Communicate directly with your care team or patients.
                    </p>
                </div>
                <NewMessageDialog onMessageSent={handleNewMessage} />
            </div>
            <Card className="h-[75vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                    <div className="md:col-span-1 border-r">
                         <ConversationList 
                            conversations={conversations} 
                            onSelect={setSelectedConversationId}
                            selectedConversationId={selectedConversationId}
                        />
                    </div>
                    <div className="md:col-span-2">
                        {selectedConversation ? (
                            <MessageArea messages={displayedMessages} onSendMessage={handleSendMessage} />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">Select a conversation to start messaging.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
