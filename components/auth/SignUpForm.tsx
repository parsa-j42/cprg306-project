import {useState} from 'react';
import {Alert, Anchor, Button, Divider, Group, PasswordInput, Stack, Text, TextInput} from '@mantine/core';
import {IconAlertCircle, IconBrandGithub} from '@tabler/icons-react';
import {services} from '@/lib/services';
import {AppError, ErrorCodes} from '@/lib/errors';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

interface SignUpFormData {
    email: string;
    password: string;
    confirmPassword: string;
}

export default function SignUpForm() {
    const [formData, setFormData] = useState<SignUpFormData>({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleInputChange = (field: keyof SignUpFormData) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData({...formData, [field]: event.target.value});
        setError(''); // Clear error when user types
    };

    const validateForm = () => {
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setLoading(true);
            setError('');
            await services.users.signUp(formData.email, formData.password);
            router.replace('/dashboard');
        } catch (error) {
            if (error instanceof AppError) {
                switch (error.code) {
                    case ErrorCodes.EMAIL_ALREADY_EXISTS:
                        setError('An account with this email already exists');
                        break;
                    default:
                        setError('An error occurred. Please try again.');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGithubSignup = async () => {
        try {
            setLoading(true);
            setError('');
            await services.users.signInWithGithub();
            router.replace('/dashboard');
        } catch (error) {
            if (error instanceof AppError) {
                setError('Failed to sign up with GitHub. Please try again.');
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
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    disabled={loading}
                />

                <PasswordInput
                    required
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    disabled={loading}
                />

                <Button type="submit" loading={loading} fullWidth>
                    Create Account
                </Button>

                <Divider label="Or continue with" labelPosition="center"/>

                <Button
                    leftSection={<IconBrandGithub size={16}/>}
                    variant="default"
                    onClick={handleGithubSignup}
                    disabled={loading}
                    fullWidth
                >
                    GitHub
                </Button>

                <Group justify="center" mt="md">
                    <Text size="sm">
                        Already have an account?{' '}
                        <Anchor component={Link} href="/login" size="sm">
                            Sign in
                        </Anchor>
                    </Text>
                </Group>
            </Stack>
        </form>
    );
}