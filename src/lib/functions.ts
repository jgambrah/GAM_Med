/**
 * This file contains conceptual Node.js Cloud Functions for backend logic.
 * In a real Firebase project, these would be deployed as part of the 'functions' directory.
 * They are included here to illustrate the complete backend architecture for features
 * like real-time search indexing.
 * 
 * NOTE: This code is for illustration and is not actively used by the Next.js application,
 * which uses Server Actions for client-invoked operations.
 */

// import * as functions from "firebase-functions";
// import { initializeApp } from "firebase-admin/app";
// import algoliasearch from "algoliasearch";

// // --- Initialization (Conceptual) ---
// // In a real Cloud Function environment, you would initialize these clients once.
// initializeApp(); 
// const algoliaClient = algoliasearch(functions.config().algolia.app_id, functions.config().algolia.api_key);
// const searchIndex = algoliaClient.initIndex("patients");


/**
 * Firestore Trigger: syncPatientToSearchIndex
 * 
 * This function runs automatically whenever a document in the 'patients' collection
 * is created, updated, or deleted. It keeps the external search index (e.g., Algolia)
 * in sync with the Firestore database.
 * 
 * @trigger `onWrite` on the `patients/{patientId}` document path.
 */
/*
export const syncPatientToSearchIndex = functions.firestore
  .document("patients/{patientId}")
  .onWrite(async (change, context) => {
    
    const patientId = context.params.patientId;

    // Case 1: The document was DELETED from Firestore.
    // We must also delete it from our search index.
    if (!change.after.exists) {
      console.log(`DELETING patient ${patientId} from search index.`);
      return searchIndex.deleteObject(patientId);
    }

    // Case 2: The document was CREATED or UPDATED in Firestore.
    // We need to create or update it in our search index.
    const patientData = change.after.data();

    // We only include the fields that are relevant for searching.
    // This keeps our search index lean and efficient.
    const searchableRecord = {
      objectID: patientId, // Use the Firestore document ID as the unique ID for the search service.
      patientId: patientData.patientId,
      fullName: patientData.fullName,
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      primaryPhone: patientData.contact.primaryPhone,
      ghanaCardId: patientData.ghanaCardId || null, // Ensure it's not undefined
    };

    console.log(`UPDATING patient ${patientId} in search index.`);
    // The saveObject method is idempotent: it will create the record if it doesn't exist,
    // or update it if it does. This handles both creation and updates seamlessly.
    return searchIndex.saveObject(searchableRecord);
  });
*/

// --- Helper function to illustrate the main logic without Firebase dependencies ---
function getSearchablePatientObject(patientData: any, patientId: string) {
    if (!patientData) {
        // This would be a deletion operation in a real scenario
        return { action: 'DELETE', patientId };
    }
    
    // This would be an upsert (update/create) operation
    return {
        action: 'UPSERT',
        patientId,
        payload: {
            objectID: patientId,
            patientId: patientData.patientId,
            fullName: patientData.fullName,
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            primaryPhone: patientData.contact.primaryPhone,
            ghanaCardId: patientData.ghanaCardId || null,
        }
    }
}
