import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="glass-card max-w-md w-full p-8 text-center animate-slide-in">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-orange-500" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-3">Page Not Found</h1>
                <p className="text-foreground-muted mb-8 text-sm leading-relaxed">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                <Link
                    href="/"
                    className="btn-primary w-full inline-block text-center"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}
