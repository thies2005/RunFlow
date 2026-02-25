import Link from 'next/link';

export const metadata = {
    title: 'Terms of Service | RunFlow',
    description: 'Terms of Service for RunFlow',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white py-16 px-4">
            <div className="max-w-3xl mx-auto prose prose-invert prose-orange">
                <Link href="/" className="text-orange-500 hover:text-orange-400 no-underline mb-8 inline-block transition-colors">
                    &larr; Back to Home
                </Link>
                <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">Terms of Service</h1>
                <p className="text-gray-400 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing and using RunFlow (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;), you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, you must not use our service. RunFlow is an analytical application designed solely for tracking and visualizing personal training data.
                </p>

                <h2>2. Eligibility</h2>
                <p>
                    You must be at least 16 years old to use RunFlow. By creating an account, you represent and warrant that you meet this age requirement. If you are under 16, do not use our service or provide us with any personal data.
                </p>

                <h2>3. User Accounts</h2>
                <p>
                    To use certain features, you must register for an account using your email address or via a third-party service such as Strava.
                </p>
                <ul>
                    <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                    <li>You agree to provide accurate and complete information during registration.</li>
                    <li>You are solely responsible for all activities that occur under your account.</li>
                </ul>

                <h2>4. Health and Fitness Disclaimer</h2>
                <p>
                    RunFlow provides training analytics, race predictions, and AI-driven coaching suggestions based on your synchronized data. <strong>This information is for educational and informational purposes only and does not constitute medical advice.</strong>
                </p>
                <ul>
                    <li>Always consult with a qualified healthcare professional or certified coach before starting any new training program or significantly changing your physical activity.</li>
                    <li>RunFlow is not a diagnostic tool and should not be used to treat or manage any medical condition or injury.</li>
                    <li>You engage in physical activities at your own risk. We are not liable for any injuries, health complications, or damages resulting from the use of our service or reliance on our analytics.</li>
                </ul>

                <h2>5. Acceptable Use</h2>
                <p>You agree not to:</p>
                <ul>
                    <li>Use the service for any illegal, unauthorized, or dangerous purpose.</li>
                    <li>Attempt to gain unauthorized access to our systems, APIs, or other users&apos; accounts.</li>
                    <li>Interfere with or disrupt the performance and security of the service.</li>
                    <li>Use automated scripts, bots, or scrapers to extract data from RunFlow without our express written permission.</li>
                </ul>

                <h2>6. Intellectual Property</h2>
                <p>
                    The RunFlow application, including its design, analytics algorithms, branding, and source code (where not explicitly open-sourced), are owned by RunFlow. You are granted a limited, personal, non-exclusive, non-transferable license to use the service for your personal fitness tracking. You may not copy, modify, distribute, sell, or lease any part of our service.
                </p>

                <h2>7. Third-Party Services (Strava)</h2>
                <p>
                    RunFlow integrates with third-party platforms, principally Strava. Your use of such third-party services is governed by their respective terms and privacy policies. We are not responsible for the availability, accuracy, or reliability of data provided by Strava or other external services. If you revoke access via a third party, certain functionalities of RunFlow will cease to work.
                </p>

                <h2>8. Termination</h2>
                <p>
                    We reserve the right to suspend or terminate your account at our sole discretion, without prior notice, if you violate these Terms of Service, engage in abusive behavior, or if we decide to discontinue the service. You may terminate your account at any time via the account deletion mechanism in the application settings. Upon deletion, all your personal data will be irreversibly removed as outlined in our Privacy Policy.
                </p>

                <h2>9. Limitation of Liability</h2>
                <p>
                    To the maximum extent permitted by applicable law (including German law), RunFlow and its operators shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the service; (ii) any conduct or content of any third party on the service; or (iii) any unauthorized access, use, or alteration of your transmissions or content.
                </p>
                <p>
                    Our liability is strictly limited to intent and gross negligence. Liability for simple negligence is excluded, except in cases of injury to life, body, or health, or breach of essential contractual obligations.
                </p>

                <h2>10. Changes to Terms</h2>
                <p>
                    We may modify these Terms of Service at any time. We will notify you of any material changes via email or an in-app notification. Your continued use of RunFlow after the effective date of the revised terms constitutes your acceptance of the changes.
                </p>

                <h2>11. Governing Law and Jurisdiction</h2>
                <p>
                    These Terms of Service are governed by and construed in accordance with the laws of the Federal Republic of Germany, without regard to its conflict of law principles. If you are a consumer residing in the EU, you also enjoy the protection of the mandatory provisions of the law of your country of residence.
                </p>
                <p>
                    The European Commission provides a platform for online dispute resolution (ODR), which is available at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute resolution proceedings before a consumer arbitration board.
                </p>

                <h2>12. Contact Information</h2>
                <p>
                    If you have any questions about these Terms of Service, please contact us at:{' '}
                    <a href="mailto:privacy@schuelken.uk" className="text-orange-500 hover:underline">
                        privacy@schuelken.uk
                    </a>.
                </p>
            </div>
        </div>
    );
}
