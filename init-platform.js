const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function initPlatform() {
  console.log("🚀 Initializing GamMed Command Centre Brain...");

  try {
    // 1. Setup Global Summary
    await db.collection('platform_config').doc('summary').set({
      totalFacilities: 0,
      totalPatients: 0,
      totalRevenue: 0,
      activeAlerts: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Global summary document initialized.");

    // 2. Setup Pricing Plans (Revenue Console)
    const plans = {
      STARTER: {
        name: 'Clinic Starter',
        price: 'GHC 1,000.00',
        monthlyPrice: 1000,
        annualPrice: 10000,
        description: 'Perfect for small private practices.',
        features: ['Patient Records', 'Vital Tracking', '10 Staff Accounts'],
        isPopular: false,
        maxStaff: 10,
        maxPatients: 1000,
      },
      ENTERPRISE: {
        name: 'Enterprise',
        price: 'GHC 2,500.00',
        monthlyPrice: 2500,
        annualPrice: 25000,
        description: 'Advanced features for medical centers.',
        features: ['Surgical Module', 'Radiology Integration', '24/7 Support'],
        isPopular: false,
        maxStaff: 100,
        maxPatients: 10000,
      },
      PROFESSIONAL: {
        name: 'Professional',
        price: 'GHC 5,000.00',
        monthlyPrice: 5000,
        annualPrice: 50000,
        description: 'Full-scale management for hospitals.',
        features: ['Pharmacy & Lab', 'Inpatient Ward', 'Unlimited Staff'],
        isPopular: true,
        maxStaff: -1, // Unlimited
        maxPatients: -1, // Unlimited
      }
    };

    const batch = db.batch();
    for (const [id, data] of Object.entries(plans)) {
      const planRef = db.collection('pricing_plans').doc(id);
      batch.set(planRef, data);
    }
    await batch.commit();
    console.log("✅ Pricing plans have been set.");

    console.log("✨ Initialization Complete. Platform is ready for the CEO.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Initialization Failed:", error);
    process.exit(1);
  }
}

initPlatform();

    