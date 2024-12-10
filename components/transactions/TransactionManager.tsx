import {useCallback, useEffect, useState} from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    ColorSwatch,
    Group,
    Modal,
    Paper,
    SegmentedControl,
    Select,
    SelectProps,
    Stack,
    Table,
    Text,
    TextInput,
    Tooltip,
    useComputedColorScheme
} from '@mantine/core';
import {
    IconAlertCircle,
    IconArrowDown,
    IconArrowsRightLeft,
    IconArrowUp,
    IconCheck,
    IconEdit,
    IconTrash,
    IconX
} from '@tabler/icons-react';
import {DatePickerInput} from '@mantine/dates';
import {notifications} from '@mantine/notifications';
import {services} from '@/lib/services';
import {useAuth} from '@/lib/hooks/useAuth';
import {Transaction, TransactionCategory} from '@/types/transactions';
import {AppError} from '@/lib/errors';
import {Account} from '@/types/accounts';
import {formatCurrency, formatDate} from '@/lib/utils';

import {default as TransactionDetailsComponent} from './TransactionDetails';
import TransactionForm from './TransactionForm';
import TransferForm from './TransferForm';

type TransactionType = 'ALL' | 'POSITIVE' | 'NEGATIVE' | 'TRANSFER';

const TransactionDetails = TransactionDetailsComponent as React.ComponentType<{
    transactionId: string;
    onUpdate?: () => Promise<void>;
}>;

