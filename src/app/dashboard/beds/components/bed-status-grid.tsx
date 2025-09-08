

'use client';

import { allBeds } from '@/lib/data';
import { Bed } from '@/lib/types';
import { BedCard } from './bed-card';
import { useMemo } from 'react';

/**
 * BedStatusDashboard (Conceptual Component)
 *
 * This component renders the main visual grid for bed management, providing a real-time
 * overview of hospital capacity and patient placement.
 *
 * Structure:
 * - In this prototype, it fetches all bed data from a mock data file.
 * - It uses `useMemo` to efficiently group beds by their 'wardName'. This is a performance
 *   best practice that prevents re-computation on every render.
 * - It then iterates over each ward, creating a heading for the ward and a grid of
 *   `BedCard` components for each bed within that ward.
 *
 * Firestore Integration & Real-Time Updates:
 * - For a production application, this component would need to be populated with live
 *   data from the 'beds' collection in Firestore.
 * - The most effective way to do this is with a real-time listener, `onSnapshot`, which
 *   automatically pushes updates to the client whenever bed data changes in the database.
 * - This ensures that the dashboard is always up-to-date without requiring manual refreshes.
 *
 * Example Real-Time Query (using React's `useEffect` hook):
 *   useEffect(() => {
 *     const q = query(collection(db, 'beds'));
 *     const unsubscribe = onSnapshot(q, (querySnapshot) => {
 *       const bedsData = [];
 *       querySnapshot.forEach((doc) => {
 *         bedsData.push({ ...doc.data(), id: doc.id });
 *       });
 *       setBeds(bedsData); // Update component state with live data
 *     });
 *     return () => unsubscribe(); // Cleanup listener on component unmount
 *   }, []);
 */
export function BedStatusGrid() {
  // In a real app, this `allBeds` data would come from a real-time Firestore listener.
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
      {Object.entries(bedsByWard).map(([ward, beds]) => {
        const occupiedCount = beds.filter(b => b.status === 'occupied').length;
        const totalBeds = beds.length;
        
        return (
          <div key={ward}>
            <h2 className="text-2xl font-bold tracking-tight mb-4">{ward} ({occupiedCount}/{totalBeds} Occupied)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {beds.map((bed) => (
                <BedCard key={bed.bed_id} bed={bed} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  );
}

    