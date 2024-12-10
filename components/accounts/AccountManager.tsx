'use client';

import {useCallback, useEffect, useState} from 'react';
import {ActionIcon, Alert, Button, ColorInput, Group, Modal, Paper, Stack, Text, TextInput} from '@mantine/core';
import {IconAlertCircle, IconCheck, IconEdit, IconPlus, IconTrash, IconX} from '@tabler/icons-react';
import {services} from '@/lib/services';
import {Account, CreateAccountDTO, UpdateAccountDTO} from '@/types/accounts';
import {AppError} from '@/lib/errors';
import {useAuth} from '@/lib/hooks/useAuth';
import {notifications} from '@mantine/notifications';

export default function AccountManager() {
    const {user} = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string>('');
    const [formData, setFormData] = useState<CreateAccountDTO>({
        name: '',
        color: '#1c7ed6'
    });

    const loadAccounts = useCallback(async () => {
        try {
            if (!user) return;
            const data = await services.accounts.getAccountsByUser(user.uid);
            setAccounts(data);
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
    }, [user]);


    useEffect(() => {
        loadAccounts();
    }, [user, loadAccounts]);

    const handleCreateAccount = async () => {
        try {
            if (!user) return;
            await services.accounts.createAccount(user.uid, formData);
            await loadAccounts();
            notifications.show({
                title: 'Success',
                message: 'Account created successfully',
                color: 'LightSeaGreen',
                icon: <IconCheck size={16}/>,
                autoClose: 3000,
            });
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to create account',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        }
    };

    const handleUpdateAccount = async () => {
        try {
            if (!selectedAccount) return;

            const updateData: UpdateAccountDTO = {
                name: formData.name,
                color: formData.color
            };

            await services.accounts.updateAccount(selectedAccount.id, updateData);
            await loadAccounts();
            notifications.show({
                title: 'Success',
                message: 'Account modified successfully',
                color: 'LightSeaGreen',
                icon: <IconCheck size={16}/>,
                autoClose: 3000,
            });
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to modify account',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        }
    };

    const handleEditClick = (account: Account) => {
        setSelectedAccount(account);
        setFormData({
            name: account.name,
            color: account.color
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (account: Account) => {
        if (!user) return;

        const confirmed = window.confirm('Are you sure you want to delete this account? This action cannot be undone.');
        if (!confirmed) return;

        try {
            await services.accounts.deleteAccount(account.id, user.uid);
            await loadAccounts();
            notifications.show({
                title: 'Success',
                message: 'Account deleted successfully',
                color: 'LightSeaGreen',
                icon: <IconCheck size={16}/>,
                autoClose: 3000,
            });
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to delete accounts',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            color: '#1c7ed6'
        });
        setSelectedAccount(null);
        setIsEditing(false);
        setError('');
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    return (
        <Stack gap="md">
            {error && (
                <Alert icon={<IconAlertCircle size={16}/>} color="red" title="Error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Group justify="space-between" align="center">
                <Text size="lg" fw={500}>Accounts</Text>
                <Button
                    leftSection={<IconPlus size={16}/>}
                    onClick={() => setIsModalOpen(true)}
                >
                    Add Account
                </Button>
            </Group>

            <Stack gap="sm">
                {accounts.map((account) => (
                    <Paper key={account.id} withBorder p="md" radius="md">
                        <Group justify="space-between" align="center">
                            <Group gap="sm">
                                <div
                                    style={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        backgroundColor: account.color
                                    }}
                                />
                                <Text fw={500}>{account.name}</Text>
                            </Group>
                            <Group gap="xs">
                                <ActionIcon
                                    variant="light"
                                    onClick={() => handleEditClick(account)}
                                    color="blue"
                                >
                                    <IconEdit size={16}/>
                                </ActionIcon>
                                <ActionIcon
                                    variant="light"
                                    color="red"
                                    onClick={() => handleDeleteClick(account)}
                                >
                                    <IconTrash size={16}/>
                                </ActionIcon>
                            </Group>
                        </Group>
                    </Paper>
                ))}
            </Stack>

            <Modal
                opened={isModalOpen}
                onClose={handleCloseModal}
                title={isEditing ? "Edit Account" : "Create Account"}
            >
                <Stack gap="md">
                    <TextInput
                        label="Account Name"
                        placeholder="Enter account name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                    />

                    <ColorInput
                        label="Account Color"
                        placeholder="Choose color"
                        value={formData.color}
                        onChange={(color) => setFormData({...formData, color})}
                        format="hex"
                        swatches={['#25262b', '#868e96', '#fa5252', '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886', '#40c057', '#82c91e', '#fab005', '#fd7e14']}
                    />

                    <Button
                        onClick={isEditing ? handleUpdateAccount : handleCreateAccount}
                        fullWidth
                    >
                        {isEditing ? "Update Account" : "Create Account"}
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
}