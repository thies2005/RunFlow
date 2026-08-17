'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
    name?: string | null;
    image?: string | null;
    className?: string;
}

export function UserAvatar({ name, image, className = "" }: UserAvatarProps) {
    const [imageError, setImageError] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset error state if image changes
    useEffect(() => {
        setImageError(false);
    }, [image]);

    // Use a simple div placeholder during SSR/multration to match dimensions
    if (!mounted) {
        return <div className={`bg-foreground/10 animate-pulse rounded-full ${className}`} />;
    }

    if (image && !imageError) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={image}
                alt={name || 'User'}
                className={`object-cover rounded-full ${className}`}
                onError={() => setImageError(true)}
            />
        );
    }

    // Fallback: Initials
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : null;

    // Generate a consistent background color based on name hash
    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
        'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
        'bg-orange-500', 'bg-teal-500', 'bg-cyan-500'
    ];

    let colorIndex = 0;
    if (name) {
        for (let i = 0; i < name.length; i++) {
            colorIndex += name.charCodeAt(i);
        }
    }
    const bgColor = colors[colorIndex % colors.length];

    return (
        <div className={`flex items-center justify-center text-foreground font-medium rounded-full ${bgColor} ${className}`}>
            {initials ? (
                <span className="text-xs sm:text-sm">{initials}</span>
            ) : (
                <User className="w-1/2 h-1/2" />
            )}
        </div>
    );
}
