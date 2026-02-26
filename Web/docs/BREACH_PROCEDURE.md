# RunFlow Data Breach Notification Procedure

**Last Updated:** 26 February 2026

## 1. Overview
This internal procedure outlines the steps RunFlow must take in the event of a personal data breach, ensuring compliance with Articles 33 and 34 of the General Data Protection Regulation (GDPR).

A personal data breach means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data transmitted, stored, or otherwise processed.

## 2. Procedure Steps

### Step 1: Detection & Confirmation (Within 12 Hours)
- **Sources of Detection:** Sentry alerts, server anomaly logs, user reports, third-party provider notifications.
- **Action:** 
  1. Immediately isolate the affected systems (e.g., revoke compromised API keys, take services offline if necessary).
  2. The technical team determines if personal data was actually compromised.

### Step 2: Risk Assessment (Within 24 Hours)
Once a breach is confirmed, assess the risk to the rights and freedoms of the affected users.
- **Low Risk:** e.g., A securely hashed and salted password database is stolen, or non-sensitive, encrypted telemetry data is accessed.
- **High Risk:** e.g., Unencrypted health data, GPS tracks, or plaintext emails/names are accessed.

### Step 3: Notification to Supervisory Authority (Within 72 Hours)
If the breach is likely to result in a risk to users (anything above "Low Risk"), RunFlow must notify the competent EU Data Protection Authority (e.g., ANSPDCP in Romania or BfDI in Germany) within 72 hours of becoming aware of the breach.

**The notification must include:**
- Describe the nature of the breach, including categories and approximate numbers of data subjects and records concerned.
- Communicate the name and contact details of the DPO (or primary contact, Thies Schuelken).
- Describe the likely consequences of the breach.
- Describe the measures taken or proposed to address the breach.

*If notification is not made within 72 hours, reasons for the delay must be provided.*

### Step 4: Notification to Users (Without Undue Delay)
If the breach is likely to result in a **high risk** to the rights and freedoms of users (e.g., health data or passwords compromised), the affected users must be notified directly (via email or push notification) immediately.

**The user notification must include:**
- A clear, plain-language description of what happened.
- Contact details for follow-up questions.
- Likely consequences for the user.
- Measures taken by RunFlow to mitigate the issue.
- Recommended actions for the user (e.g., "Change your password immediately on related sites").

### Step 5: Documentation & Logging (Ongoing)
Regardless of the risk level or whether authorities were involved, **every** suspected or confirmed breach must be logged internally.

**The internal record must include:**
- The facts relating to the breach, its effects, and the remedial action taken.
- The justification for delaying or omitting authority notification (if deemed low risk).

This documentation must be made available to the supervisory authority upon request for compliance verification.
