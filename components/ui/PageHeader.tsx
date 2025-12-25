
import React, { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    children,
    className = ''
}) => {
    return (
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 ${className}`}>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && <p className="text-gray-500">{subtitle}</p>}
            </div>
            {children && (
                <div className="flex gap-2">
                    {children}
                </div>
            )}
        </div>
    );
};
