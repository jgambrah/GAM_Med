
import * as React from 'react';
import { MainNavClient } from './main-nav-client';

export function MainNav() {
  // This component remains a Server Component by default,
  // and delegates the client-side logic to MainNavClient.
  return <MainNavClient />;
}
