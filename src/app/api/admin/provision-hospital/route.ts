import { adminDb, adminAuth } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * == Automated Enterprise Provisioning Engine ==
 * 
 * This API performs the atomic "Handover" of a new hospital tenant.
 * 1. Generates unique SaaS Hospital ID.
 * 2. Generates secure temporary password.
 * 3. Provisions Hospital Master Record.
 * 4. Stacks "SaaS Stamp" (Custom JWT Claims) onto Director.
 * 5. Dispatches Welcome Email with credentials.
 */
export async function POST(req: Request) {
    try {
        const { hospitalName, directorName, directorEmail, subscriptionTier } = await req.json();
        const normalizedEmail = directorEmail.toLowerCase().trim();

        if (!hospitalName || !directorEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. AUTOMATICALLY GENERATE THE HOSPITAL ID (The "Room")
        const hospitalId = hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
        const now = new Date().toISOString();

        // 2. GENERATE A TEMPORARY PASSWORD
        const tempPassword = "MedFlow-" + Math.random().toString(36).slice(-8).toUpperCase();

        // 3. CREATE THE HOSPITAL MASTER DOCUMENT
        await adminDb.collection('hospitals').doc(hospitalId).set({
            hospitalId: hospitalId,
            name: hospitalName,
            slug: hospitalId,
            status: 'active',
            subscriptionStatus: 'trialing',
            subscriptionTier: subscriptionTier || 'clinic-starter',
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            createdAt: now,
            ownerEmail: normalizedEmail
        });

        // 4. PROVISION THE DIRECTOR (Auth)
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(normalizedEmail);
        } catch {
            userRecord = await adminAuth.createUser({
                email: normalizedEmail,
                password: tempPassword,
                displayName: directorName
            });
        }

        // 5. THE "SAAS STAMP" (Custom JWT Claims)
        // Locking the executive into their facility room at the identity level
        await adminAuth.setCustomUserClaims(userRecord.uid, { 
            hospitalId: hospitalId, 
            role: 'director' 
        });

        // 6. CREATE USER PROFILE (Logical Mapping)
        await adminDb.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: normalizedEmail,
            name: directorName,
            role: 'director',
            hospitalId: hospitalId,
            hospitalName: hospitalName,
            is_active: true,
            created_at: now
        });

        // 7. CREATE ROLE MARKER (Security Fallback for rules)
        await adminDb.collection('roles_admin').doc(userRecord.uid).set({
            uid: userRecord.uid,
            hospitalId: hospitalId,
            assignedAt: now
        });

        // 8. SEND WELCOME EMAIL VIA RESEND
        await resend.emails.send({
            from: 'MedFlow Support <onboarding@resend.dev>', // Update to your domain later
            to: normalizedEmail,
            subject: `Welcome to MedFlow GH - Your Hospital Portal is Ready`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 12px;">
                    <h2 style="color: #2563eb;">Welcome, ${directorName}!</h2>
                    <p>Your hospital management system for <strong>${hospitalName}</strong> has been successfully provisioned.</p>
                    <p>You can now log in and begin setting up your facility, doctors, and staff.</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
                        <p style="margin: 0; font-size: 14px;"><strong>Login URL:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://medflow-gh.vercel.app'}/login">Open Portal</a></p>
                        <p style="margin: 10px 0 0 0; font-size: 14px;"><strong>User ID (Email):</strong> ${normalizedEmail}</p>
                        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 4px; border-radius: 4px;">${tempPassword}</code></p>
                    </div>

                    <p style="font-size: 13px; color: #64748b;">For security, please change your password immediately after your first login.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #94a3b8;">This is an automated message from MedFlow GH Platform Support.</p>
                </div>
            `
        });

        return NextResponse.json({ 
            success: true, 
            hospitalId,
            message: "Hospital provisioned and Director welcomed successfully." 
        });

    } catch (error: any) {
        console.error("PROVISIONING_CRASH:", error.message);
        return NextResponse.json({ 
            error: "Provisioning Failed", 
            detail: error.message 
        }, { status: 500 });
    }
}
