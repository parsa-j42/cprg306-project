import React, {useCallback, useEffect, useState} from 'react';
import {ActionIcon, Alert, Button, ColorSwatch, Group, Modal, Paper, Stack, Text} from '@mantine/core';
import {IconAlertCircle, IconCheck, IconTrash, IconX} from '@tabler/icons-react';
import {notifications} from '@mantine/notifications';
import {services} from '@/lib/services';
import {CreateTransactionDTO, Transaction, TransactionCategory, UpdateTransactionDTO} from '@/types/transactions';
import {AppError} from '@/lib/errors';
import {Account} from '@/types/accounts';
import {formatCurrency} from '@/lib/utils';
import {useAuth} from '@/lib/hooks/useAuth';
import TransactionForm from './TransactionForm';

interface TransactionDetailsProps {
    transactionId: string;
    onUpdate?: () => Promise<void>;
}

export default function TransactionDetails({transactionId, onUpdate}: TransactionDetailsProps): React.ReactNode {
    const {user} = useAuth();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const loadTransaction = useCallback(async () => {
        if (!user) return;
        try {
            const found = await services.transactions.getTransactionById(transactionId, user.uid);
            if (found) {
                setTransaction(found);
            }
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to load transaction details',
                    color: 'red',
                    icon: <IconX size={16}/>,
                });
            }
        }
    }, [transactionId, user]);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const [accountsData, categoriesData] = await Promise.all([
                services.accounts.getAccountsByUser(user.uid),
                services.categories.getCategories()
            ]);
            setAccounts(accountsData);
            setCategories(categoriesData);
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void Promise.all([loadTransaction(), loadData()]);
    }, [loadTransaction, loadData]);

    const handleUpdate = async (formData: CreateTransactionDTO) => {
        if (!user || !transaction) return;

        try {
            setLoading(true);

            const updateData: UpdateTransactionDTO = {
                amount: formData.amount,
                type: formData.type,
                category: formData.category,
                description: formData.description,
                partyName: formData.partyName || null,
                requiresPayback: formData.requiresPayback,
                paybackDetails: formData.requiresPayback ? {
                    dueDate: formData.paybackDetails?.dueDate || new Date(),
                    status: transaction.paybackDetails?.status || 'PENDING',
                    completedAt: transaction.paybackDetails?.completedAt || null
                } : null
            };

            await services.transactions.updateTransaction(
                transaction.id,
                updateData,
                user.uid
            );

            await loadTransaction();
            if (onUpdate) await onUpdate();
            setIsEditing(false);

        } catch (error) {
            console.error('Update error:', error);
            if (error instanceof AppError) {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user || !window.confirm('Are you sure you want to delete this transaction?')) return;

        try {
            setLoading(true);
            await services.transactions.deleteTransaction(transactionId, user.uid);
            notifications.show({
                title: 'Success',
                message: 'Transaction deleted successfully',
                color: 'lightSeaGreen',
                icon: <IconCheck size={16}/>,
            });
            if (onUpdate) await onUpdate();
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to delete transaction',
                    color: 'red',
                    icon: <IconX size={16}/>,
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePaybackStatusUpdate = async () => {
        if (!user || !transaction?.paybackDetails) return;

        try {
            const newStatus = transaction.paybackDetails.status === 'PAID' ? 'PENDING' : 'PAID';
            await services.transactions.updateTransaction(
                transaction.id,
                {
                    paybackDetails: {
                        dueDate: transaction.paybackDetails.dueDate,
                        status: newStatus,
                        completedAt: newStatus === 'PAID' ? new Date() : null
                    }
                },
                user.uid
            );
            await loadTransaction();
            notifications.show({
                title: 'Success',
                message: 'Payback status updated',
                color: 'lightSeaGreen',
                icon: <IconCheck size={16}/>,
            });
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
            }
        }
    };

    if (loading) return <Text>Loading...</Text>;
    if (!transaction) return <Text c="dimmed">Transaction not found.</Text>;

    const account = accounts.find(a => a.id === transaction.accountId);
    const category = categories.find(c => c.name === transaction.category);

    const getTransactionColor = () =>
        transaction.category === 'TRANSFER' ? 'blue' :
            transaction.type === 'POSITIVE' ? 'green' : 'red';

    return (
        <Stack gap="md">
            {error && (
                <Alert
                    icon={<IconAlertCircle size={16}/>}
                    color="red"
                    title="Error"
                    onClose={() => setError('')}
                    withCloseButton
                >
                    {error}
                </Alert>
            )}

            {isEditing && transaction && (
                <Modal
                    opened={isEditing}
                    onClose={() => setIsEditing(false)}
                    title="Edit Transaction"
                >
                    <TransactionForm
                        type={transaction.type}
                        initialData={{
                            accountId: transaction.accountId,
                            amount: transaction.amount,
                            type: transaction.type,
                            category: transaction.category,
                            description: transaction.description,
                            partyName: transaction.partyName || undefined,
                            requiresPayback: transaction.requiresPayback,
                            paybackDetails: transaction.paybackDetails ? {
                                dueDate: transaction.paybackDetails.dueDate
                            } : undefined,
                            transactionDate: transaction.createdAt
                        }}
                        onSuccessAction={handleUpdate}
                        onCancelAction={() => setIsEditing(false)}
                        isEditing={true}
                    />
                </Modal>
            )}

            <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="md">
                    <Text size="lg" fw={500}>Transaction Details</Text>
                    <Group gap="xs">
                        <Button
                            variant="light"
                            onClick={() => setIsEditing(true)}
                            disabled={loading || transaction.category === 'TRANSFER'}
                        >
                            Edit
                        </Button>
                        <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => void handleDelete()}
                            disabled={loading}
                        >
                            <IconTrash size={16}/>
                        </ActionIcon>
                    </Group>
                </Group>

                <Stack gap="xs">
                    <DetailItem
                        label="Amount"
                        value={`${transaction.type === 'NEGATIVE' ? '-' : ''}${formatCurrency(transaction.amount)}`}
                        color={getTransactionColor()}
                    />
                    <DetailItem label="Description" value={transaction.description}/>
                    <DetailItem
                        label="Category"
                        value={
                            <Group gap="xs">
                                {category && <ColorSwatch color={category.color || '#868e96'} size={16}/>}
                                <Text>{transaction.category}</Text>
                            </Group>
                        }
                    />
                    <DetailItem
                        label="Account"
                        value={
                            <Group gap="xs">
                                {account && <ColorSwatch color={account.color} size={16}/>}
                                <Text>{account?.name}</Text>
                            </Group>
                        }
                    />
                    {transaction.partyName && (
                        <DetailItem label="Party" value={transaction.partyName}/>
                    )}
                    <DetailItem
                        label="Date"
                        value={transaction.createdAt.toLocaleDateString('en-CA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    />
                    {transaction.requiresPayback && transaction.paybackDetails && (
                        <DetailItem
                            label="Payback Status"
                            value={
                                <Button
                                    variant="light"
                                    size="xs"
                                    color={transaction.paybackDetails.status === 'PAID' ? 'green' : 'orange'}
                                    onClick={() => void handlePaybackStatusUpdate()}
                                >
                                    {transaction.paybackDetails.status}
                                </Button>
                            }
                        />
                    )}
                </Stack>
            </Paper>
        </Stack>
    );
}

interface DetailItemProps {
    label: string;
    value: React.ReactNode;
    color?: string;
}

function DetailItem({label, value, color}: DetailItemProps) {
    return (
        <Group>
            <Text fw={500} size="sm" w={120}>{label}:</Text>
            {typeof value === 'string' ? (
                <Text c={color}>{value}</Text>
            ) : (
                value
            )}
        </Group>
    );
}