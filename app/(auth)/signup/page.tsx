'use client';

import {Container, Paper, Title} from '@mantine/core';
import SignUpForm from '@/components/auth/SignUpForm';
import {useAuth} from '@/lib/hooks/useAuth';
import {useRouter} from 'next/navigation';
import {useEffect} from 'react';

export default function SignUpPage() {
    const {user, loading} = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (user) {
        return null; // useEffect handles the redirect
    }

    return (
        <Container size={420} my={40}>
            <Title ta="center">Create Account</Title>
            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <SignUpForm/>
            </Paper>
        </Container>
    );
}