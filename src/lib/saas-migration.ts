
'use client';

import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  query, 
  where,
  Firestore
} from 'firebase/firestore';

/**
 * @fileOverview SaaS Data Migration Utility
 * 
 * This script performs a one-time migration of single-tenant legacy data
 * into the new logically isolated multi-tenant structure.
 */

export async function runSaaSDataMigration(db: Firestore, originalHospitalId: string = 'hosp-1') {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  console.log(`Starting migration to tenant: ${originalHospitalId}`);

  // 1. Provision the initial Hospital (Tenant) document
  const hospitalRef = doc(db, 'hospitals', originalHospitalId);
  batch.set(hospitalRef, {
    hospitalId: originalHospitalId,
    name: 'City General Hospital',
    slug: 'city-general',
    status: 'active',
    subscriptionTier: 'premium',
    createdAt: now,
  });

  // 2. Define collections that need tagging
  const collectionsToMigrate = [
    'users',
    'patients',
    'appointments',
    'admissions',
    'beds',
    'referrals',
    'invoices',
    'lab_results',
    'medication_records',
    'clinical_notes',
    'vitals_log'
  ];

  let totalUpdated = 0;

  for (const collectionName of collectionsToMigrate) {
    const colRef = collection(db, collectionName);
    
    // Query for any documents that don't have a hospitalId yet
    // Note: In some Firestore configurations, querying by null requires an index.
    // For this migration, we fetch all and check locally if necessary, or use a specific query.
    const snapshot = await getDocs(colRef);
    
    snapshot.forEach((document) => {
      const data = document.data();
      if (!data.hospitalId) {
        batch.update(document.ref, { hospitalId: originalHospitalId });
        totalUpdated++;
      }
    });
  }

  // 3. Commit the migration batch
  await batch.commit();
  
  console.log(`Migration complete. Updated ${totalUpdated} legacy documents.`);
  return { success: true, updatedCount: totalUpdated };
}
