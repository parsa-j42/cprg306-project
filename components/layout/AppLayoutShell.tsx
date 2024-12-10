import React, {useState} from 'react';
import {
    ActionIcon,
    AppShell,
    Burger,
    Group,
    Menu,
    NavLink,
    rem,
    Stack,
    Text,
    useMantineColorScheme,
} from '@mantine/core';
import {
    IconArrowDown,
    IconArrowsRightLeft,
    IconArrowUp,
    IconChevronRight,
    IconDashboard,
    IconLogout,
    IconMoon,
    IconReceipt2,
    IconSun,
    IconTags,
    IconUser,
    IconUserCircle,
    IconWallet
} from '@tabler/icons-react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {services} from '@/lib/services';
import UserProfile from '@/components/user/UserProfile';

export default function AppLayoutShell({children}: { children: React.ReactNode }) {
    const [opened, setOpened] = useState(false);
    const [profileOpened, setProfileOpened] = useState(false);
    const {colorScheme, toggleColorScheme} = useMantineColorScheme();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await services.users.signOut();
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const navigationItems = [
        {icon: IconDashboard, label: 'Dashboard', href: '/dashboard'},
        {icon: IconReceipt2, label: 'Transactions', href: '/transactions'},
        {icon: IconWallet, label: 'Accounts', href: '/accounts'},
        {icon: IconTags, label: 'Categories', href: '/categories'},
    ];

    const quickActions = [
        {icon: IconArrowUp, label: 'Income', color: 'teal'},
        {icon: IconArrowDown, label: 'Expense', color: 'red'},
        {icon: IconArrowsRightLeft, label: 'Transfer', color: 'blue'},
    ];

    return (
        <AppShell
            header={{height: 60}}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: {mobile: !opened},
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger
                            opened={opened}
                            onClick={() => setOpened(!opened)}
                            hiddenFrom="sm"
                            size="sm"
                        />
                        <Text size="lg" fw={700}>Money Manager</Text>
                    </Group>

                    <Group>
                        <ActionIcon
                            variant="default"
                            onClick={() => toggleColorScheme()}
                            size="lg"
                            radius="md"
                        >
                            {colorScheme === 'dark' ? (
                                <IconSun size={18}/>
                            ) : (
                                <IconMoon size={18}/>
                            )}
                        </ActionIcon>

                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="default" size="lg" radius="md">
                                    <IconUser size={18}/>
                                </ActionIcon>
                            </Menu.Target>

                            <Menu.Dropdown>
                                <Menu.Item
                                    leftSection={<IconUserCircle style={{width: rem(14), height: rem(14)}}/>}
                                    onClick={() => setProfileOpened(true)}
                                >
                                    Profile
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<IconLogout style={{width: rem(14), height: rem(14)}}/>}
                                    onClick={handleLogout}
                                    color="red"
                                >
                                    Logout
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <Stack gap="sm">
                    {navigationItems.map((item) => (
                        <NavLink
                            key={item.href}
                            component={Link}
                            href={item.href}
                            label={item.label}
                            leftSection={<item.icon size={20}/>}
                            rightSection={<IconChevronRight size={14}/>}
                            active={pathname === item.href}
                        />
                    ))}
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                {children}
                <UserProfile
                    opened={profileOpened}
                    onCloseAction={async () => {
                        setProfileOpened(false);
                        return Promise.resolve();
                    }}
                />
            </AppShell.Main>
        </AppShell>
    );
}