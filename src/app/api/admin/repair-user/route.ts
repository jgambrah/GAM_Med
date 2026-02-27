import { getAdminServices } from '@/firebase/admin';
import { NextResponse } from 'next/server';

/**
 * == User Identity Repair Engine ==
 * 
 * Manually "Stamps" an existing user with Custom JWT Claims and Firestore Role Registry.
 * Used to fix users who were provisioned without a proper Hospital ID or security markers.
 */
export async function POST(req: Request) {
    try {
        const { adminAuth, adminDb } = getAdminServices();
        const { uid, hospitalId, role } = await req.json();

        if (!uid || !hospitalId) {
            return NextResponse.json({ error: "Missing UID or Hospital ID" }, { status: 400 });
        }

        // 1. FORCE the digital ID card (JWT) to be updated on the server
        await adminAuth.setCustomUserClaims(uid, { 
            hospitalId: hospitalId, 
            role: role || 'director' 
        });

        // 2. Create/Update Role Marker Document (CRITICAL for DBAC Rule Fallback)
        const roleCollection = (role === 'admin' || role === 'director') ? 'roles_admin' : 'roles_staff';
        await adminDb.collection(roleCollection).doc(uid).set({
            uid: uid,
            hospitalId: hospitalId,
            assignedAt: new Date().toISOString()
        });
        
        console.log(`Successfully repaired identity and role registry for user ${uid} at facility ${hospitalId}`);

        return NextResponse.json({ 
            success: true, 
            message: "User Identity Repaired. Please ask the user to log out and back in." 
        });
    } catch (error: any) {
        console.error("IDENTITY_REPAIR_CRASH:", error.message);
        return NextResponse.json({ 
            error: "Repair Failed", 
            detail: error.message 
        }, { status: 500 });
    }
}
