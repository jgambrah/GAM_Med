
'use client';
import { getAuth, type User } from 'firebase/auth';

type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

interface FirebaseAuthToken {
  name: string | null;
  email: string | null;
  email_verified: boolean;
  phone_number: string | null;
  sub: string;
  hospitalId?: string; // Simulated Custom Claim for SaaS Multi-tenancy
  role?: string;       // Simulated Custom Claim for RBAC
  patient_id?: string; // Simulated Custom Claim for Patient Portal
  firebase: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
    tenant: string | null;
  };
}

interface FirebaseAuthObject {
  uid: string;
  token: FirebaseAuthToken;
}

interface SecurityRuleRequest {
  auth: FirebaseAuthObject | null;
  method: string;
  path: string;
  query?: {
    limit?: number;
    filters?: Record<string, any>;
  };
  resource?: {
    data: any;
  };
}

/**
 * Builds a security-rule-compliant auth object from the Firebase User.
 */
function buildAuthObject(currentUser: User | null): FirebaseAuthObject | null {
  if (!currentUser) {
    return null;
  }

  // Simulations for developer feedback
  let simulatedHospitalId = 'hosp-1';
  let simulatedRole = 'nurse';

  if (currentUser.email?.includes('superadmin')) {
      simulatedHospitalId = 'GAMMED_INTERNAL';
      simulatedRole = 'super_admin';
  } else if (currentUser.email?.includes('director')) {
      simulatedRole = 'director';
  } else if (currentUser.email?.includes('admin')) {
      simulatedRole = 'admin';
  } else if (currentUser.email?.includes('doc')) {
      simulatedRole = 'doctor';
  }

  const token: FirebaseAuthToken = {
    name: currentUser.displayName,
    email: currentUser.email,
    email_verified: currentUser.emailVerified,
    phone_number: currentUser.phoneNumber,
    sub: currentUser.uid,
    hospitalId: simulatedHospitalId, 
    role: simulatedRole,
    firebase: {
      identities: currentUser.providerData.reduce((acc, p) => {
        if (p.providerId) {
          acc[p.providerId] = [p.uid];
        }
        return acc;
      }, {} as Record<string, string[]>),
      sign_in_provider: currentUser.providerData[0]?.providerId || 'custom',
      tenant: currentUser.tenantId,
    },
  };

  return {
    uid: currentUser.uid,
    token: token,
  };
}

/**
 * Builds the complete, simulated request object for the error message.
 */
function buildRequestObject(context: SecurityRuleContext): SecurityRuleRequest {
  let authObject: FirebaseAuthObject | null = null;
  try {
    const firebaseAuth = getAuth();
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      authObject = buildAuthObject(currentUser);
    }
  } catch {
    // Firebase app not yet initialized
  }

  return {
    auth: authObject,
    method: context.operation,
    path: `/databases/(default)/documents/${context.path}`,
    query: context.operation === 'list' ? {
        limit: 50,
        // Only show simulated filters if the user is authenticated
        filters: authObject ? { hospitalId: authObject.token.hospitalId } : {}
    } : undefined,
    resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
  };
}

/**
 * Builds the final, formatted error message for the LLM.
 */
function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  const authStatus = requestObject.auth ? `Authenticated as ${requestObject.auth.token.role} @ ${requestObject.auth.token.hospitalId}` : 'Unauthenticated';
  return `Missing or insufficient permissions: The following request was denied by Firestore Security Rules (${authStatus}):
${JSON.stringify(requestObject, null, 2)}`;
}

/**
 * A custom error class designed to be consumed by an LLM for debugging.
 */
export class FirestorePermissionError extends Error {
  public readonly request: SecurityRuleRequest;

  constructor(context: SecurityRuleContext) {
    const requestObject = buildRequestObject(context);
    super(buildErrorMessage(requestObject));
    this.name = 'FirebaseError';
    this.request = requestObject;
  }
}
