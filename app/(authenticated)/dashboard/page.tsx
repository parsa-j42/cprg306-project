"use client";

import {
    ActionIcon,
    Alert,
    Card,
    Collapse,
    ColorSwatch,
    Grid,
    Group,
    RingProgress,
    Skeleton,
    Stack,
    Text,
    Title,
    UnstyledButton
} from '@mantine/core';
import {IconAlertCircle, IconChevronDown, IconChevronUp, IconWallet} from '@tabler/icons-react';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {services} from '@/lib/services';
import {useAuth} from '@/lib/hooks/useAuth';
import {Account} from '@/types/accounts';
import {formatCurrency} from '@/lib/utils';
import {notifications} from '@mantine/notifications';
import {AppError} from '@/lib/errors';
import {RadarChart} from '@mantine/charts';

export default function DashboardPage() {
    const {user} = useAuth();
    const [accountsExpanded, setAccountsExpanded] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [monthlyStats, setMonthlyStats] = useState({
        income: 0,
        expenses: 0
    });
    const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!user) return;

            try {
                setLoading(true);

                const accountsData = await services.accounts.getAccountsByUser(user.uid);
                setAccounts(accountsData);

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                const spendingByCategory = await services.stats.getSpendingByCategory(
                    user.uid,
                    startOfMonth,
                    endOfMonth
                );

                setCategorySpending(spendingByCategory);

                let totalIncome = 0;
                let totalExpenses = 0;

                for (const account of accountsData) {
                    const transactions = await services.transactions.getTransactionsByAccount(
                        account.id,
                        startOfMonth,
                        endOfMonth
                    );

                    for (const transaction of transactions) {
                        if (transaction.category === 'TRANSFER') continue;
                        if (transaction.type === 'POSITIVE') {
                            totalIncome += transaction.amount;
                        } else {
                            totalExpenses += transaction.amount;
                        }
                    }
                }

                setMonthlyStats({
                    income: totalIncome,
                    expenses: totalExpenses
                });

            } catch (error) {
                if (error instanceof AppError) {
                    setError(error.message);
                    notifications.show({
                        title: 'Error',
                        message: 'Failed to load dashboard data',
                        color: 'red',
                        icon: <IconAlertCircle size={16}/>
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [user]);

    const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    const spendingProgress = monthlyStats.income > 0
        ? (monthlyStats.expenses / monthlyStats.income) * 100
        : 0;

    if (loading) {
        return (
            <Stack gap="lg">
                <Title order={2}>Dashboard</Title>
                <Grid>
                    <Grid.Col span={{base: 12, md: 12}}>
                        <Skeleton height={200} radius="md"/>
                    </Grid.Col>
                    <Grid.Col span={{base: 6, md: 6}}>
                        <Skeleton height={100} radius="md"/>
                    </Grid.Col>
                    <Grid.Col span={{base: 6, md: 6}}>
                        <Skeleton height={100} radius="md"/>
                    </Grid.Col>
                </Grid>
            </Stack>
        );
    }

    if (error) {
        return (
            <Alert
                icon={<IconAlertCircle size={16}/>}
                title="Error"
                color="red"
                variant="filled"
            >
                {error}
            </Alert>
        );
    }

    return (
        <Stack gap="lg">
            <Title order={2}>Dashboard</Title>

            <Grid>
                <Grid.Col span={{base: 12, md: 12}}>
                    <Card>
                        <Group justify="space-between" mb="xs">
                            <Text size="lg" fw={500}>Current Balance</Text>
                            <ActionIcon
                                variant="outline"
                                onClick={() => setAccountsExpanded(!accountsExpanded)}
                                aria-label="Toggle accounts"
                                color="#DFC5FE"
                            >
                                {accountsExpanded ? <IconChevronUp size={16}/> : <IconChevronDown size={16}/>}
                            </ActionIcon>
                        </Group>
                        <Text size="xl" m="xs" fw={700} mb="sm">
                            {formatCurrency(totalBalance)}
                        </Text>

                        <Collapse in={accountsExpanded}>
                            <Stack gap="xs">
                                {accounts.map((account) => (
                                    <UnstyledButton
                                        key={account.id}
                                        component={Link}
                                        href={`/transactions?account=${account.id}`}
                                    >
                                        <Group
                                            p="xs"
                                            style={{borderRadius: '8px'}}
                                        >
                                            <IconWallet
                                                size={20}
                                                style={{
                                                    opacity: 0.7,
                                                    color: 'inherit'
                                                }}
                                            />
                                            <ColorSwatch color={account.color} size={13}/>
                                            <div style={{flex: 1}}>
                                                <Text size="sm" fw={500}>{account.name}</Text>
                                                <Text
                                                    size="xs"
                                                    c={account.balance < 0 ? 'red' : 'dimmed'}
                                                >
                                                    {formatCurrency(account.balance)}
                                                </Text>
                                            </div>
                                        </Group>
                                    </UnstyledButton>
                                ))}
                            </Stack>
                        </Collapse>
                    </Card>
                </Grid.Col>

                <Grid.Col span={{base: 6, md: 6}}>
                    <Card>
                        <Text size="lg" fw={500}>Monthly Income</Text>
                        <Text size="xl" fw={700} c="green">
                            {formatCurrency(monthlyStats.income)}
                        </Text>
                    </Card>
                </Grid.Col>

                <Grid.Col span={{base: 6, md: 6}}>
                    <Card>
                        <Text size="lg" fw={500}>Monthly Expenses</Text>
                        <Text size="xl" fw={700} c="red">
                            {formatCurrency(monthlyStats.expenses)}
                        </Text>
                    </Card>
                </Grid.Col>
            </Grid>

            <Grid>
                <Grid.Col span={{base: 12, md: 6}}>
                    <Card>
                        <Title order={3} mb="md">Monthly Overview</Title>
                        <Group justify="center">
                            <RingProgress
                                size={150}
                                thickness={16}
                                roundCaps
                                sections={[{
                                    value: Math.min(spendingProgress, 100),
                                    color: spendingProgress > 100 ? 'red' : '#DFC5FE'
                                }]}
                                label={
                                    <Text ta="center" size="sm" fw={700}>
                                        {spendingProgress.toFixed(1)}%
                                    </Text>
                                }
                            />
                        </Group>
                        <Text ta="center" size="sm" c="dimmed" mt="sm">
                            Monthly Spending per Income
                        </Text>
                    </Card>
                </Grid.Col>
                <Grid.Col span={{base: 12, md: 6}}>
                    <Card>
                        <Title order={3} mb="md">
                            Spending by Category
                        </Title>
                        {Object.keys(categorySpending).length > 0 ? (
                            <RadarChart
                                h={300}
                                data={Object.entries(categorySpending).map(([category, amount]) => ({
                                    category: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
                                    spending: amount
                                }))}
                                dataKey="category"
                                withPolarRadiusAxis
                                polarRadiusAxisProps={{angle: 45, tickFormatter: (value) => `${value}$`}}
                                series={[
                                    {
                                        name: 'spending',
                                        color: '#DFC5FE',
                                        opacity: 0.3
                                    }
                                ]}
                            />
                        ) : (
                            <Text c="dimmed" ta="center">
                                No spending data available
                            </Text>
                        )}
                    </Card>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}