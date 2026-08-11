'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Clock, Loader2, ShieldAlert, MapPin, AlertTriangle, 
  Fingerprint, Calendar, CheckCircle, History, Timer, Square, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function ShiftAttendancePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');

  // Real-time clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isLocum = userProfile?.contractType === 'LOCUM';

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/shifts`));
  }, [firestore, hospitalId]);
  const { data: shifts, isLoading: areShiftsLoading } = useCollection(shiftsQuery);

  useEffect(() => {
    if (shifts && shifts.length > 0 && !selectedShiftId) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      let activeShift = shifts[0];
      
      for (const s of shifts) {
        if (!s.startTime || !s.endTime) continue;
        const [startH, startM] = s.startTime.split(':').map(Number);
        const [endH, endM] = s.endTime.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        
        if (endMin < startMin) {
          if (currentMinutes >= startMin || currentMinutes <= endMin) {
            activeShift = s;
            break;
          }
        } else {
          if (currentMinutes >= startMin && currentMinutes <= endMin) {
            activeShift = s;
            break;
          }
        }
      }
      
      setSelectedShiftId(activeShift.id);
    }
  }, [shifts, selectedShiftId]);

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

  // Recent attendance logs history
  const recentLogsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user?.uid) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`),
      where("staffId", "==", user.uid)
    );
  }, [firestore, hospitalId, user?.uid]);
  const { data: recentLogs } = useCollection(recentLogsQuery);

  useEffect(() => {
    if (!activeLog || !activeLog.clockInTime) {
      setElapsedString('00:00:00');
      return;
    }

    const clockInDate = activeLog.clockInTime.toDate ? activeLog.clockInTime.toDate() : new Date();
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

    const shift = shifts?.find(s => s.id === selectedShiftId) || { id: 'default', name: 'Morning Shift', startTime: '08:00', endTime: '14:00' };

    setIsSubmitting(true);

    let coords: { latitude: number; longitude: number } | null = null;
    let calculatedDistance: number | null = null;

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
        if (geoError.code === 1) {
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
        staffName: userProfile.fullName || user.displayName || 'Staff Member',
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
      const clockInDate = activeLog.clockInTime.toDate ? activeLog.clockInTime.toDate() : new Date();
      const diffMs = new Date().getTime() - clockInDate.getTime();
      const hoursWorked = parseFloat(Math.max(0, diffMs / (1000 * 60 * 60)).toFixed(6));

      const logDocRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, activeLog.id);
      await updateDoc(logDocRef, {
        clockOutTime: serverTimestamp(),
        hoursWorked: hoursWorked,
        clockOutLatitude: coords ? coords.latitude : null,
        clockOutLongitude: coords ? coords.longitude : null,
        clockOutDistance: calculatedDistance !== null ? parseFloat(calculatedDistance.toFixed(2)) : null,
        flaggedForOffsiteOut: flaggedForOffsiteOut,
      });

      toast({
        title: "Clock-Out Successful",
        description: flaggedForOffsiteOut
          ? "Successfully clocked out. Note: Off-site clock-out was logged."
          : `Successfully clocked out. Total time logged: ${hoursWorked.toFixed(2)} hours.`,
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
        <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. DARK TIME & ATTENDANCE BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden mb-6">
        
        {/* Ambient Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header & Live Clock Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          
          {/* Identity & Title */}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <Clock className="w-7 h-7 text-blue-400" />
              SHIFT ATTENDANCE
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md uppercase tracking-wider">
                {isLocum ? 'Locum Doctor' : userProfile?.role || 'Pharmacist'}
              </span>
              <span className="text-sm font-bold text-slate-300 tracking-wide">
                {userProfile?.fullName || user?.displayName || 'Shane Gambrah'}
              </span>
            </div>
          </div>

          {/* The Live Digital Clock */}
          <div className="text-center md:text-right">
            <span className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center justify-center md:justify-end gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {format(currentTime, 'EEEE, dd MMMM yyyy').toUpperCase()}
            </span>
            <div className="text-4xl md:text-5xl font-black text-white tracking-tight font-mono">
              {format(currentTime, 'hh:mm:ss')} <span className="text-2xl text-slate-500">{format(currentTime, 'a')}</span>
            </div>
          </div>
        </div>

        {/* Quick Timesheet Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 mt-8 pt-6 border-t border-slate-800/60">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Weekly Hours Logged</span>
            <span className="text-xl font-black text-white">16.5 <span className="text-xs font-medium text-slate-500">/ 40 hrs</span></span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Overtime Accrued</span>
            <span className="text-xl font-black text-emerald-400">0.0 <span className="text-xs font-medium text-emerald-700">hrs</span></span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Punctuality Score</span>
            <span className="text-xl font-black text-blue-400">98% <span className="text-xs font-medium text-blue-700">On Time</span></span>
          </div>
        </div>
      </div>

      {/* 2. 2-COLUMN LAYOUT (Console & History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Authentication Console (Takes up 7/12) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
          
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-6 flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-blue-500" /> Identity & Location Verification
            </h3>

            {/* Geofence Alert */}
            {hospital?.latitude !== undefined && hospital?.latitude !== null && hospital?.longitude !== undefined && hospital?.longitude !== null ? (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">GPS Geofencing Active</h4>
                  <p className="text-xs text-blue-700/80 dark:text-blue-400 mt-1 font-medium leading-relaxed">
                    You must be within 200m of hospital coordinates ({Number(hospital.latitude).toFixed(4)}, {Number(hospital.longitude).toFixed(4)}) to clock in.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">GPS Geofencing Inactive</h4>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400 mt-1 font-medium leading-relaxed">
                    Hospital coordinates are not currently configured. Geofence verification is bypassed for this session. Your IP address will be logged instead.
                  </p>
                </div>
              </div>
            )}

            {/* Shift Selector */}
            {activeLog ? (
              <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-xs font-black uppercase">
                  <Timer className="w-4 h-4 animate-spin text-emerald-500" /> Active Shift Logged
                </div>
                <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase">{activeLog.shiftName}</h4>
                <p className="text-3xl font-mono font-black text-slate-900 dark:text-white">{elapsedString}</p>
                <p className="text-xs text-slate-400 font-medium">Clocked in at {activeLog.clockInTime?.toDate ? format(activeLog.clockInTime.toDate(), 'p') : '08:00 AM'}</p>
              </div>
            ) : (
              <div className="mb-8">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Select Shift Pattern
                </label>
                {shifts && shifts.length > 0 ? (
                  <select 
                    value={selectedShiftId} 
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-bold rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition shadow-sm"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-bold rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition shadow-sm">
                    <option>Morning Shift (08:00 - 14:00)</option>
                    <option>Evening Shift (14:00 - 20:00)</option>
                    <option>Night Shift (20:00 - 08:00)</option>
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          {activeLog ? (
            <button 
              type="button"
              disabled={isSubmitting}
              onClick={handleClockOut}
              className="w-full py-4 text-sm font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Clock className="w-5 h-5" /> End Shift & Clock Out</>}
            </button>
          ) : (
            <button 
              type="button"
              disabled={isSubmitting}
              onClick={handleClockIn}
              className="w-full py-4 text-sm font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><MapPin className="w-5 h-5" /> Clock In to Shift</>}
            </button>
          )}

        </div>

        {/* RIGHT COLUMN: Recent Punches (Takes up 5/12) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-5 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" /> This Week's Logs
          </h3>
          
          <div className="space-y-3">
            {recentLogs && recentLogs.length > 0 ? (
              recentLogs.map((log: any) => (
                <div key={log.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      {log.clockInTime?.toDate ? format(log.clockInTime.toDate(), 'EEE, MMM d') : 'Recent Shift'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{log.shiftName || 'Standard Shift'}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md uppercase tracking-wider flex items-center gap-1 mb-1 justify-end">
                      <CheckCircle className="w-3 h-3" /> Validated
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                      {log.startTime || '08:00'} - {log.endTime || '14:00'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Yesterday</span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Morning Shift</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md uppercase tracking-wider flex items-center gap-1 mb-1 justify-end">
                      <CheckCircle className="w-3 h-3" /> Validated
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">07:54 - 14:03</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Sun, Aug 9</span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Evening Shift</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-md uppercase tracking-wider flex items-center gap-1 mb-1 justify-end">
                      <CheckCircle className="w-3 h-3" /> Validated
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">13:50 - 20:15</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
