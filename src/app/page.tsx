'use client';

import * as React from 'react';
import { 
    ShieldCheck, Activity, BarChart3, 
    ChevronRight, CheckCircle2, Layers, Stethoscope,
    ShieldAlert, Database, Clock, Loader2, LogOut, User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestDemoDialog } from '@/components/auth/RequestDemoDialog';
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { doc, collection, query, getDoc } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from '@/components/ui/skeleton';

export default function LandingPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const auth = useAuth();
    const firestore = useFirestore();

    const pricingPlansQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'pricing_plans'));
    }, [firestore]);

    const { data: plans, isLoading: arePlansLoading } = useCollection(pricingPlansQuery);

    React.useEffect(() => {
        if (user && !user.isAnonymous && !isUserLoading && firestore) {
            const userProfileRef = doc(firestore, 'users', user.uid);
            getDoc(userProfileRef).then(userProfileSnap => {
                if (!userProfileSnap.exists()) {
                    // Fallback or error state if user profile doesn't exist
                    console.warn(`User profile not found for UID: ${user.uid}`);
                    return; 
                }

                const userProfile = userProfileSnap.data();
                const userRole = userProfile.role;

                // Priority 1: Check if password must be changed
                if (userProfile.mustChangePassword) {
                    router.replace('/auth/force-password-change');
                    return;
                }

                // Priority 2: Role-based routing
                const portalRoutes: { [key: string]: string } = {
                    'SUPER_ADMIN': '/app-ceo/dashboard',
                    'DIRECTOR': '/dashboard',
                    'ADMIN': '/dashboard',
                    'HR_MANAGER': '/hr',
                    'DOCTOR': '/doctor',
                    'NURSE': '/nurse',
                    'PHARMACIST': '/pharmacy',
                    'RECEPTIONIST': '/patients',
                    'LAB_TECH': '/lab/queue',
                    'RADIOLOGIST': '/radiology/queue',
                    'ACCOUNTANT': '/accountant',
                    'CASHIER': '/finance/billing',
                    'STORE_MANAGER': '/supply-chain',
                };
                
                const destination = userRole ? portalRoutes[userRole] : '/dashboard';
                router.replace(destination);
            }).catch(error => {
                console.error("Error fetching user profile for routing:", error);
            });
        }
    }, [user, isUserLoading, router, firestore]);
    

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/'); // Force reload to home
        }
    };

    // Show a full-page loader while checking auth state or loading the user profile for the redirect.
    // This prevents a flash of the landing page for logged-in users.
    if (isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    // If no user is logged in, or if the user is anonymous, show the landing page.
    return (
        <div className="flex flex-col min-h-screen bg-white font-sans selection:bg-blue-100">
            {/* --- NAVIGATION --- */}
            <nav className="flex items-center justify-between px-8 py-5 border-b sticky top-0 bg-white/90 backdrop-blur-md z-50">
                <div className="flex items-center gap-2">
                    <Activity className="text-primary h-8 w-8" />
                    <span className="text-2xl font-black tracking-tighter text-primary uppercase">GAM_Med</span>
                </div>
                <div className="flex items-center gap-6">
                    {user && !user.isAnonymous ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>
                                            <UserIcon className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                    {user.displayName || 'User'}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                    </p>
                                </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <>
                           <Link href="/patient/login" className="text-sm font-bold text-primary hover:text-foreground transition-colors px-4 py-2 border-2 border-primary rounded-full">
                                My Records (Patient)
                            </Link>
                            <Link href="/login" className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                                Staff Login
                            </Link>
                            <RequestDemoDialog />
                        </>
                    )}
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="px-6 py-28 text-center max-w-6xl mx-auto space-y-10">
                <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-primary leading-[0.9]">
                    The Operating System for <br />
                    <span className="text-foreground italic underline decoration-accent">Modern</span> Hospitals.
                </h1>
                <p className="text-xl text-foreground max-w-3xl mx-auto font-medium leading-relaxed">
                    A comprehensive, multi-tenant SaaS platform designed to streamline clinical workflows, 
                    manage diagnostics, and automate hospital finances—all in one secure place.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                    <Link href="/login">
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-16 px-12 text-xl rounded-full shadow-2xl shadow-blue-200 transition-all hover:scale-105">
                          Get Started Now <ChevronRight className="ml-2 h-6 w-6" />
                        </Button>
                    </Link>
                    <Button size="lg" variant="outline" className="text-foreground font-bold h-16 px-12 text-xl rounded-full border-2 border-foreground hover:bg-muted"
                        onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                        View Pricing
                    </Button>
                </div>
            </section>

            {/* --- CORE PILLARS --- */}
            <section className="py-24 border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
                    <div className="space-y-4">
                        <ShieldCheck className="text-primary h-12 w-12" />
                        <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">SaaS-First Security</h3>
                        <p className="text-foreground leading-relaxed">
                            Every hospital's data is logically isolated. Our airtight, multi-tenant architecture ensures total patient privacy and regulatory compliance.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <Stethoscope className="text-primary h-12 w-12" />
                        <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">Clinical Excellence</h3>
                        <p className="text-foreground leading-relaxed">
                            From Surgery scheduling to Bed management, our EMR covers the entire patient journey with real-time precision.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <BarChart3 className="text-primary h-12 w-12" />
                        <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">Real-time Analytics</h3>
                        <p className="text-foreground leading-relaxed">
                            Directors get instant Business Intelligence on revenue, morbidity prevalence, and facility utilization to drive growth and efficiency.
                        </p>
                    </div>
                </div>
            </section>

            {/* --- PRICING SECTION --- */}
            <section id="pricing" className="py-32 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 space-y-4">
                        <h4 className="text-primary font-black tracking-widest text-sm uppercase">Multi-Tenant Enterprise Architecture</h4>
                        <h2 className="text-5xl font-black tracking-tighter text-foreground uppercase">Simple, Transparent Pricing</h2>
                        <p className="text-foreground font-medium">Choose the plan that fits your facility size. All plans include logical data isolation as standard.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {arePlansLoading ? (
                            <>
                                <PricingCardSkeleton />
                                <PricingCardSkeleton />
                                <PricingCardSkeleton />
                            </>
                        ) : (
                            plans?.sort((a,b) => {
                                const priceA = Number(String(a.price).replace(/[^0-9.-]+/g,""));
                                const priceB = Number(String(b.price).replace(/[^0-9.-]+/g,""));
                                return priceA - priceB;
                            }).map(plan => (
                                <PricingCard 
                                    key={plan.id}
                                    title={plan.name}
                                    desc={plan.description}
                                    price={plan.price}
                                    features={plan.features}
                                    cta="Get Started"
                                    popular={plan.isPopular}
                                />
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* --- COMPLIANCE STRIP --- */}
            <section className="bg-primary py-16 text-primary-foreground px-6">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-12 lg:gap-24 items-center">
                    <div className="text-center">
                        <p className="text-3xl font-black italic uppercase tracking-tighter">Built for Clinical Reliability</p>
                    </div>
                    <div className="flex gap-10">
                        <ComplianceItem icon={<ShieldAlert size={16}/>} text="ICD-10 Compliant" />
                        <ComplianceItem icon={<Layers size={16}/>} text="HL7 Integrated" />
                        <ComplianceItem icon={<Database size={16}/>} text="Cloud Backups" />
                        <ComplianceItem icon={<Clock size={16}/>} text="24/7 Support" />
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="py-20 border-t border-slate-100 bg-white px-6">
                <div className="max-w-7xl mx-auto flex flex-col items-center space-y-6">
                    <div className="flex items-center gap-2">
                        <Activity className="text-primary h-6 w-6" />
                        <span className="text-xl font-black text-primary uppercase tracking-tighter">GAM_Med</span>
                    </div>
                    <p className="text-foreground font-bold">© 2026 GAM IT Solutions. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

const PricingCardSkeleton = () => (
    <div className="p-10 rounded-3xl border-2 border-slate-100 flex flex-col">
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="h-10 w-1/3 my-8" />
        <div className="space-y-4 mb-10 flex-grow">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
);

function PricingCard({ title, desc, price, features, cta, popular = false }: any) {
    return (
        <div className={`p-10 rounded-3xl flex flex-col transition-all border-2 ${popular ? 'border-primary shadow-2xl scale-105 z-10' : 'border-slate-100 hover:border-accent'}`}>
            {popular && <span className="bg-primary text-primary-foreground text-[10px] font-black px-4 py-1 rounded-full w-fit mb-4 uppercase tracking-widest">Most Popular</span>}
            <h3 className="text-2xl font-black text-primary uppercase mb-2">{title}</h3>
            <p className="text-foreground font-medium text-sm h-12">{desc}</p>
            <div className="my-8">
                <p className="text-4xl font-black text-foreground">{price}</p>
            </div>
            <div className="space-y-4 mb-10 flex-grow">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Included Features:</p>
                {features.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-primary shrink-0" />
                        <span className="text-foreground font-bold text-sm">{f}</span>
                    </div>
                ))}
            </div>
            <Link href="/login">
                <Button className={`w-full h-14 rounded-2xl font-black text-lg ${popular ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-foreground hover:bg-foreground/90 text-background'}`}>
                    {cta}
                </Button>
            </Link>
        </div>
    );
}

function ComplianceItem({ icon, text }: any) {
    return (
        <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded-md">{icon}</div>
            <span className="text-sm font-bold uppercase tracking-widest">{text}</span>
        </div>
    );
}
