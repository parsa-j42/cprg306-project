import {useState} from 'react';
import {Alert, Anchor, Button, Divider, Group, PasswordInput, Stack, Text, TextInput} from '@mantine/core';
import {IconAlertCircle, IconBrandGithub} from '@tabler/icons-react';
import {services} from '@/lib/services';
import {AppError, ErrorCodes} from '@/lib/errors';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

interface LoginFormData {
    email: string;
    password: string;
}

export default function LoginForm() {
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: ''
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleInputChange = (field: keyof LoginFormData) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData({...formData, [field]: event.target.value});
        setError(''); // Clear error when user types
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');
            await services.users.signIn(formData.email, formData.password);
            router.replace('/dashboard');
        } catch (error) {
            if (error instanceof AppError) {
                switch (error.code) {
                    case ErrorCodes.INVALID_CREDENTIALS:
                        setError('Invalid email or password');
                        break;
                    default:
                        setError('An error occurred. Please try again.');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGithubLogin = async () => {
        try {
            setLoading(true);
            setError('');
            await services.users.signInWithGithub();
            router.replace('/dashboard');
        } catch (error) {
            if (error instanceof AppError) {
                setError('Failed to sign in with GitHub. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack>
                {error && (
                    <Alert icon={<IconAlertCircle size={16}/>} color="red" title="Error">
                        {error}
                    </Alert>
                )}

                <TextInput
                    required
                    label="Email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    disabled={loading}
                />

                <PasswordInput
                    required
                    label="Password"
                    placeholder="Your password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    disabled={loading}
                />

                <Button type="submit" loading={loading} fullWidth>
                    Sign in
                </Button>

                <Divider label="Or continue with" labelPosition="center"/>

                <Button
                    leftSection={<IconBrandGithub size={16}/>}
                    variant="default"
                    onClick={handleGithubLogin}
                    disabled={loading}
                    fullWidth
                >
                    GitHub
                </Button>
                <Group justify="center" mt="md">
                    <Text size="sm">
                        Don't have an account?{' '}
                        <Anchor component={Link} href="/signup" size="sm">
                            Create one
                        </Anchor>
                    </Text>
                </Group>
            </Stack>
        </form>
    );
}