import {Card, Stack, Title} from '@mantine/core';
import CategoryManager from '@/components/categories/CategoryManager';

export default function CategoriesPage() {
    return (
        <Stack gap="lg">
            <Title order={2}>Categories</Title>

            <Card withBorder radius="md">
                <CategoryManager/>
            </Card>
        </Stack>
    );
}