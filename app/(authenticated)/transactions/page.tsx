'use client';

import {Card, Container, Stack, Title} from '@mantine/core';
import TransactionManager from '@/components/transactions/TransactionManager';
import {useSearchParams} from 'next/navigation';
import {useEffect, useState} from 'react';

export default function TransactionsPage() {
    const searchParams = useSearchParams();
    const [initialAccountId, setInitialAccountId] = useState<string | null>(null);

    useEffect(() => {
        const accountParam = searchParams.get('account');
        if (accountParam) {
            setInitialAccountId(accountParam);
        }
    }, [searchParams]);

    return (
        <Container fluid>
            <Stack gap="lg">
                <Title order={2}>Transactions</Title>

                <Card withBorder radius="md">
                    <TransactionManager/>
                </Card>
            </Stack>
        </Container>
    );
}