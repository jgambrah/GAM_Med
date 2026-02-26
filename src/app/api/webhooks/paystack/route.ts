import { adminDb, adminAuth } from '@/firebase/admin';
import { sendWelcomeEmail } from '@/lib/mail-service';
import crypto from 'crypto';

/**
 * == SaaS Auto-Provisioning Webhook ==
 * 
 * Listens for successful Paystack charges and automatically provisions 
 * the new hospital tenant and Medical Director account.
 */
export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!process.env.PAYSTACK_SECRET_KEY) {
        return new Response('Configuration Error', { status: 500 });
    }

    // 1. SECURITY: Verify Paystack Signature
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
    if (hash !== signature) {
        return new Response('Unauthorized', { status: 401 });
    }

    const event = JSON.parse(body);

    // 2. LOGIC: Provision on Successful Payment
    if (event.event === 'charge.success') {
        const { hospitalName, planId, email } = event.data.metadata;
        
        // Generate a unique tenant slug
        const hospitalId = hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
        const now = new Date();

        try {
            // A. Create the Hospital Record (The SaaS Isolation Anchor)
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

            // B. Create the Medical Director in Firebase Auth
            const tempPass = "Welcome" + Math.floor(1000 + Math.random() * 9000);
            const userRecord = await adminAuth.createUser({
                email: email,
                password: tempPass,
                displayName: "Medical Director"
            });

            // C. Stamp SaaS Identity: Set Custom Claims for Rule enforcement
            await adminAuth.setCustomUserClaims(userRecord.uid, { 
                hospitalId: hospitalId, 
                role: 'director' 
            });

            // D. Create Firestore Profile
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

            // E. Notify Director via stylized email
            await sendWelcomeEmail(email, "Director", hospitalName, tempPass, "Medical Director");

            console.log(`Auto-Provisioning Complete for: ${hospitalName} (${hospitalId})`);

        } catch (error) {
            console.error("Critical Provisioning Failure:", error);
        }
    }

    return new Response('OK', { status: 200 });
}
