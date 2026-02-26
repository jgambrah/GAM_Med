'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Activity, Users, BarChart3, ChevronRight, CheckCircle2 } from 'lucide-react';
import { RequestDemoDialog } from '@/components/auth/RequestDemoDialog';

/**
 * == GamMed Marketing Landing Page ==
 * 
 * The professional "Front Door" of the platform. Designed to build trust with
 * Hospital Directors by highlighting security, efficiency, and clinical depth.
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
             <Activity className="text-white h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-900">GamMed</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-blue-600 transition-colors">Login</Link>
          <RequestDemoDialog />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 lg:py-32 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-blue-600">
          The Operating System for Modern Hospitals.
        </h1>
        <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          A comprehensive, multi-tenant SaaS platform designed to streamline clinical workflows, 
          manage diagnostics, and automate hospital finances—all in one secure place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-blue-600 text-lg h-14 px-8 font-bold shadow-xl hover:bg-blue-700" asChild>
            <Link href="/login">Get Started Now <ChevronRight className="ml-2 h-5 w-5" /></Link>
          </Button>
          <Button size="lg" variant="outline" className="text-lg h-14 px-8 font-bold border-2">View Pricing</Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={<ShieldCheck className="h-8 w-8 text-blue-600" />}
            title="SaaS-First Security"
            desc="Every hospital's data is logically isolated. Our airtight, multi-tenant architecture ensures total patient privacy and regulatory compliance."
          />
          <FeatureCard 
            icon={<Activity className="h-8 w-8 text-green-600" />}
            title="Clinical Excellence"
            desc="From Surgery scheduling to Bed management, our EMR covers the entire patient journey with real-time precision."
          />
          <FeatureCard 
            icon={<BarChart3 className="h-8 w-8 text-purple-600" />}
            title="Real-time Analytics"
            desc="Directors get instant Business Intelligence on revenue, morbidity prevalence, and facility utilization to drive growth and efficiency."
          />
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto space-y-8">
        <h2 className="text-3xl font-bold tracking-tight">Built for Clinical Reliability</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">ICD-10 Compliant</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">HL7 Integrated</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Cloud Backups</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">24/7 Support</span>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t text-center bg-white">
        <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="text-blue-600 h-5 w-5" />
            <span className="text-lg font-bold text-blue-900">GamMed</span>
        </div>
        <p className="text-sm text-slate-400">© 2024 Gam It Services. All rights reserved.</p>
        <p className="text-[10px] text-slate-300 mt-2 uppercase tracking-widest font-bold">Developed by Dr. James Gambrah</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="space-y-4 p-8 bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="p-3 bg-blue-50 rounded-2xl w-fit">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}
