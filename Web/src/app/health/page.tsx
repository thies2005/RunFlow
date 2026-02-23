import HealthView from '@/components/views/HealthView';

export default function HealthPage() {
    return (
        <div className="min-h-screen bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <HealthView showHeader={true} />
        </div>
    );
}
