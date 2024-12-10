import {useEffect, useState} from 'react';
import {Alert, Button, ColorSwatch, Group, NumberInput, Select, SelectProps, Stack, TextInput} from '@mantine/core';
import {IconAlertCircle, IconArrowRight, IconCheck, IconX} from '@tabler/icons-react';
import {notifications} from '@mantine/notifications';
import {services} from '@/lib/services';
import {CreateTransactionDTO} from '@/types/transactions';
import {Account} from '@/types/accounts';
import {AppError} from '@/lib/errors';
import {useAuth} from '@/lib/hooks/useAuth';

export interface TransferFormProps {
    onSuccessAction: () => Promise<void>;
    onCancelAction: () => void;
}

export default function TransferForm({onSuccessAction, onCancelAction}: TransferFormProps) {
    const {user} = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        description: ''
    });

    const renderAccountOption: SelectProps['renderOption'] = ({option}) => (
        <Group flex="1" gap="xs">
            {option.value &&
                <ColorSwatch color={accounts.find(a => a.id === option.value)?.color || '#868e96'} size={13}/>}
            {option.label}
        </Group>
    );

    useEffect(() => {
        const loadAccounts = async () => {
            try {
                if (!user) return;
                const accountsData = await services.accounts.getAccountsByUser(user.uid);
                setAccounts(accountsData);

                // Set default accounts if we have at least 2 accounts
                if (accountsData.length >= 2) {
                    setFormData(prev => ({
                        ...prev,
                        fromAccountId: accountsData[0].id,
                        toAccountId: accountsData[1].id
                    }));
                }
            } catch (error) {
                if (error instanceof AppError) {
                    setError(error.message);
                    notifications.show({
                        title: 'Error',
                        message: 'Failed to load accounts',
                        color: 'LightSalmon',
                        icon: <IconX size={16}/>,
                        autoClose: 3000,
                    });
                }
            }
        };

        loadAccounts();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        if (formData.fromAccountId === formData.toAccountId) {
            setError('Cannot transfer to the same account');
            return;
        }

        if (formData.amount <= 0) {
            setError('Transfer amount must be greater than 0');
            return;
        }

        const fromAccount = accounts.find(a => a.id === formData.fromAccountId);
        const toAccount = accounts.find(a => a.id === formData.toAccountId);

        if (!fromAccount || !toAccount) {
            setError('Invalid accounts selected');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const transferTransactions: CreateTransactionDTO[] = [
                {
                    accountId: formData.fromAccountId,
                    amount: formData.amount,
                    type: 'NEGATIVE',
                    category: 'TRANSFER',
                    description: `Transfer to ${toAccount.name}${formData.description ? ': ' + formData.description : ''}`,
                },
                {
                    accountId: formData.toAccountId,
                    amount: formData.amount,
                    type: 'POSITIVE',
                    category: 'TRANSFER',
                    description: `Transfer from ${fromAccount.name}${formData.description ? ': ' + formData.description : ''}`,
                }
            ];

            await services.transactions.createChainedTransactions(user.uid, transferTransactions);
            notifications.show({
                title: 'Success',
                message: 'Transfer completed successfully',
                color: 'LightSeaGreen',
                icon: <IconCheck size={16}/>,
                autoClose: 3000,
            });
            await onSuccessAction();
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to complete transfer',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if (accounts.length < 2) {
        return (
            <Alert
                icon={<IconAlertCircle size={16}/>}
                color="yellow"
                title="Cannot Make Transfer"
            >
                You need at least two accounts to make a transfer. Please create another account first.
            </Alert>
        );
    }

    const fromAccount = accounts.find(a => a.id === formData.fromAccountId);
    const toAccount = accounts.find(a => a.id === formData.toAccountId);

    return (
        <form onSubmit={handleSubmit}>
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

                <Group align="flex-start" gap="xs">
                    <Select
                        label="From Account"
                        placeholder="Select source account"
                        data={accounts.map(account => ({
                            value: account.id,
                            label: account.name,
                            disabled: account.id === formData.toAccountId
                        }))}
                        value={formData.fromAccountId}
                        onChange={(value) => value && setFormData({...formData, fromAccountId: value})}
                        required
                        style={{flex: 1}}
                        renderOption={renderAccountOption}
                    />

                    <IconArrowRight
                        size={20}
                        style={{marginTop: '2rem'}}
                        color="var(--mantine-color-dimmed)"
                    />

                    <Select
                        label="To Account"
                        placeholder="Select destination account"
                        data={accounts.map(account => ({
                            value: account.id,
                            label: account.name,
                            disabled: account.id === formData.fromAccountId
                        }))}
                        value={formData.toAccountId}
                        onChange={(value) => value && setFormData({...formData, toAccountId: value})}
                        required
                        style={{flex: 1}}
                        renderOption={renderAccountOption}
                    />
                </Group>

                <NumberInput
                    label="Transfer Amount"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(value) => setFormData({...formData, amount: typeof value === 'number' ? value : 0})}
                    required
                    min={0}
                    prefix="$"
                    decimalScale={2}
                    fixedDecimalScale
                />

                <TextInput
                    label="Description (Optional)"
                    placeholder="Enter transfer description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                />

                <Group justify="space-between" mt="md">
                    <Button
                        variant="light"
                        onClick={onCancelAction}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={loading}
                    >
                        Complete Transfer
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}