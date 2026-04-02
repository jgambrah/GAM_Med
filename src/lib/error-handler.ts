
export const parseClinicalError = (error: any) => {
  const code = error.code || error.message;

  // 1. Permission Issues
  if (code.includes('permission-denied')) {
    return "ACCESS RESTRICTED: You do not have the required clinical clearance or the patient has not authorized this facility.";
  }

  // 2. Missing Index (The common 500 error)
  if (code.includes('FAILED_PRECONDITION')) {
    return "SYSTEM OPTIMIZATION: The database is currently building its clinical maps. Please wait 5 minutes and try again.";
  }

  // 3. Validation Issues
  if (code.includes('invalid-argument')) {
    return "DATA ERROR: Critical information (like Ghana Card ID or Vitals) is missing or formatted incorrectly.";
  }

  // 4. Network/CORS
  if (code.includes('ERR_FAILED') || code.includes('fetch')) {
    return "CONNECTION ERROR: Unable to reach the clinical cloud. Please check your hospital's internet or firewall.";
  }

  // 5. Auth
  if (code.includes('unauthenticated')) {
    return "SESSION EXPIRED: Please log out and log back in to verify your medical credentials.";
  }

  return `CLINICAL SYSTEM ERROR: ${error.message || "An unknown error occurred during processing."}`;
};
