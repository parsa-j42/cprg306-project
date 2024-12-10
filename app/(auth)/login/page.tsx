'use client';

import {Container, Paper, Text, Title} from '@mantine/core';
import LoginForm from '@/components/auth/LoginForm';
import {useAuth} from '@/lib/hooks/useAuth';
import {useRouter} from 'next/navigation';
import {useEffect} from 'react';

export default function LoginPage() {
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
            <Title ta="center">Welcome to Money Manager</Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Sign in to manage your finances
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <LoginForm/>
            </Paper>
        </Container>
    );
}