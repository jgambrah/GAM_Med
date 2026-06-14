import { Firestore, doc, getDoc, getDocs, collection, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';

export async function autoClockOutIfNeeded(
  userId: string,
  firestore: Firestore,
  userProfile?: { hospitalId?: string }
): Promise<void> {
  // If userProfile is not provided or lacks hospitalId, fetch it
  let hospitalId = userProfile?.hospitalId;
  if (!hospitalId) {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        hospitalId = userSnap.data()?.hospitalId;
      }
    } catch (err) {
      console.error("Error fetching user profile for auto clock-out:", err);
      return;
    }
  }

  if (!hospitalId) return;

  try {
    const q = query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`),
      where("staffId", "==", userId),
      where("clockOutTime", "==", null)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const activeLogDoc = snapshot.docs[0];
      const logData = activeLogDoc.data();
      
      // Calculate elapsed hours
      let hoursWorked = 8; // fallback
      const clockInTime = logData.clockInTime?.toDate?.() || (logData.clockInTime ? new Date(logData.clockInTime.seconds * 1000) : null);
      if (clockInTime) {
        const diffMs = new Date().getTime() - clockInTime.getTime();
        hoursWorked = parseFloat(Math.max(0, diffMs / (1000 * 60 * 60)).toFixed(6));
      }

      let coords: { latitude: number; longitude: number } | null = null;
      let calculatedDistance: number | null = null;
      let flaggedForOffsiteOut = false;

      // Fetch hospital coordinates
      const hospitalRef = doc(firestore, 'hospitals', hospitalId);
      const hospitalSnap = await getDoc(hospitalRef);
      if (hospitalSnap.exists()) {
        const hospitalData = hospitalSnap.data();
        const hLat = hospitalData.latitude;
        const hLng = hospitalData.longitude;

        if (hLat !== undefined && hLat !== null && hLng !== undefined && hLng !== null) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              if (!navigator.geolocation) {
                reject(new Error("Geolocation not supported"));
                return;
              }
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
              });
            });
            coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };

            // Haversine distance in meters
            const R = 6371e3;
            const phi1 = (coords.latitude * Math.PI) / 180;
            const phi2 = (Number(hLat) * Math.PI) / 180;
            const deltaPhi = ((Number(hLat) - coords.latitude) * Math.PI) / 180;
            const deltaLambda = ((Number(hLng) - coords.longitude) * Math.PI) / 180;

            const a =
              Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            calculatedDistance = R * c;

            if (calculatedDistance > 200) {
              flaggedForOffsiteOut = true;
            }
          } catch (geoError) {
            console.warn("Could not verify location during auto clock-out:", geoError);
          }
        }
      }

      const logDocRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, activeLogDoc.id);
      await updateDoc(logDocRef, {
        clockOutTime: serverTimestamp(),
        hoursWorked: hoursWorked,
        clockOutLatitude: coords ? coords.latitude : null,
        clockOutLongitude: coords ? coords.longitude : null,
        clockOutDistance: calculatedDistance !== null ? parseFloat(calculatedDistance.toFixed(2)) : null,
        flaggedForOffsiteOut: flaggedForOffsiteOut,
      });
    }
  } catch (err) {
    console.error("Error during auto clock-out:", err);
  }
}
