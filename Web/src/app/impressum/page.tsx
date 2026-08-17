import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Impressum | RunFlow',
    description: 'Legal Notice (Impressum) for RunFlow',
};

export default function ImpressumPage() {
    return (
        <div className="min-h-screen bg-background text-foreground py-16 px-4">
            <div className="container mx-auto max-w-3xl prose dark:prose-invert prose-orange">
                <Link href="/" className="text-orange-500 hover:text-orange-400 no-underline mb-8 inline-block transition-colors">
                    &larr; Back to Home
                </Link>
                <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">Impressum</h1>
                <p className="text-foreground-muted text-sm mb-8">Legal Notice required under TMG §5 / DDG §5</p>

                <h2>Site Operator</h2>
                <p>
                    <strong>Thies Schuelken</strong><br />
                    Str. Viilor 40<br />
                    400347 Cluj-Napoca<br />
                    Romania
                </p>

                <h2>Contact</h2>
                <p>
                    Email: <a href="mailto:privacy@schuelken.uk" className="text-orange-500 hover:underline">privacy@schuelken.uk</a>
                </p>

                <h2>EU Online Dispute Resolution</h2>
                <p>
                    The European Commission provides a platform for online dispute resolution (OS), which you can find here: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">https://ec.europa.eu/consumers/odr</a>.
                    <br /><br />
                    We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.
                </p>

                <h2>Liability for Contents</h2>
                <p>
                    As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to Section 7 (1) TMG. According to §§ 8 to 10 TMG, however, we as a service provider are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.
                </p>

                <h2>Liability for Links</h2>
                <p>
                    Our website contains links to external websites of third parties on whose contents we have no influence. Therefore, we cannot assume any liability for these external contents. The respective provider or operator of the pages is always responsible for the content of the linked pages.
                </p>

                <h2>Copyright</h2>
                <p>
                    The content and works published on this website are governed by the copyright laws of Germany/EU. Any duplication, processing, distribution or any form of utilization beyond the scope of copyright law shall require the prior written consent of the author or authors in question.
                </p>
            </div>
        </div>
    );
}
