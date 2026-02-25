import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy | RunFlow',
    description: 'Privacy Policy and Data Protection Information for RunFlow',
};

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white py-16 px-4">
            <div className="container mx-auto max-w-3xl prose prose-invert prose-orange">
                <Link href="/" className="text-orange-500 hover:text-orange-400 no-underline mb-8 inline-block transition-colors">
                    &larr; Back to Home
                </Link>
                <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">Privacy Policy</h1>
                <p className="text-gray-400 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

                <p>
                    At RunFlow, we take your privacy seriously. This Privacy Policy explains how we collect, use,
                    process, and protect your personal data when you use the RunFlow application. We comply with
                    the General Data Protection Regulation (GDPR) and other applicable European data protection laws.
                </p>

                <h2>1. Data Controller</h2>
                <p>
                    The entity responsible for the processing of your personal data (Data Controller) is:<br />
                    <strong>RunFlow</strong><br />
                    Email: <a href="mailto:privacy@schuelken.uk" className="text-orange-500 hover:underline">privacy@schuelken.uk</a>
                </p>

                <h2>2. What Data We Collect</h2>
                <p>We collect and process the following categories of personal data:</p>
                <ul>
                    <li><strong>Account & Identity Data:</strong> Name, email address, profile image, and authentication tokens via Strava or direct registration.</li>
                    <li><strong>Biometric Data (Special Category):</strong> Age, biological sex, weight, height, resting heart rate, and maximum heart rate.</li>
                    <li><strong>Activity & Health Data (Special Category):</strong> GPS activities, running statistics, cadence, power, daily step counts, and heart rate zones over time.</li>
                    <li><strong>Nutrition & Supplement Logs:</strong> Caloric tracking, logged food items, supplement intake times, and dosages.</li>
                    <li><strong>AI Interactions:</strong> Chat messages, training questions, and AI coaching history generated via the platform.</li>
                    <li><strong>Technical Data:</strong> IP addresses, browser type, operating system, and push notification tokens.</li>
                </ul>

                <h2>3. Purposes & Legal Basis of Processing (GDPR Art. 6 & 9)</h2>
                <p>We process your data for the following purposes and on the following legal bases:</p>

                <h3>3.1 Providing the Service (Art. 6(1)(b) GDPR)</h3>
                <p>We use your Identity and Technical Data to create your account, manage your sessions, and provide the core functionality of the app.</p>

                <h3>3.2 Processing of Health & Biometric Data (Art. 9(2)(a) GDPR)</h3>
                <p>
                    Because RunFlow offers advanced fitness and training analytics, we process sensitive health data
                    (heart rate, weight, biometrics). <strong>This processing is strictly based on your explicit consent</strong>,
                    which you provide during registration. You can withdraw this consent at any time by deleting your account.
                </p>

                <h3>3.3 Legitimate Interests (Art. 6(1)(f) GDPR)</h3>
                <p>We process Technical Data (e.g., error logs and performance metrics) to ensure the security, stability, and improvement of the application.</p>

                <h2>4. Third-Party Data Transfers & Sub-Processors</h2>
                <p>To provide RunFlow services reliably, we share data with the following third parties. We ensure all providers adhere to strict data protection standards (e.g., via Standard Contractual Clauses or the EU-US Data Privacy Framework).</p>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-collapse border border-gray-700 mt-4 rounded-lg">
                        <thead>
                            <tr className="bg-white/5 border-b border-gray-700">
                                <th className="p-3 text-left">Provider</th>
                                <th className="p-3 text-left">Purpose</th>
                                <th className="p-3 text-left">Data Shared</th>
                                <th className="p-3 text-left">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-800">
                                <td className="p-3"><strong>Strava</strong></td>
                                <td className="p-3">Activity Synchronization</td>
                                <td className="p-3">OAuth Tokens (Read/Write Activities)</td>
                                <td className="p-3">USA</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                                <td className="p-3"><strong>OpenAI / Anthropic / Google</strong></td>
                                <td className="p-3">AI Coaching Features</td>
                                <td className="p-3">Chat messages and necessary fitness metrics for context</td>
                                <td className="p-3">USA</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                                <td className="p-3"><strong>Sentry</strong></td>
                                <td className="p-3">Error Tracking & Stability</td>
                                <td className="p-3">IP Addresses, OS, crash reports</td>
                                <td className="p-3">USA/EU</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                                <td className="p-3"><strong>Open Food Facts</strong></td>
                                <td className="p-3">Barcode Scanning API</td>
                                <td className="p-3">Barcode queries (anonymous)</td>
                                <td className="p-3">EU</td>
                            </tr>
                            <tr>
                                <td className="p-3"><strong>SMTP Providers</strong></td>
                                <td className="p-3">Transactional Emails</td>
                                <td className="p-3">Email address, names</td>
                                <td className="p-3">Varies</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h2>5. Internal Administrative Access</h2>
                <p>
                    For maintenance, troubleshooting, and support purposes, designated administrative staff of RunFlow may have access to your account data. This access is strictly logged, limited to essential personnel, and governed by confidentiality agreements.
                </p>

                <h2>6. Data Retention Period</h2>
                <p>We store your data only for as long as necessary for the respective purpose:</p>
                <ul>
                    <li><strong>Account & Activity Data:</strong> Kept until you explicitly delete your account.</li>
                    <li><strong>AI Chat History:</strong> Kept for a maximum of 12 months, then automatically deleted.</li>
                    <li><strong>Database Backups:</strong> For disaster recovery, encrypted database backups are retained for up to 30 days. When you delete your account, your data is erased from live systems immediately, but will age out of the immutable backups over the standard 30-day lifecycle.</li>
                    <li><strong>Error Logs (Sentry):</strong> Automatically rotated and deleted after 30-90 days.</li>
                </ul>

                <h2>7. Your GDPR Rights</h2>
                <p>Under the GDPR, you have comprehensive rights regarding your personal data:</p>
                <ul>
                    <li><strong>Right to Access (Art. 15):</strong> You can export and download your complete dataset as JSON from the profile settings.</li>
                    <li><strong>Right to Erasure (Art. 17):</strong> The &quot;Delete Account&quot; function permanently removes your personal and health data from our active systems.</li>
                    <li><strong>Right to Rectification (Art. 16):</strong> You can update inaccurate profile information within the app.</li>
                    <li><strong>Right to Withdraw Consent (Art. 7):</strong> Since the core service relies on health data analytics, withdrawing consent requires deleting the account.</li>
                    <li><strong>Right to Data Portability (Art. 20):</strong> We provide machine-readable exports of your activities and health logs.</li>
                    <li><strong>Right to Lodge a Complaint (Art. 77):</strong> You have the right to file a complaint with the data protection supervisory authority in your country of residence or in Germany.</li>
                </ul>

                <h2>8. Cookies and Local Storage</h2>
                <p>
                    RunFlow uses <strong>strictly necessary</strong> cookies to maintain your login session and protect against Cross-Site Request Forgery (CSRF).
                    Because these are essential for the app to function securely, they do not require prior opt-in consent. However, we inform you about them via our cookie banner.
                </p>
                <ul>
                    <li><code>next-auth.session-token</code>: Keeps you logged in securely.</li>
                    <li><code>csrf_token</code>: Prevents malicious cross-site attacks.</li>
                </ul>

                <h2>9. Data Security</h2>
                <p>
                    We protect your data through modern technical and organizational measures. All traffic is encrypted via HTTPS/TLS. API keys and passwords are one-way hashed (bcrypt/SHA-256) or symmetrically encrypted in the database.
                </p>

                <h2>10. Contact for Privacy Matters</h2>
                <p>
                    For data export requests, deletion assistance, or privacy-related questions, please email us directly at: <a href="mailto:privacy@schuelken.uk" className="text-orange-500 hover:underline">privacy@schuelken.uk</a>.
                </p>
            </div>
        </div>
    );
}
