'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tiers = [
  {
    name: 'Clinic Starter',
    price: '₵2,500',
    description: 'Perfect for small private clinics and specialized practices.',
    features: [
      'Patient Registration & EHR',
      'Vital Signs Tracking',
      'Appointment Scheduling',
      'Basic Billing',
      '10 Staff Accounts'
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '₵7,500',
    description: 'Full-scale management for general hospitals and multi-department facilities.',
    features: [
      'Everything in Starter',
      'Pharmacy & Lab Modules',
      'Inpatient & Bed Management',
      'Inventory & Procurement',
      'Unlimited Staff Accounts',
      'Custom Financial Reports'
    ],
    cta: 'Get Started',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Advanced features for teaching hospitals and medical centers.',
    features: [
      'Everything in Professional',
      'Surgical & OT Module',
      'Radiology (PACS) Integration',
      'Government Compliance API',
      'Multi-Branch Syncing',
      '24/7 Priority Support'
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-blue-900 sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Choose the plan that fits your facility size. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={`relative p-8 border rounded-2xl flex flex-col ${
                tier.popular ? 'border-blue-600 shadow-xl scale-105 z-10' : 'border-slate-200'
              }`}
            >
              {tier.popular && (
                <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                <p className="text-sm text-slate-500 mt-2 h-10">{tier.description}</p>
                <p className="mt-6">
                  <span className="text-4xl font-extrabold text-slate-900">{tier.price}</span>
                  {tier.price !== 'Custom' && <span className="text-slate-500 text-sm font-medium"> /month</span>}
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="h-5 w-5 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                variant={tier.popular ? 'default' : 'outline'} 
                className={`w-full py-6 text-lg ${tier.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
