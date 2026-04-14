'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: This function has been updated to be more resilient.
export function initializeFirebase() {
  // If an app is already initialized, return its services.
  if (getApps().length) {
    return getSdks(getApp());
  }

  // The "Solid" Fix: Always initialize with the config object.
  // This handles both local and hosting environments correctly as long as
  // environment variables are properly set.
  if (firebaseConfig && firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig);
    console.log("Firebase initialized with provided config.");
    return getSdks(app);
  } else {
    // If we are here, it means the firebaseConfig is missing or incomplete.
    console.error(
      "Firebase initialization failed. firebaseConfig is incomplete. Ensure your NEXT_PUBLIC_FIREBASE_... environment variables are set."
    );
    throw new Error(
      "Firebase configuration is missing or incomplete. Please set up your .env.local file with the correct Firebase credentials."
    );
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
