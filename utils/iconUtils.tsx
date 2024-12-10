import * as TablerIcons from '@tabler/icons-react';
import React from 'react';

export const getIconComponent = (iconName: string, size: number = 16) => {
    // kebab-case to PascalCase
    const pascalCase = iconName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');

    // Add 'Icon' prefix
    const iconKey = `Icon${pascalCase}` as keyof typeof TablerIcons;

    const Icon = TablerIcons[iconKey] as React.ComponentType<{ size: number }>;

    return Icon ? <Icon size={size}/> : null;
};