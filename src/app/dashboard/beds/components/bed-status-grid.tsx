
'use client';

import { allBeds } from '@/lib/data';
import { Bed } from '@/lib/types';
import { BedCard } from './bed-card';
import { useMemo } from 'react';

/**
 * BedStatusDashboard (Conceptual Component)
 *
 * This component renders the main visual grid for bed management.
 *
 * Structure:
 * - It fetches all bed data (from mock data in this prototype).
 * - It uses `useMemo` to efficiently group beds by their 'wardName'. This prevents
 *   re-computation on every render and is a performance best practice.
 * - It then iterates over each ward, creating a heading for the ward and a grid
 *   of `BedCard` components for each bed within that ward.
 *
 * Firestore Integration:
 * - This component would fetch all documents from the 'beds' collection.
 * - In a Next.js Server Component, this would look like:
 *   async function BedStatusGrid() {
 *     const bedsSnapshot = await db.collection('beds').orderBy('wardName').get();
 *     const allBeds = bedsSnapshot.docs.map(doc => doc.data());
 *     // ... then proceed with grouping and rendering.
 *   }
 * - For real-time updates (essential for a dashboard), you would use `onSnapshot`:
 *   useEffect(() => {
 *     const q = query(collection(db, 'beds'));
 *     const unsubscribe = onSnapshot(q, (querySnapshot) => {
 *       const bedsData = [];
 *       querySnapshot.forEach((doc) => {
 *         bedsData.push({ ...doc.data(), id: doc.id });
 *       });
 *       setBeds(bedsData); // Update state with live data
 *     });
 *     return () => unsubscribe(); // Cleanup listener on component unmount
 *   }, []);
 */
export function BedStatusGrid() {
  // In a real app, this data would be fetched from Firestore,
  // ideally with a real-time listener (onSnapshot).
  const bedsByWard = useMemo(() => {
    return allBeds.reduce((acc, bed) => {
      const ward = bed.wardName;
      if (!acc[ward]) {
        acc[ward] = [];
      }
      acc[ward].push(bed);
      return acc;
    }, {} as Record<string, Bed[]>);
  }, []);

  return (
    <div className="space-y-8">
      {Object.entries(bedsByWard).map(([ward, beds]) => (
        <div key={ward}>
          <h2 className="text-2xl font-bold tracking-tight mb-4">{ward}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {beds.map((bed) => (
              <BedCard key={bed.bed_id} bed={bed} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
