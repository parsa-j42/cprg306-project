'use client';

import {Button, Container, Group, Text, Title} from '@mantine/core';
import Link from 'next/link';
import {useAuth} from '@/lib/hooks/useAuth';
import {redirect} from 'next/navigation';

export default function HomePage() {
    const {user, loading} = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (user) {
        redirect('/dashboard');
    }

    return (
        <Container size="md" style={{textAlign: 'center', paddingTop: '4rem'}}>
            <Title order={1}>Welcome to Money Manager</Title>
            <Text mt="lg" c="dimmed">
                Track your expenses, manage your budget, and achieve your financial goals
            </Text>
            <Group justify="center" mt="xl">
                <Button
                    component={Link}
                    href="/signup"
                    size="lg"
                    variant="filled"
                >
                    Get Started
                </Button>
                <Button
                    component={Link}
                    href="/login"
                    size="lg"
                    variant="light"
                >
                    Sign In
                </Button>
            </Group>
        </Container>
    );
}