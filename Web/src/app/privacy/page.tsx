export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto p-8 max-w-2xl prose dark:prose-invert">
            <h1>Privacy Policy</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <h2>Health Data</h2>
            <p>
                RunFlow connects to Health Connect (Android) and Apple Health (iOS) to import your workout data
                (steps, distance, heart rate, and activities).
            </p>
            <ul>
                <li>This data is used solely to generate training analytics and verify your activity history.</li>
                <li>Your health data is not shared with third parties.</li>
                <li>You can revoke access at any time via your device settings.</li>
            </ul>

            <h2>Contact Us</h2>
            <p>
                If you have questions about this policy, please contact support.
            </p>
        </div>
    );
}
