'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { 
  Clock, Loader2, ShieldAlert, Play, Square, 
  Timer, CheckCircle2, Calendar, User, Briefcase, MapPin, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function ClockInOutPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Haversine formula to compute great-circle distance between two GPS coordinates in meters
  function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
  }

  const getBrowserCoords = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Your browser does not support Geolocation."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  };

  // Fetch full user profile
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isLocum = userProfile?.contractType === 'LOCUM';

  // Fetch hospital details (for GPS coordinates)
  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  // Fetch shifts configured for this hospital
  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/shifts`));
  }, [firestore, hospitalId]);
  const { data: shifts, isLoading: areShiftsLoading } = useCollection(shiftsQuery);

  // Set default selected shift once shifts are loaded
  useEffect(() => {
    if (shifts && shifts.length > 0 && !selectedShiftId) {
      setSelectedShiftId(shifts[0].id);
    }
  }, [shifts, selectedShiftId]);

  // Query active clock-in log (where clockOutTime is null) for the current user
  const activeLogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user?.uid) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`),
      where("staffId", "==", user.uid),
      where("clockOutTime", "==", null)
    );
  }, [firestore, hospitalId, user?.uid]);
  const { data: activeLogs, isLoading: isActiveLogLoading } = useCollection(activeLogQuery);

  const activeLog = activeLogs && activeLogs.length > 0 ? activeLogs[0] : null;

  // Running elapsed timer when clocked in
  useEffect(() => {
    if (!activeLog || !activeLog.clockInTime) {
      setElapsedString('00:00:00');
      return;
    }

    const clockInDate = activeLog.clockInTime.toDate();
    const updateElapsed = () => {
      const diffMs = new Date().getTime() - clockInDate.getTime();
      if (diffMs < 0) return;
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (num: number) => String(num).padStart(2, '0');
      setElapsedString(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeLog]);

  const handleClockIn = async () => {
    if (!firestore || !hospitalId || !user || !userProfile || !selectedShiftId) {
      toast({
        title: "Error",
        description: "Missing required setup data. Please contact administration.",
        variant: "destructive"
      });
      return;
    }

    const shift = shifts?.find(s => s.id === selectedShiftId);
    if (!shift) {
      toast({
        title: "Error",
        description: "Invalid shift selection.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    let coords: { latitude: number; longitude: number } | null = null;
    let calculatedDistance: number | null = null;

    // Geofencing verification
    const hLat = hospital?.latitude;
    const hLng = hospital?.longitude;

    if (hLat !== undefined && hLat !== null && hLng !== undefined && hLng !== null) {
      try {
        const position = await getBrowserCoords();
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        calculatedDistance = getDistanceInMeters(
          coords.latitude,
          coords.longitude,
          Number(hLat),
          Number(hLng)
        );

        if (calculatedDistance > 200) {
          toast({
            title: "Geofencing Error",
            description: `Clock-in blocked. You are currently ${calculatedDistance.toFixed(0)} meters away from the hospital (limit: 200m).`,
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      } catch (geoError: any) {
        let errorMsg = "Could not verify your location. Please ensure location permissions are enabled.";
        if (geoError.code === 1) { // PERMISSION_DENIED
          errorMsg = "Location access denied. GPS location is required to clock in.";
        }
        toast({
          title: "Location Verification Failed",
          description: errorMsg,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await addDoc(collection(firestore, `hospitals/${hospitalId}/attendance_logs`), {
        staffId: user.uid,
        staffName: userProfile.fullName || user.displayName || 'Unknown Staff',
        role: userProfile.role || 'DOCTOR',
        contractType: userProfile.contractType || 'PERMANENT',
        shiftId: shift.id,
        shiftName: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        clockInTime: serverTimestamp(),
        clockOutTime: null,
        paymentStatus: "UNPAID",
        hoursWorked: 0,
        // Geolocation logs
        clockInLatitude: coords ? coords.latitude : null,
        clockInLongitude: coords ? coords.longitude : null,
        clockInDistance: calculatedDistance !== null ? parseFloat(calculatedDistance.toFixed(2)) : null,
      });

      toast({
        title: "Clock-In Successful",
        description: `You have clocked in for ${shift.name}.`,
      });
    } catch (error: any) {
      toast({
        title: "Clock-In Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!firestore || !hospitalId || !activeLog) return;

    setIsSubmitting(true);

    let coords: { latitude: number; longitude: number } | null = null;
    let calculatedDistance: number | null = null;
    let flaggedForOffsiteOut = false;

    // Fetch coordinates if hospital has GPS set
    const hLat = hospital?.latitude;
    const hLng = hospital?.longitude;

    if (hLat !== undefined && hLat !== null && hLng !== undefined && hLng !== null) {
      try {
        const position = await getBrowserCoords();
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        calculatedDistance = getDistanceInMeters(
          coords.latitude,
          coords.longitude,
          Number(hLat),
          Number(hLng)
        );

        if (calculatedDistance > 200) {
          flaggedForOffsiteOut = true;
        }
      } catch (geoError) {
        console.warn("Could not verify location during clock-out:", geoError);
      }
    }

    try {
      const clockInDate = activeLog.clockInTime.toDate();
      const diffMs = new Date().getTime() - clockInDate.getTime();
      const hoursWorked = parseFloat(Math.max(0, diffMs / (1000 * 60 * 60)).toFixed(2));

      const logDocRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, activeLog.id);
      await updateDoc(logDocRef, {
        clockOutTime: serverTimestamp(),
        hoursWorked: hoursWorked,
        // Clock-out geo info
        clockOutLatitude: coords ? coords.latitude : null,
        clockOutLongitude: coords ? coords.longitude : null,
        clockOutDistance: calculatedDistance !== null ? parseFloat(calculatedDistance.toFixed(2)) : null,
        flaggedForOffsiteOut: flaggedForOffsiteOut,
      });

      toast({
        title: "Clock-Out Successful",
        description: flaggedForOffsiteOut
          ? "Successfully clocked out. Note: Off-site clock-out was logged."
          : `Successfully clocked out. Total time logged: ${hoursWorked} hours.`,
      });
    } catch (error: any) {
      toast({
        title: "Clock-Out Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || areShiftsLoading || isActiveLogLoading || isHospitalLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8 p-4 md:p-6 text-black">
      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">
          Shift <span className="text-primary">Attendance</span>
        </h1>
        <p className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-wider">
          Clock In and Out for your Scheduled Shifts
        </p>
      </div>

      {/* Clock Widget */}
      <div className="bg-[#0f172a] text-white p-8 rounded-[40px] shadow-2xl text-center space-y-2 relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-5 rotate-12">
          <Clock size={160} />
        </div>
        <p className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center justify-center gap-2">
          <Calendar size={12} /> {format(currentTime, 'eeee, dd LLLL yyyy')}
        </p>
        <h2 className="text-4xl font-black tracking-tight">{format(currentTime, 'pp')}</h2>
        <div className="flex justify-center items-center gap-4 text-[10px] font-bold text-slate-400 border-t border-slate-800 pt-4 mt-4">
          <span className="flex items-center gap-1"><User size={10} /> {userProfile?.fullName}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
          <span className="flex items-center gap-1"><Briefcase size={10} /> {isLocum ? 'Locum Doctor' : userProfile?.role}</span>
        </div>
      </div>

      {/* Main Action Panel */}
      <div className="bg-white rounded-[40px] border-2 border-slate-50 p-8 shadow-sm space-y-6">
        {activeLog ? (
          /* Clocked-In State */
          <div className="space-y-6 text-center">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full bg-green-500/10 animate-ping"></div>
              <div className="bg-green-50 text-green-600 p-6 rounded-full relative z-10">
                <Timer size={48} className="animate-pulse" />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Shift Active</p>
              <h3 className="text-xl font-black uppercase tracking-tight mt-1">{activeLog.shiftName}</h3>
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                Clocked in at {activeLog.clockInTime ? format(activeLog.clockInTime.toDate(), 'p') : 'N/A'}
              </p>
            </div>

            {/* Elapsed Timer Widget */}
            <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Elapsed Time</p>
              <p className="text-3xl font-mono font-black text-slate-900 mt-1">{elapsedString}</p>
            </div>

            <Button 
              onClick={handleClockOut} 
              disabled={isSubmitting}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><Square size={16} fill="currentColor" /> Clock Out Shift</>}
            </Button>
          </div>
        ) : (
          /* Clocked-Out State */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-full inline-block">
                <Clock size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase">Ready to Start Shift?</p>
                <p className="text-xs text-muted-foreground">Select your shift pattern below to log attendance.</p>
              </div>
            </div>

            {/* GPS Status Notice */}
            {hospital?.latitude !== undefined && hospital?.latitude !== null && hospital?.longitude !== undefined && hospital?.longitude !== null ? (
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 text-xs text-slate-600 font-semibold leading-normal text-left">
                <MapPin className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="font-bold text-slate-800">GPS Geofencing Active</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">You must be within 200m of the hospital coordinates ({Number(hospital.latitude).toFixed(4)}, {Number(hospital.longitude).toFixed(4)}) to clock in.</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-xs text-slate-600 font-semibold leading-normal text-left">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="font-bold text-amber-800">GPS Geofencing Inactive</span>
                  <p className="text-[10px] text-amber-600/90 mt-0.5 leading-normal">Hospital coordinates are not configured. Geofence verification is currently bypassed.</p>
                </div>
              </div>
            )}

            {shifts && shifts.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Shift Pattern</label>
                  <select 
                    value={selectedShiftId} 
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold outline-none text-sm transition-all focus:border-primary/20"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <Button 
                  onClick={handleClockIn} 
                  disabled={isSubmitting || !selectedShiftId}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Play size={16} fill="currentColor" /> Clock In Shift</>}
                </Button>
              </div>
            ) : (
              <div className="text-center p-8 bg-slate-50 border-2 border-dashed rounded-[28px] text-slate-400">
                <ShieldAlert className="mx-auto mb-2 text-slate-300" size={32} />
                <p className="text-[11px] font-bold uppercase">No Shifts Configured</p>
                <p className="text-[10px] mt-1 font-semibold text-slate-400">
                  Please ask your HR team or Admin to configure shifts in the Duty Roster Setup page.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
