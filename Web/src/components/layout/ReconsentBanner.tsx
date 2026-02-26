'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, CheckCircle, Shield, X, Lock } from 'lucide-react';
import Link from 'next/link';

export default function ReconsentBanner() {
    const { data: session, status } = useSession();
    const [needsConsent, setNeedsConsent] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Checkboxes
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [healthAccepted, setHealthAccepted] = useState(false);
    const [ageAccepted, setAgeAccepted] = useState(false);

    useEffect(() => {
        const checkConsentStatus = async () => {
            if (status !== 'authenticated') {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch('/api/user/consent/check');
                const data = await res.json();

                if (data.needsReconsent) {
                    setNeedsConsent(true);
                }
            } catch (error) {
                console.error('Failed to check consent status:', error);
            } finally {
                setLoading(false);
            }
        };

        checkConsentStatus();
    }, [status]);

    const handleAcceptAll = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const consentTypes = ['TERMS', 'PRIVACY', 'HEALTH_DATA', 'AGE_REQUIREMENT'];

            const results = await Promise.all(consentTypes.map(type =>
                fetch('/api/user/consent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ consentType: type, action: 'GRANTED' }),
                })
            ));

            // Check if all submissions were successful
            const failedResults = results.filter(r => !r.ok);
            if (failedResults.length > 0) {
                setError('Some consents could not be saved. Please try again.');
                return;
            }

            setNeedsConsent(false);
        } catch (err) {
            console.error('Failed to submit re-consent:', err);
            setError('A network error occurred. Please check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !needsConsent) return null;

    const allAccepted = termsAccepted && privacyAccepted && healthAccepted && ageAccepted;

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-safe bg-background/95 backdrop-blur-md border-t border-white/10 shadow-2xl animate-slide-up">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">

                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-accent-orange font-semibold">
                            <Shield className="w-5 h-5" />
                            <h3>Important Legal Update (GDPR Compliance)</h3>
                        </div>
                        <p className="text-sm text-foreground-muted">
                            To continue using RunFlow, we require your explicit consent to our updated policies regarding your personal training data.
                        </p>
                        {error && (
                            <p className="text-sm text-red-400 mt-1">{error}</p>
                        )}
                    </div>

                    <div className="flex-1 w-full space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-start pt-0.5">
                                <input type="checkbox" className="peer sr-only" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                                <div className="w-5 h-5 rounded border-2 border-white/20 peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-all flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <span className="text-xs text-gray-300 leading-tight">
                                I accept the updated <Link href="/terms" className="text-orange-500 hover:underline">Terms of Service</Link>.
                            </span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-start pt-0.5">
                                <input type="checkbox" className="peer sr-only" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} />
                                <div className="w-5 h-5 rounded border-2 border-white/20 peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-all flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <span className="text-xs text-gray-300 leading-tight">
                                I accept the updated <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
                            </span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-start pt-0.5">
                                <input type="checkbox" className="peer sr-only" checked={healthAccepted} onChange={(e) => setHealthAccepted(e.target.checked)} />
                                <div className="w-5 h-5 rounded border-2 border-white/20 peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-all flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <span className="text-xs text-gray-300 leading-tight">
                                I consent to the processing of my health and fitness data (GDPR Art. 9) for analytics.
                            </span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-start pt-0.5">
                                <input type="checkbox" className="peer sr-only" checked={ageAccepted} onChange={(e) => setAgeAccepted(e.target.checked)} />
                                <div className="w-5 h-5 rounded border-2 border-white/20 peer-focus:border-accent-orange peer-checked:bg-accent-orange peer-checked:border-accent-orange transition-all flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <span className="text-xs text-gray-300 leading-tight">
                                I confirm I am at least 16 years old.
                            </span>
                        </label>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                        <button
                            onClick={handleAcceptAll}
                            disabled={submitting || !allAccepted}
                            className="bg-accent-orange hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-orange"
                        >
                            {submitting ? 'Updating...' : 'Accept & Continue'}
                            {!submitting && <CheckCircle className="w-4 h-4" />}
                        </button>
                    </div>

                </div>
            </div>

            {/* Blocking overlay that sits beneath the banner but blocks interaction with the rest of the app */}
            <div className="fixed inset-0 bg-black/40 z-[-1] backdrop-blur-[2px]" />
        </div>
    );
}
