# MedFlow GH

This is a Next.js application for MedFlow GH, an end-to-end Hospital Management ERP System for Ghana, built using Firebase Studio.

## Core Features Implemented

*   **Secure Authentication**: Firebase-based user authentication (mocked and real).
*   **Role-Based Access Control (RBAC)**: Frontend UI adapts to user roles (Admin, Doctor, Patient, etc.).
*   **AI Assistant**: An integrated Genkit-powered AI assistant to help users navigate the app.
*   **Patient Management**:
    *   Register new patients with unique, auto-generated IDs.
    *   View a list of all patients.
    *   Admit and discharge patients with proper state management.
*   **Appointment Viewing**: Basic appointment viewing for different roles.

## Backend Logic (Server Actions)

The application uses Next.js Server Actions (`src/lib/actions.ts`) to handle critical backend logic securely on the server. This includes:

*   **`registerPatientAction`**: Generates a unique patient ID and creates a new patient record. Simulates follow-up actions like creating an auth user or an EHR sub-collection.
*   **`admitPatientAction`**: Manages the patient admission process, updating patient status and bed allocation atomically.
*   **`dischargePatientAction`**: Handles patient discharge, updating patient and bed status and simulating follow-up billing/summary tasks.

## Firestore Security

The `firestore.rules` file contains a comprehensive set of security rules to enforce Role-Based Access Control (RBAC) for the following collections:

*   `patients`
*   `admissions`
*   `beds`

These rules ensure that users can only access or modify data according to their assigned role (e.g., a patient can only read their own data, while a doctor can read data for all patients).
