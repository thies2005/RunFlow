export const POLICY_VERSIONS = {
    TERMS: '2026-02-25',
    PRIVACY: '2026-02-25',
    HEALTH_DATA: '1.0',
    AGE_REQUIREMENT: '1.0',
};

// Users who haven't consented to these versions will be prompted to re-consent
export const getCurrentPolicyVersions = () => POLICY_VERSIONS;
