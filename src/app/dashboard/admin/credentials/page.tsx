
'use client';

import * as React from 'react';
import { CredentialsDashboard } from './components/credentials-dashboard';

export default function CredentialsPage() {

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Credentials Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage staff licenses and certifications across the hospital.
        </p>
      </div>
      <CredentialsDashboard />
    </div>
  );
}
