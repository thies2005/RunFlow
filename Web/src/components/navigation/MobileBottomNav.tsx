'use client';

// Tabs are now passed as props
export interface NavTab {
    icon: any;
    label: string;
    path: string;
}

interface MobileBottomNavProps {
    activeIndex: number;
    onTabChange: (_index: number) => void;
    tabs: NavTab[];
}

export function MobileBottomNav({ activeIndex, onTabChange, tabs }: MobileBottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-glass-border backdrop-blur-xl bg-background/90 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16">
                {tabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = activeIndex === index;

                    return (
                        <button
                            key={tab.path}
                            onClick={() => onTabChange(index)}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                ? 'text-accent-orange'
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                            <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export default MobileBottomNav;
