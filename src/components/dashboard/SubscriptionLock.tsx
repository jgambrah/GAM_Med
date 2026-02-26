
'use client';

import { PricingSection } from '@/components/landing/PricingSection';
import { ShieldAlert, CreditCard, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * == Trial Paywall UI ==
 * 
 * This component is rendered as an immovable overlay when a hospital's 
 * trial has expired. It blocks clinical data access while providing 
 * clear paths to upgrade via the PricingSection.
 */
export function SubscriptionLock() {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-4xl w-full space-y-12">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
                            <ShieldAlert className="h-12 w-12 text-red-500 animate-pulse" />
                        </div>
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight">Access Suspended</h1>
                    <p className="text-slate-400 text-xl max-w-2xl mx-auto font-medium">
                        Your 30-day free trial has concluded. To continue using GamMed for clinical and financial operations, please select a plan.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm font-bold uppercase tracking-widest">
                        <CreditCard size={14} />
                        Data is Secure: Resume access instantly after upgrade
                    </div>
                </div>
                
                <div className="bg-white rounded-3xl p-2 shadow-2xl">
                    <PricingSection />
                </div>
                
                <div className="flex flex-col items-center gap-4 pt-8">
                    <Button 
                        variant="link" 
                        className="text-slate-500 hover:text-white transition-colors gap-2"
                        onClick={() => window.location.href = 'mailto:support@gammed.com'}
                    >
                        <Mail size={16} />
                        Need more time? Contact Platform Support
                    </Button>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">
                        GamMed Cloud Platform &copy; 2024
                    </p>
                </div>
            </div>
        </div>
    );
}
