'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }

  // This logic allows for both automatic initialization in a hosting environment
  // and manual initialization with a config object for local development.

  try {
    // First, try to initialize without a config. This will succeed if Firebase
    // hosting environment variables are present.
    const app = initializeApp();
    console.log("Firebase initialized automatically via hosting environment.");
    return getSdks(app);
  } catch (e: any) {
    // If automatic initialization fails, check if we have a valid config object.
    if (firebaseConfig && firebaseConfig.projectId) {
      console.log("Automatic initialization failed, falling back to firebaseConfig object.");
      const app = initializeApp(firebaseConfig);
      return getSdks(app);
    } else {
      // If we are here, it means auto-init failed AND the firebaseConfig is missing.
      console.error(
        "Firebase initialization failed. No hosting environment detected and firebaseConfig is incomplete. Ensure your NEXT_PUBLIC_FIREBASE_... environment variables are set."
      );
      // We throw a more specific error to guide the developer.
      throw new Error(
        "Firebase configuration is missing. Please set up your .env.local file with the correct Firebase credentials."
      );
    }
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
