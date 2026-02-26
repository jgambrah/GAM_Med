
import { getAdminServices } from '@/firebase/admin';
import { NextResponse } from 'next/server';

/**
 * == Enterprise Provisioning Engine ==
 * 
 * This API performs the atomic "Handover" of a new hospital tenant.
 * It ensures the Director is "Stamped" with a Hospital ID in their JWT
 * and that all required security markers are created in Firestore.
 */
export async function POST(req: Request) {
    try {
        const { adminDb, adminAuth } = getAdminServices();
        const { hospitalName, directorName, directorEmail, directorPassword, subscriptionTier } = await req.json();

        if (!hospitalName || !directorEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. GENERATE UNIQUE HOSPITAL ID (The "Room")
        // Example: "City General" -> "city-general-1234"
        const hospitalId = hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
        const now = new Date().toISOString();

        // 2. CREATE THE HOSPITAL MASTER DOCUMENT
        await adminDb.collection('hospitals').doc(hospitalId).set({
            hospitalId: hospitalId,
            name: hospitalName,
            slug: hospitalId,
            status: 'active',
            subscriptionStatus: 'trialing',
            subscriptionTier: subscriptionTier || 'clinic-starter',
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 Days
            isActive: true,
            createdAt: now,
            ownerEmail: directorEmail.toLowerCase()
        });

        // 3. PROVISION THE DIRECTOR (Auth)
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(directorEmail);
        } catch {
            // Create user if they don't exist
            userRecord = await adminAuth.createUser({
                email: directorEmail.toLowerCase(),
                password: directorPassword || "WelcomeGamMed123!",
                displayName: directorName
            });
        }

        // 4. THE "SAAS STAMP" (Custom JWT Claims)
        // This is the gold standard for SaaS security. The hospitalId is baked 
        // into the user's signed identity token.
        await adminAuth.setCustomUserClaims(userRecord.uid, { 
            hospitalId: hospitalId, 
            role: 'director' 
        });

        // 5. CREATE USER PROFILE (Logical Mapping)
        // docId is the UID for O(1) lookup performance in security rules
        await adminDb.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: directorEmail.toLowerCase(),
            name: directorName,
            role: 'director',
            hospitalId: hospitalId,
            hospitalName: hospitalName,
            is_active: true,
            created_at: now
        });

        // 6. CREATE ROLE MARKER (Security Fallback)
        await adminDb.collection('roles_admin').doc(userRecord.uid).set({
            uid: userRecord.uid,
            hospitalId: hospitalId,
            assignedAt: now
        });

        return NextResponse.json({ 
            success: true, 
            hospitalId,
            message: "Hospital provisioned and Director stamped successfully." 
        });

    } catch (error: any) {
        console.error("PROVISIONING_CRASH:", error.message);
        return NextResponse.json({ 
            error: "Provisioning Failed", 
            detail: error.message 
        }, { status: 500 });
    }
}
