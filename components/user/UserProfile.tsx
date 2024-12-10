import {useState} from 'react';
import {Alert, Avatar, Button, Divider, Group, Modal, Paper, Stack, Text} from '@mantine/core';
import {IconAlertCircle, IconAt, IconBrandGithub} from '@tabler/icons-react';
import {services} from '@/lib/services';
import {useAuth} from '@/lib/hooks/useAuth';
import {AppError} from '@/lib/errors';

interface UserProfileModalProps {
    opened: boolean;
    onCloseAction: () => Promise<void>;
}

export default function UserProfile({opened, onCloseAction}: UserProfileModalProps) {
    const {user} = useAuth();
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    const isGithubLinked = user?.providerData?.some(
        provider => provider.providerId === 'github.com'
    );

    const handleResetPassword = async () => {
        if (!user?.email) return;

        try {
            setLoading(true);
            setError('');
            await services.users.resetPassword(user.email);
            setResetEmailSent(true);
        } catch (error) {
            if (error instanceof AppError) {
                setError('Failed to send password reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGithubLink = async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError('');
            await services.users.linkGithubAccount(user);
            // Refresh the page to update the UI with new provider data
            window.location.reload();
        } catch (error) {
            if (error instanceof AppError) {
                setError('Failed to link GitHub account. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async () => {
        await onCloseAction();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title="Profile"
            size="md"
        >
            <Stack gap="md">
                {error && (
                    <Alert icon={<IconAlertCircle size={16}/>} color="red" title="Error" onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {resetEmailSent && (
                    <Alert color="green" title="Success">
                        Password reset email has been sent. Please check your inbox.
                    </Alert>
                )}

                <Paper withBorder p="md" radius="md">
                    <Group>
                        <Avatar
                            src={user?.photoURL}
                            size="lg"
                            radius="xl"
                            color="blue"
                        >
                            {user?.email?.[0]?.toUpperCase()}
                        </Avatar>
                        <Stack gap="xs">
                            <Text size="sm" fw={500}>Account Details</Text>
                            <Group gap="xs">
                                <IconAt size={14} style={{color: 'var(--mantine-color-dimmed)'}}/>
                                <Text size="sm" c="dimmed">{user?.email}</Text>
                            </Group>
                        </Stack>
                    </Group>
                </Paper>

                <Divider label="Connected Accounts" labelPosition="center"/>

                {isGithubLinked ? (
                    <Paper withBorder p="md" radius="md">
                        <Group>
                            <IconBrandGithub size={24}/>
                            <div>
                                <Text size="sm">GitHub Account</Text>
                                <Text size="xs" c="dimmed">Connected</Text>
                            </div>
                        </Group>
                    </Paper>
                ) : (
                    <Button
                        variant="light"
                        onClick={handleGithubLink}
                        loading={loading}
                        leftSection={<IconBrandGithub size={16}/>}
                        fullWidth
                    >
                        Connect GitHub Account
                    </Button>
                )}

                <Divider label="Security" labelPosition="center"/>

                <Button
                    variant="light"
                    onClick={handleResetPassword}
                    loading={loading}
                    fullWidth
                >
                    Reset Password
                </Button>
            </Stack>
        </Modal>
    );
}