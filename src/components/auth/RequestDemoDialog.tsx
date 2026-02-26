'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function RequestDemoDialog() {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            hospital: formData.get('hospital'),
            phone: formData.get('phone'),
        };

        try {
            const res = await fetch('/api/public/request-demo', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                toast.success("Request Sent!", {
                    description: "Dr. Gambrah will contact you shortly to schedule your demo."
                });
                setOpen(false);
            } else {
                throw new Error("Failed to send");
            }
        } catch (err) {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm">
                    Request Demo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Schedule a GamMed Demo</DialogTitle>
                    <DialogDescription>Enter your details and our team will reach out to show you the platform.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" placeholder="Dr. John Doe" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="hospital">Hospital / Clinic Name</Label>
                        <Input id="hospital" name="hospital" placeholder="City Medical Center" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Work Email</Label>
                        <Input id="email" name="email" type="email" placeholder="name@hospital.com" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="phone" type="tel" placeholder="+233..." required />
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                        {loading ? "Sending Request..." : "Request Demo"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
