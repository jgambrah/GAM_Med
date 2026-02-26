import { adminDb, adminAuth } from '@/firebase/admin';
import { sendWelcomeEmail } from '@/lib/mail-service';
import crypto from 'crypto';

/**
 * == SaaS Auto-Provisioning Webhook ==
 * 
 * This engine listens for successful Paystack payments and 
 * automatically provisions the new hospital tenant and director.
 * Even if the customer drops off after payment, this completes the onboarding.
 */
export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!process.env.PAYSTACK_SECRET_KEY) {
        return new Response('Server Configuration Error', { status: 500 });
    }

    // 1. SECURITY: Verify HMAC Signature from Paystack
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
    if (hash !== signature) {
        console.warn("Paystack Webhook: Unauthorized attempt detected.");
        return new Response('Unauthorized', { status: 401 });
    }

    const event = JSON.parse(body);

    // 2. LOGIC: Provision on Charge Success
    if (event.event === 'charge.success') {
        const { hospitalName, planId, email } = event.data.metadata;
        
        // Generate unique hospital slug/ID
        const hospitalId = hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
        const now = new Date();

        try {
            // A. Create the Hospital Master Record (Logical Isolation Anchor)
            await adminDb.collection('hospitals').doc(hospitalId).set({
                hospitalId: hospitalId,
                name: hospitalName,
                slug: hospitalId,
                subscriptionTier: planId,
                isActive: true,
                status: 'active',
                createdAt: now,
                ownerEmail: email
            });

            // B. Create the Director in Firebase Auth
            const tempPass = "Welcome" + Math.floor(1000 + Math.random() * 9000);
            const userRecord = await adminAuth.createUser({
                email: email,
                password: tempPass,
                displayName: "Medical Director"
            });

            // C. STAMP Identity: Set Custom Claims for Database Security Rules
            await adminAuth.setCustomUserClaims(userRecord.uid, { 
                hospitalId: hospitalId, 
                role: 'director' 
            });

            // D. Create Firestore Profile (Tenant-Locked)
            const userDocId = `${hospitalId}_${email.toLowerCase().trim()}`;
            await adminDb.collection('users').doc(userDocId).set({
                uid: userRecord.uid,
                email: email.toLowerCase().trim(),
                name: "Medical Director",
                hospitalId: hospitalId,
                role: 'director',
                is_active: true,
                created_at: now.toISOString(),
                last_login: now.toISOString()
            });

            // E. Notify User via Resend
            await sendWelcomeEmail(email, "Director", hospitalName, tempPass, "Medical Director");

            console.log(`SaaS Provisioning Complete: ${hospitalName} (${hospitalId})`);

        } catch (error) {
            console.error("Critical Provisioning Error:", error);
            // In production, you would log this to a 'failed_provisions' collection for manual recovery
        }
    }

    return new Response('OK', { status: 200 });
}
