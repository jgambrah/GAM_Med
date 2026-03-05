# **App Name**: GAM_Med

## Core Features:

- Multi-Tenant Hospital Onboarding: An administrative portal for the App CEO to securely onboard new hospital tenants, creating a unique 'hospitalId' and assigning initial Hospital Director roles.
- Hierarchical User & Role Management: Role-Based Access Control (RBAC) system allowing Hospital Directors to manage HR and HR to onboard various staff members (Doctors, Nurses, Pharmacists, etc.) within their specific hospital.
- Secure Patient Registration & EHR Access: Patient portal enabling registration and access to electronic health records using their Ghana Card/NHIS ID as a primary key, ensuring data privacy and unique identification.
- Scoped Data Isolation Enforcement: System-level enforcement ensuring all data (patients, staff, records) is strictly isolated to a specific hospital using Firebase Custom Claims and 'hospitalId' tagging, preventing cross-tenant data leakage.
- EHR View & Management: Interface for medical staff to securely view, update, and manage patient Electronic Health Records, ensuring all actions are within their assigned hospital's data scope.
- AI-Powered Discharge Instructions Tool: A generative AI tool to assist medical staff in quickly creating personalized patient discharge instructions, integrating relevant treatment plans and patient data while adhering to compliance.

## Style Guidelines:

- Color Palette Rationale: Inspired by the blend of professionalism and care in healthcare, coupled with the structured reliability of an ERP system. A light scheme promotes readability and a clean aesthetic. The primary color embodies trust and sophistication, avoiding typical healthcare greens or blues for a unique, modern feel, while maintaining serenity. The background provides a subtle depth without distraction, and the accent ensures crucial UI elements stand out with a confident and clear emphasis.
- Primary color: A deep, muted violet for trust and sophistication - #552C85.
- Background color: A very light, desaturated violet to maintain harmony with the primary color, promoting a clean and calm interface - #F2F0F6.
- Accent color: A brighter, analogous blue-violet to highlight interactive elements and call-to-actions, providing clear visual hierarchy and a touch of vibrancy - #626AE5.
- Headline font: 'Playfair' (serif) for an elegant, high-end feel, suitable for professional headlines.
- Body font: 'PT Sans' (humanist sans-serif) for clean readability and a modern, yet warm touch, ideal for the detailed content of an ERP system.
- Utilize modern, line-art icons that are clear and universally recognized within a healthcare or administrative context, maintaining consistency in style and weight throughout the application.
- Adopt a clean, spacious, and modular layout with a focus on intuitive navigation. Use cards and defined sections to present complex data in manageable, easily digestible blocks for improved user experience and reduced cognitive load.
- Incorporate subtle, functional animations for transitions, data loading, and interactive elements. These should be brief and purposeful, enhancing usability without distracting from the application's core functions.