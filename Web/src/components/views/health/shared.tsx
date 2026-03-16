export const MacroRing = ({ value, target, color, label }: { value: number, target: number, color: string, label: string }) => {
    const safeTarget = target > 0 ? target : 1;
    const percentage = Math.min(value / safeTarget, 1);
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - percentage * circumference;

    return (
        <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
                <svg className="transform -rotate-90 w-8 h-8">
                    <circle cx="16" cy="16" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="transparent" />
                    <circle
                        cx="16"
                        cy="16"
                        r={radius}
                        stroke={color}
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 ease-in-out"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-px">
                    <span className="text-[9px] font-bold text-white leading-none">{Math.round(value)}</span>
                </div>
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{label}</span>
                <span className="text-[9px] text-gray-500 leading-none">{Math.round(target)}g</span>
            </div>
        </div>
    );
};
