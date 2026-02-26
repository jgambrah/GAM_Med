import { getAdminServices } from '@/firebase/admin';
import { sendWelcomeEmail } from '@/lib/mail-service';
import crypto from 'crypto';

/**
 * == SaaS Auto-Provisioning & Upgrade Webhook ==
 * 
 * Listens for successful Paystack charges and handles:
 * 1. New Hospital Provisioning (from landing page)
 * 2. Subscription Upgrades/Renewals
 */
export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!process.env.PAYSTACK_SECRET_KEY) {
        return new Response('Configuration Error', { status: 500 });
    }

    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
    if (hash !== signature) {
        return new Response('Unauthorized', { status: 401 });
    }

    let adminDb, adminAuth;
    try {
        const services = getAdminServices();
        adminDb = services.adminDb;
        adminAuth = services.adminAuth;
    } catch (e) {
        console.error("Webhook Admin Init Failed:", e);
        return new Response('Service Unavailable', { status: 503 });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
        const { hospitalId, hospitalName, planId, email } = event.data.metadata;
        const now = new Date();

        try {
            if (hospitalId) {
                // == CASE A: SUBSCRIPTION UPGRADE / RENEWAL ==
                await adminDb.collection('hospitals').doc(hospitalId).update({
                    subscriptionStatus: 'active',
                    planId: planId,
                    subscriptionTier: planId, 
                    lastPaymentDate: now.toISOString(),
                    subscriptionNextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                    isActive: true,
                    trialEndsAt: null 
                });

                console.log(`Subscription Upgraded for: ${hospitalId}`);

            } else if (hospitalName && email) {
                // == CASE B: NEW TENANT PROVISIONING ==
                const newHospitalId = hospitalName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 30);

                // 1. Create Hospital Record
                await adminDb.collection('hospitals').doc(newHospitalId).set({
                    hospitalId: newHospitalId,
                    name: hospitalName,
                    slug: newHospitalId,
                    planId: 'trial', 
                    subscriptionStatus: 'trialing',
                    trialEndsAt: trialEndDate.toISOString(),
                    subscriptionTier: planId, 
                    isActive: true,
                    status: 'active',
                    createdAt: now.toISOString(),
                    ownerEmail: email
                });

                const tempPass = "Welcome" + Math.floor(1000 + Math.random() * 9000);
                
                // 2. Create Auth User
                const userRecord = await adminAuth.createUser({
                    email: email,
                    password: tempPass,
                    displayName: "Medical Director"
                });

                // 3. Create User Profile (Composite ID)
                const userDocId = `${newHospitalId}_${email.toLowerCase().trim()}`;
                await adminDb.collection('users').doc(userDocId).set({
                    uid: userRecord.uid,
                    email: email.toLowerCase().trim(),
                    name: "Medical Director",
                    hospitalId: newHospitalId,
                    role: 'director',
                    is_active: true,
                    created_at: now.toISOString(),
                    last_login: now.toISOString()
                });

                // 4. Create Role Marker (UID Keyed - CRITICAL for Rules)
                await adminDb.collection('roles_admin').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    hospitalId: newHospitalId,
                    assignedAt: now.toISOString()
                });

                await sendWelcomeEmail(email, "Director", hospitalName, tempPass, "Medical Director");

                console.log(`Auto-Provisioning Complete: ${newHospitalId}`);
            }

        } catch (error) {
            console.error("Critical Provisioning Failure:", error);
        }
    }

    return new Response('OK', { status: 200 });
}