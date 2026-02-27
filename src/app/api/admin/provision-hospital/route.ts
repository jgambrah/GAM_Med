import { adminDb, adminAuth } from '@/firebase/admin';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

/**
 * == Fault-Tolerant Enterprise Provisioning Engine ==
 * 
 * This API performs the atomic "Handover" of a new hospital tenant.
 * It is designed to be resilient to email delivery failures and data mismatches.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // SAFE DESTRUCTURING: Provide defaults to prevent .toLowerCase() crashes
        const { 
            name = "", 
            email = "", 
            directorName = "" 
        } = body;

        if (!email || !name) {
            return NextResponse.json({ error: "Hospital name and Director email are required." }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const hospitalId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
        const tempPassword = "GamMed-" + Math.random().toString(36).slice(-8).toUpperCase();

        console.log(`Starting provisioning for ${normalizedEmail}...`);

        // 1. Create the Hospital Master Record
        await adminDb.collection('hospitals').doc(hospitalId).set({
            hospitalId: hospitalId,
            name: name,
            slug: hospitalId,
            status: 'active',
            subscriptionStatus: 'trialing',
            subscriptionTier: 'clinic-starter',
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            createdAt: new Date().toISOString(),
            ownerEmail: normalizedEmail
        });

        // 2. Create the Director (Auth)
        let userRecord;
        try {
            userRecord = await adminAuth.createUser({
                email: normalizedEmail,
                password: tempPassword,
                displayName: directorName
            });
        } catch (authError: any) {
            console.error("AUTH_ERROR:", authError.message);
            if (authError.code === 'auth/email-already-in-use') {
                return NextResponse.json({ error: "This email is already registered. Please delete the old account first." }, { status: 400 });
            }
            throw authError;
        }

        // 3. THE "SAAS STAMP" (Custom JWT Claims)
        await adminAuth.setCustomUserClaims(userRecord.uid, { 
            hospitalId: hospitalId, 
            role: 'director' 
        });

        // 4. Create User Profile Document
        await adminDb.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: normalizedEmail,
            name: directorName,
            role: 'director',
            hospitalId: hospitalId,
            hospitalName: name,
            is_active: true,
            created_at: new Date().toISOString()
        });

        // 5. Create Role Marker (Necessary for rules fallback)
        await adminDb.collection('roles_admin').doc(userRecord.uid).set({
            uid: userRecord.uid,
            hospitalId: hospitalId,
            assignedAt: new Date().toISOString()
        });

        // 6. SEND WELCOME EMAIL (Fault Tolerant)
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'GamMed Support <onboarding@resend.dev>', 
                to: normalizedEmail,
                subject: `Welcome to GamMed - Your Hospital Portal is Ready`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 12px;">
                        <h2 style="color: #2563eb;">Welcome, ${directorName}!</h2>
                        <p>Your hospital management system for <strong>${name}</strong> has been successfully provisioned.</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
                            <p style="margin: 0; font-size: 14px;"><strong>Login URL:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gam-med.vercel.app'}/login">Open Portal</a></p>
                            <p style="margin: 10px 0 0 0; font-size: 14px;"><strong>User ID (Email):</strong> ${normalizedEmail}</p>
                            <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 4px; border-radius: 4px;">${tempPassword}</code></p>
                        </div>

                        <p style="font-size: 13px; color: #64748b;">For security, please change your password immediately after your first login.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                        <p style="font-size: 12px; color: #94a3b8;">This is an automated message from Gam It Services Support.</p>
                    </div>
                `
            });
            console.log(`Success: Welcome email sent to ${normalizedEmail}`);
        } catch (emailErr: any) {
            console.warn("EMAIL_SEND_FAILURE (Handover complete but notification failed):", emailErr.message);
        }

        return NextResponse.json({ 
            success: true, 
            hospitalId,
            tempPassword,
            message: "Hospital provisioned and identity stamped successfully." 
        });

    } catch (error: any) {
        console.error("PROVISIONING_CRITICAL_FAILURE:", error.message);
        return NextResponse.json({ 
            error: "Provisioning Failed", 
            detail: error.message 
        }, { status: 500 });
    }
}