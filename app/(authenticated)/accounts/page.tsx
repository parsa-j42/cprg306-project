import {Card, Stack, Title} from '@mantine/core';
import AccountManager from '@/components/accounts/AccountManager';

export default function AccountsPage() {
    return (
        <Stack gap="lg">
            <Title order={2}>Accounts</Title>

            <Card withBorder radius="md">
                <AccountManager/>
            </Card>
        </Stack>
    );
}