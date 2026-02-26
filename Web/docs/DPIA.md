# RunFlow Data Protection Impact Assessment (DPIA)

**Date:** 26 February 2026
**Version:** 1.0
**Author:** RunFlow Compliance Team

## 1. Introduction
This Data Protection Impact Assessment (DPIA) is conducted pursuant to Article 35 of the General Data Protection Regulation (GDPR). RunFlow processes special categories of personal data (health data, Art. 9) for the purpose of providing advanced running analytics, training plans, and AI coaching.

## 2. Description of Processing

### 2.1 Types of Data Processed
- **Identity & Contact Data:** Name, email address, profile image.
- **Biometric & Health Data (Art. 9):** Heart rate (max, resting, zones), weight, height, age classification.
- **Fitness & Activity Data:** GPS paths, running cadence, elevation, speed, activity durations.
- **Nutrition & Supplement Data:** Caloric intake, meal logs, supplement schedules.
- **Technical & Device Data:** IP addresses, browser agents, push notification tokens.
- **Integration Data:** Activity synchronization via Strava API and Apple Health/Health Connect.

### 2.2 Data Flow
1. User provides data directly or via Strava OAuth integration.
2. Data is securely transmitted over TLS 1.3 to RunFlow servers.
3. Health and fitness data is processed to calculate advanced metrics (VDOT, TRIMP, Form, Fatigue, Fitness).
4. Anonymized or pseudonymized data may be sent to third-party sub-processors (e.g., OpenAI, Anthropic) if the user explicitly engages with the AI Coach feature.
5. All data is persisted in a PostgreSQL database with restricted internal access.

## 3. Necessity and Proportionality

### 3.1 Purpose
The collection of health and fitness data is fundamentally necessary to provide the core services of RunFlow: calculating accurate training loads, predicting race times, and providing personalized coaching. Without this data, the application cannot function.

### 3.2 Data Minimization
- RunFlow does not collect exact dates of birth, relying instead on an explicit "Over 16" consent checkbox.
- Users have granular control to withdraw health data consent without deleting their base account.

## 4. Risks to Data Subjects

| Risk | Likelihood | Severity | Overall Risk |
|------|------------|----------|--------------|
| Unauthorized internal access to sensitive health data | Low | High | Medium |
| External data breach exposing GPS tracks (location data) | Low | High | Medium |
| Third-party AI provider retaining health queries | Low | Medium | Low |

## 5. Mitigation Measures

To address the identified risks, RunFlow implements the following safeguards:

1. **Access Controls:** Strict Role-Based Access Control (RBAC) for internal admin systems.
2. **Audit Trails:** All administrative access and modifications to user accounts are logged immutably.
3. **Encryption:** All data in transit is encrypted via HTTPS/TLS 1.3. Passwords and API keys are hashed and salted at rest.
4. **Consent Management:** Granular consent logs ensure no health data is processed without explicit, documented user opt-in (Art. 9).
5. **Sub-processor Agreements:** All third-party providers (Strava, AI APIs, Sentry) are bound by Standard Contractual Clauses (SCCs) or Data Privacy Framework (DPF) certifications for international transfers.

## 6. Conclusion
The residual risk to the rights and freedoms of data subjects is deemed acceptable given the implemented technical and organizational measures. RunFlow's processing of health data is lawful, transparent, and securely managed. Prior consultation with a Data Protection Authority (DPA) is not required at this time.