export default function TransactionManager() {
    const {user} = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [transactionType, setTransactionType] = useState<TransactionType>('ALL');
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [searchTerm, setSearchTerm] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense' | null>(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    const colorScheme = useComputedColorScheme();
    const loadAccounts = useCallback(async () => {
        try {
            if (!user) return;
            const data = await services.accounts.getAccountsByUser(user.uid);
            setAccounts(data);
            return data;
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
            }
            return [];
        }
    }, [user]);

    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true);
            if (!user || !initialLoadComplete) return;

            let accountTransactions: Transaction[] = [];
            if (selectedAccount) {
                accountTransactions = await services.transactions.getTransactionsByAccount(
                    selectedAccount,
                    dateRange[0] || undefined,
                    dateRange[1] || undefined
                );
            } else {
                const accountPromises = accounts.map(account =>
                    services.transactions.getTransactionsByAccount(
                        account.id,
                        dateRange[0] || undefined,
                        dateRange[1] || undefined
                    )
                );
                const results = await Promise.all(accountPromises);
                accountTransactions = results.flat();
            }

            let filteredTransactions = accountTransactions;

            if (transactionType !== 'ALL') {
                filteredTransactions = filteredTransactions.filter(t => {
                    if (transactionType === 'TRANSFER') {
                        return t.category === 'TRANSFER';
                    }
                    return t.type === transactionType;
                });
            }

            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                filteredTransactions = filteredTransactions.filter(t =>
                    t.description.toLowerCase().includes(search) ||
                    t.category.toLowerCase().includes(search) ||
                    (t.partyName && t.partyName.toLowerCase().includes(search))
                );
            }

            filteredTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setTransactions(filteredTransactions);
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to load transactions',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        } finally {
            setLoading(false);
        }
    }, [user, initialLoadComplete, selectedAccount, dateRange, transactionType, searchTerm, accounts]);

    const loadCategories = useCallback(async () => {
        try {
            const expenseCategories = await services.categories.getCategoriesByType('EXPENSE');
            const incomeCategories = await services.categories.getCategoriesByType('INCOME');
            setCategories([...expenseCategories, ...incomeCategories]);
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
            }
        }
    }, []);

    // Initial data load
    useEffect(() => {
        const init = async () => {
            if (!user) return;

            try {
                setLoading(true);
                const loadedAccounts = await loadAccounts();
                await loadCategories();

                if (loadedAccounts && loadedAccounts.length > 0) {
                    await loadTransactions();
                }
            } catch (error) {
                if (error instanceof AppError) {
                    setError(error.message);
                }
            } finally {
                setLoading(false);
                setInitialLoadComplete(true);
            }
        };

        init();
    }, [user, loadAccounts, loadTransactions, loadCategories]);

    // filter changes
    useEffect(() => {
        if (initialLoadComplete) {
            loadTransactions();
        }
    }, [initialLoadComplete, loadTransactions]);

    const handleTransactionAction = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setShowDetailsModal(true);
    };

    const handleDeleteTransaction = async (transactionId: string) => {
        if (!user) return;

        const confirmed = window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.');
        if (!confirmed) return;

        try {
            await services.transactions.deleteTransaction(transactionId, user.uid);
            notifications.show({
                title: 'Success',
                message: 'Transaction deleted successfully',
                color: 'LightSeaGreen',
                icon: <IconCheck size={16}/>,
                autoClose: 3000,
            });
            await loadTransactions();
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to delete transaction',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        }
    };

    const getTransactionColor = (transaction: Transaction) => {
        if (transaction.category === 'TRANSFER') return 'blue';
        return transaction.type === 'POSITIVE' ? 'green' : 'red';
    };

    const handleQuickAction = (type: 'income' | 'expense' | 'transfer') => {
        if (type === 'transfer') {
            setShowTransferModal(true);
        } else {
            setModalType(type);
            setShowCreateModal(true);
        }
    };

    const handleCreateSuccess = async () => {
        setShowCreateModal(false);
        setShowTransferModal(false);
        setModalType(null);
        await loadTransactions();
    };

    const renderSelectOption: SelectProps['renderOption'] = ({option, checked}) => {
        if (option.value === '') {
            return <Group flex="1" gap="xs">{option.label}</Group>;
        }

        const account = accounts.find(a => a.id === option.value);

        return (
            <Group flex="1" gap="xs">
                {account && <ColorSwatch color={account.color} size={13}/>}
                {option.label}
            </Group>
        );
    };

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

            <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="lg" fw={500}>Transactions</Text>
                <Group gap="xs">
                    <ActionIcon
                        variant="light"
                        color="green"
                        onClick={() => handleQuickAction('income')}
                        size="lg"
                        title="Add Income"
                    >
                        <IconArrowUp size={20}/>
                    </ActionIcon>
                    <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleQuickAction('expense')}
                        size="lg"
                        title="Add Expense"
                    >
                        <IconArrowDown size={20}/>
                    </ActionIcon>
                    <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleQuickAction('transfer')}
                        size="lg"
                        title="Make Transfer"
                    >
                        <IconArrowsRightLeft size={20}/>
                    </ActionIcon>
                </Group>
            </Group>

            <Paper withBorder p="md" radius="md">
                <Stack gap="md">
                    <Group grow>
                        <Select
                            placeholder="All Accounts"
                            value={selectedAccount}
                            onChange={setSelectedAccount}
                            data={[
                                {value: '', label: 'All Accounts'},
                                ...accounts.map(account => ({
                                    value: account.id,
                                    label: account.name
                                }))
                            ]}
                            renderOption={renderSelectOption}
                        />
                        <DatePickerInput
                            type="range"
                            placeholder="Pick date range"
                            value={dateRange}
                            onChange={setDateRange}
                            clearable
                        />
                    </Group>

                    <Group grow>
                        <TextInput
                            placeholder="Search transactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <SegmentedControl
                            value={transactionType}
                            onChange={(value) => setTransactionType(value as TransactionType)}
                            data={[
                                {label: 'All', value: 'ALL'},
                                {label: 'Income', value: 'POSITIVE'},
                                {label: 'Expenses', value: 'NEGATIVE'},
                                {label: 'Transfers', value: 'TRANSFER'}
                            ]}
                        />
                    </Group>
                </Stack>
            </Paper>

            <Paper withBorder radius="md">
                <Table.ScrollContainer minWidth={500}>
                    <Table highlightOnHover verticalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Date</Table.Th>
                                <Table.Th>Description</Table.Th>
                                <Table.Th>Category</Table.Th>
                                <Table.Th>Amount</Table.Th>
                                <Table.Th>Account</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {transactions.map((transaction) => {
                                const account = accounts.find(a => a.id === transaction.accountId);
                                const category = categories.find(c => c.name === transaction.category);

                                return (<Table.Tr key={transaction.id} bg={transaction.chainId ?
                                    'var(--mantine-color-' + (colorScheme === 'dark' ? 'gray-8' : 'blue-0') + ')'
                                    : undefined}><Table.Td>
                                    <Group gap="xs">
                                        {transaction.chainId && (
                                            <Tooltip label="Part of a transfer">
                                                <IconArrowsRightLeft size={16} style={{opacity: 0.5}}/>
                                            </Tooltip>
                                        )}
                                        {formatDate(transaction.createdAt)}
                                    </Group>
                                </Table.Td><Table.Td>{transaction.description}</Table.Td><Table.Td>
                                    <Badge color={getTransactionColor(transaction)}>
                                        {transaction.category}
                                    </Badge>
                                </Table.Td><Table.Td>
                                    <Text c={getTransactionColor(transaction)}>
                                        {transaction.type === 'NEGATIVE' ? '-' : ''}
                                        {formatCurrency(transaction.amount)}
                                    </Text>
                                </Table.Td><Table.Td>
                                    <Group gap="xs">
                                        {account && <ColorSwatch color={account.color} size={13}/>}
                                        <Text>{account?.name}</Text>
                                    </Group>
                                </Table.Td><Table.Td>
                                    <Group gap="xs">
                                        <ActionIcon
                                            variant="light"
                                            color="blue"
                                            onClick={() => handleTransactionAction(transaction)}
                                            size="sm">
                                            <IconEdit size={16}/>
                                        </ActionIcon>
                                        <ActionIcon
                                            variant="light"
                                            color="red"
                                            onClick={() => handleDeleteTransaction(transaction.id)}
                                            size="sm">
                                            <IconTrash size={16}/>
                                        </ActionIcon>
                                    </Group>
                                </Table.Td></Table.Tr>);
                            })}
                            {transactions.length === 0 && (
                                <Table.Tr><Table.Td colSpan={6}>
                                    <Text c="dimmed" ta="center" py="xl">
                                        No transactions found.
                                    </Text>
                                </Table.Td></Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>

            {/* Create Transaction Modal */}
            <Modal
                opened={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setModalType(null);
                }}
                title={modalType === 'income' ? 'Add Income' : 'Add Expense'}
            >
                <TransactionForm
                    type={modalType === 'income' ? 'POSITIVE' : 'NEGATIVE'}
                    onSuccessAction={handleCreateSuccess}
                    onCancelAction={() => setShowCreateModal(false)}
                />
            </Modal>

            {/* Transfer Modal */}
            <Modal
                opened={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                title="Transfer Between Accounts"
            >
                <TransferForm
                    onSuccessAction={handleCreateSuccess}
                    onCancelAction={() => setShowTransferModal(false)}
                />
            </Modal>

            {/* Transaction Details Modal */}
            <Modal
                opened={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedTransaction(null);
                }}
                title="Transaction Details"
            >
                {selectedTransaction && (
                    <TransactionDetails
                        transactionId={selectedTransaction.id}
                        onUpdate={async () => {
                            await loadTransactions();
                            setShowDetailsModal(false);
                            setSelectedTransaction(null);
                        }}
                    />
                )}
            </Modal>
        </Stack>
    );
}