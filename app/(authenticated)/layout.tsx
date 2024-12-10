'use client';
import {useAuth} from '@/lib/hooks/useAuth';
import AppLayoutShell from "@/components/layout/AppLayoutShell";
import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';

export default function AuthenticatedLayout({children}: { children: React.ReactNode }) {
    const {user, loading} = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return null; // useEffect handles redirect
    }

    return <AppLayoutShell>
        {children}
    </AppLayoutShell>;
}