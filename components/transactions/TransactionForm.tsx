import {useCallback, useEffect, useState} from 'react';
import {
    Alert,
    Button,
    ColorSwatch,
    Group,
    NumberInput,
    Select,
    SelectProps,
    Stack,
    Switch,
    TextInput,
} from '@mantine/core';
import {DatePickerInput} from '@mantine/dates';
import {IconAlertCircle, IconCheck, IconX} from '@tabler/icons-react';
import {notifications} from '@mantine/notifications';
import {services} from '@/lib/services';
import {CreateTransactionDTO, TransactionCategory} from '@/types/transactions';
import {Account} from '@/types/accounts';
import {AppError} from '@/lib/errors';
import {useAuth} from '@/lib/hooks/useAuth';

export interface CreateTransactionFormProps {
    type: 'POSITIVE' | 'NEGATIVE';
    initialData?: CreateTransactionDTO;
    onSuccessAction: (data: CreateTransactionDTO) => Promise<void>;
    onCancelAction: () => void;
    isEditing?: boolean;
}

export default function TransactionForm({
                                            type,
                                            initialData,
                                            onSuccessAction,
                                            onCancelAction,
                                            isEditing
                                        }: CreateTransactionFormProps) {
    const {user} = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<CreateTransactionDTO>(
        initialData || {
            accountId: '',
            amount: 0,
            type,
            category: '',
            description: '',
            partyName: '',
            requiresPayback: false,
            paybackDetails: undefined,
            transactionDate: new Date()
        }
    );

    const renderAccountOption: SelectProps['renderOption'] = ({option}) => (
        <Group flex="1" gap="xs">
            {option.value &&
                <ColorSwatch color={accounts.find(a => a.id === option.value)?.color || '#868e96'} size={13}/>}
            {option.label}
        </Group>
    );

    const renderCategoryOption: SelectProps['renderOption'] = ({option}) => (
        <Group flex="1" gap="xs">
            {option.value &&
                <ColorSwatch color={categories.find(c => c.name === option.value)?.color || '#868e96'} size={13}/>}
            {option.label}
        </Group>
    );

    const loadData = useCallback(async () => {
        try {
            if (!user) return;

            const [accountsData, categoriesData] = await Promise.all([
                services.accounts.getAccountsByUser(user.uid),
                services.categories.getCategoriesByType(type === 'POSITIVE' ? 'INCOME' : 'EXPENSE')
            ]);

            setAccounts(accountsData);
            setCategories(categoriesData);

            if (accountsData.length > 0 && !formData.accountId) {
                setFormData(prev => ({
                    ...prev,
                    accountId: accountsData[0].id
                }));
            }
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to load form data',
                    color: 'LightSalmon',
                    icon: <IconX size={16} />,
                    autoClose: 3000,
                });
            }
        }
    }, [user, type, formData.accountId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        try {
            setLoading(true);
            setError('');

            if (isEditing) {
                await onSuccessAction(formData);
            } else {
                await services.transactions.createTransaction(user.uid, formData);
                await onSuccessAction(formData);
            }

            notifications.show({
                title: 'Success',
                message: isEditing ? 'Transaction updated successfully' : 'Transaction created successfully',
                color: 'LightSeaGreen',
                icon: <IconCheck size={16}/>,
            });
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };
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

                <Select
                    label="Account"
                    placeholder="Select account"
                    data={accounts.map(account => ({
                        value: account.id,
                        label: account.name
                    }))}
                    value={formData.accountId}
                    onChange={(value) => value && setFormData({...formData, accountId: value})}
                    required
                    renderOption={renderAccountOption}
                />

                <NumberInput
                    label={type === 'POSITIVE' ? 'Income Amount' : 'Expense Amount'}
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(value) => setFormData({...formData, amount: typeof value === 'number' ? value : 0})}
                    required
                    min={0}
                    prefix="$"
                    decimalScale={2}
                    fixedDecimalScale
                />

                <Select
                    label="Category"
                    placeholder="Select category"
                    data={categories.map(category => ({
                        value: category.name,
                        label: category.name
                    }))}
                    value={formData.category}
                    onChange={(value) => value && setFormData({...formData, category: value})}
                    required
                    renderOption={renderCategoryOption}
                />

                <TextInput
                    label="Description"
                    placeholder="Enter description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                />

                <TextInput
                    label="Party Name (Optional)"
                    placeholder="Enter party name"
                    value={formData.partyName}
                    onChange={(e) => setFormData({...formData, partyName: e.target.value})}
                />

                <DatePickerInput
                    label="Transaction Date"
                    placeholder="Pick date"
                    value={formData.transactionDate}
                    onChange={(date) => setFormData({
                        ...formData,
                        transactionDate: date || new Date()
                    })}
                    required
                    maxDate={new Date()}
                />

                <Switch
                    label="Requires Payback"
                    checked={formData.requiresPayback}
                    onChange={(e) => setFormData({
                        ...formData,
                        requiresPayback: e.currentTarget.checked,
                        paybackDetails: e.currentTarget.checked ?
                            {dueDate: new Date()} :
                            undefined
                    })}
                />

                {formData.requiresPayback && (
                    <DatePickerInput
                        label="Due Date"
                        placeholder="Pick due date"
                        value={formData.paybackDetails?.dueDate || null}
                        onChange={(date) => setFormData({
                            ...formData,
                            paybackDetails: {
                                dueDate: date || new Date()
                            }
                        })}
                        required
                        minDate={new Date()}
                    />
                )}

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
                        {isEditing ? "Update Transaction" : "Create Transaction"}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}