import React from 'react';
import { PoweredByStravaLogo } from '@/components/StravaLogos';
import Link from 'next/link';

export default function SupportPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0f] text-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-12">
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">
                        Support for RunFlow Athletes
                    </h1>
                    <p className="text-gray-400 text-lg">
                        We are here to help you get the most out of your training data.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
                    <h2 className="text-2xl font-semibold text-white">Contact Us</h2>
                    <p className="text-gray-300">
                        If you have any questions, encounter issues, or want to request data deletion, please contact our support team at:
                    </p>
                    <a
                        href="mailto:privacy@schuelken.uk"
                        className="inline-block text-orange-500 hover:text-orange-400 font-medium text-lg transition-colors"
                    >
                        privacy@schuelken.uk
                    </a>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
                    <h2 className="text-2xl font-semibold text-white">Frequently Asked Questions</h2>

                    <div className="space-y-4">
                        <div className="border-b border-white/5 pb-4">
                            <h3 className="font-medium text-white mb-2">How do I sync my data?</h3>
                            <p className="text-gray-400 text-sm">
                                You can sync your data by connecting your Strava account in the settings or on the dashboard.
                            </p>
                        </div>
                        <div className="border-b border-white/5 pb-4">
                            <h3 className="font-medium text-white mb-2">My activities are missing?</h3>
                            <p className="text-gray-400 text-sm">
                                Try using the &quot;Resync All Activities&quot; button in your profile settings to re-fetch your history.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-white mb-2">What data do you store?</h3>
                            <p className="text-gray-400 text-sm">
                                We store your activity data to provide analytics. We do not sell your data.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center pt-8 border-t border-white/10 space-y-4">
                    <PoweredByStravaLogo className="h-10" />
                    <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">
                        &larr; Back to Dashboard
                    </Link>
                </div>
            </div>
        </main>
    );
}
