import {forwardRef, useEffect, useState} from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    ColorInput,
    Group,
    MantineTheme,
    Modal,
    Paper,
    SegmentedControl,
    Select,
    Stack,
    Text,
    TextInput
} from '@mantine/core';
import * as TablerIcons from '@tabler/icons-react';
import {IconAlertCircle, IconCheck, IconEdit, IconPlus, IconTrash, IconX} from '@tabler/icons-react';
import {services} from '@/lib/services';
import {CreateCategoryDTO, TransactionCategory} from '@/types/transactions';
import {AppError} from '@/lib/errors';
import {useAuth} from '@/lib/hooks/useAuth';
import {notifications} from "@mantine/notifications";
import {getIconComponent} from "@/utils/iconUtils";

export default function CategoryManager() {
    const {user} = useAuth();
    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [error, setError] = useState<string>('');
    const [selectedType, setSelectedType] = useState<TransactionCategory['type']>('EXPENSE');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<CreateCategoryDTO>({
        name: '',
        type: 'EXPENSE',
        icon: 'tags',
        color: '#868e96'
    });

    const [iconSearchTerm, setIconSearchTerm] = useState('');

    const [filteredIcons, setFilteredIcons] = useState<{ value: string; label: string; }[]>([]);

    interface SelectItemProps extends React.ComponentPropsWithoutRef<'div'> {
        label: string;
        value: string;
    }

    const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
        ({label, value, ...others}: SelectItemProps, ref) => {
            const pascalCase = value
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('');

            const iconKey = `Icon${pascalCase}` as keyof typeof TablerIcons;
            const Icon = TablerIcons[iconKey] as React.ComponentType<{ size: number }>;

            return (
                <div ref={ref} {...others}>
                    <Group gap="xs">
                        {Icon && <Icon size={14}/>}
                        <span>{label}</span>
                    </Group>
                </div>
            );
        }
    );


    SelectItem.displayName = 'SelectItem';

    const searchIcons = (term: string) => {
        if (term.length < 2) {
            setFilteredIcons([]);
            return;
        }

        const searchTerm = term.toLowerCase();
        const results = Object.keys(TablerIcons)
            .filter(key => key.startsWith('Icon') &&
                (key.toLowerCase().includes(searchTerm) ||
                    key.replace(/([A-Z])/g, ' $1').trim().toLowerCase().includes(searchTerm))
            )
            .slice(0, 20)
            .map(key => {
                const kebabCase = key
                    .replace('Icon', '')
                    .replace(/([A-Z])/g, '-$1')
                    .toLowerCase()
                    .replace(/^-/, '');

                return {
                    value: kebabCase,
                    label: key.replace('Icon', '').replace(/([A-Z])/g, ' $1').trim(),
                };
            });

        setFilteredIcons(results);
    };

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            searchIcons(iconSearchTerm);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [iconSearchTerm]);

    const loadCategories = async () => {
        try {
            const data = await services.categories.getCategoriesByType(selectedType);
            setCategories(data);
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
            }
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                await services.categories.initializeDefaultCategories();
                await loadCategories();
            } catch (error) {
                if (error instanceof AppError) {
                    setError(error.message);
                }
            } finally {
                setInitializing(false);
            }
        };

        init();
    }, []);

    useEffect(() => {
        if (!initializing) {
            loadCategories();
        }
    }, [selectedType, initializing]);

    const handleCreateCategory = async () => {
        try {
            if (!user) return;
            await services.categories.createCategory({
                ...formData,
                type: selectedType
            }, user.uid);
            await loadCategories();
            notifications.show({
                title: 'Success',
                message: 'Category created successfully',
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
                    message: 'Failed to create category',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        }
    };

    const handleUpdateCategory = async () => {
        try {
            if (!selectedCategory || !user) return;

            await services.categories.updateCategory(
                selectedCategory.id,
                {
                    name: formData.name,
                    icon: formData.icon,
                    color: formData.color
                },
                user.uid
            );

            await loadCategories();
            notifications.show({
                title: 'Success',
                message: 'Category modified successfully',
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
                    message: 'Failed to modify category',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        }
    };

    const handleDeleteClick = async (category: TransactionCategory) => {
        if (!user) return;

        const confirmed = window.confirm('Are you sure you want to delete this category?');
        if (!confirmed) return;

        try {
            await services.categories.deleteCategory(category.id, user.uid);
            await loadCategories();
            notifications.show({
                title: 'Success',
                message: 'Category deleted successfully',
                color: 'LightSeaGreen',
                icon: <IconCheck size={16}/>,
                autoClose: 3000,
            });
        } catch (error) {
            if (error instanceof AppError) {
                setError(error.message);
                notifications.show({
                    title: 'Error',
                    message: 'Failed to delete category',
                    color: 'LightSalmon',
                    icon: <IconX size={16}/>,
                    autoClose: 3000,
                });
            }
        }
    };

    const handleEditClick = (category: TransactionCategory) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            type: category.type,
            icon: category.icon,
            color: category.color || '#868e96'
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'EXPENSE',
            icon: 'tags',
            color: '#868e96'
        });
        setSelectedCategory(null);
        setIsEditing(false);
        setError('');
    };

    const getCategoryColor = (type: TransactionCategory['type']) => {
        switch (type) {
            case 'EXPENSE':
                return 'red';
            case 'INCOME':
                return 'green';
            case 'SELFTRANSFER':
                return 'blue';
            default:
                return 'gray';
        }
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

            <Group justify="space-between" align="center">
                <Text size="lg" fw={500}>Categories</Text>
                <Group>
                    <SegmentedControl
                        value={selectedType}
                        onChange={(value) => setSelectedType(value as TransactionCategory['type'])}
                        data={[
                            {label: 'Expenses', value: 'EXPENSE'},
                            {label: 'Income', value: 'INCOME'},
                            {label: 'Transfers', value: 'SELFTRANSFER'}
                        ]}
                    />
                    <Button
                        leftSection={<IconPlus size={16}/>}
                        onClick={() => {
                            setIsEditing(false);
                            setIsModalOpen(true);
                        }}
                        variant="light"
                    >
                        Add Category
                    </Button>
                </Group>
            </Group>

            <Stack gap="sm">
                {categories.map((category) => (
                    <Paper key={category.id} withBorder p="md" radius="md">
                        <Group justify="space-between" align="center">
                            <Group gap="sm">
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        backgroundColor: category.color || '#868e96',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff'
                                    }}
                                >
                                    {getIconComponent(category.icon)}
                                </div>
                                <div>
                                    <Text fw={500}>{category.name}</Text>
                                    {category.isCustom && (
                                        <Text size="xs" c="dimmed">Custom Category</Text>
                                    )}
                                </div>
                            </Group>
                            <Group>
                                {category.isCustom && category.userId === user?.uid && (
                                    <Group gap="xs">
                                        <ActionIcon
                                            variant="light"
                                            color="blue"
                                            onClick={() => handleEditClick(category)}
                                            size="md"
                                        >
                                            <IconEdit size={18}/>
                                        </ActionIcon>
                                        <ActionIcon
                                            variant="light"
                                            color="red"
                                            onClick={() => handleDeleteClick(category)}
                                            size="md"
                                        >
                                            <IconTrash size={18}/>
                                        </ActionIcon>
                                    </Group>
                                )}
                                <Badge color={getCategoryColor(category.type)}>
                                    {category.type}
                                </Badge>
                            </Group>
                        </Group>
                    </Paper>
                ))}

                {categories.length === 0 && (
                    <Text c="dimmed" ta="center" py="xl">
                        No categories found for {selectedType.toLowerCase()} transactions.
                    </Text>
                )}
            </Stack>

            <Modal
                opened={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                title={isEditing ? "Edit Category" : "Create New Category"}
            >
                <Stack gap="md">
                    <TextInput
                        label="Category Name"
                        placeholder="Enter category name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                    />

                    <Select
                        label="Icon"
                        placeholder="Search for an icon"
                        data={filteredIcons}
                        value={formData.icon}
                        onChange={(value) => value && setFormData({...formData, icon: value})}
                        searchable
                        searchValue={iconSearchTerm}
                        onSearchChange={setIconSearchTerm}
                        withAsterisk
                        maxDropdownHeight={400}
                        styles={(theme: MantineTheme) => ({
                            input: {
                                whiteSpace: 'nowrap'
                            }
                        })}
                        comboboxProps={{withinPortal: true}}
                        renderOption={({option}) => (
                            <Group gap="xs">
                                {getIconComponent(option.value)}
                                <span>{option.label}</span>
                            </Group>
                        )}
                    />

                    <ColorInput
                        label="Color"
                        placeholder="Choose color"
                        value={formData.color || ''}
                        onChange={(color) => setFormData({...formData, color})}
                        format="hex"
                        swatches={[
                            '#25262b', '#868e96', '#fa5252', '#e64980', '#be4bdb',
                            '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886',
                            '#40c057', '#82c91e', '#fab005', '#fd7e14'
                        ]}
                    />

                    <Button
                        onClick={isEditing ? handleUpdateCategory : handleCreateCategory}
                        fullWidth
                    >
                        {isEditing ? "Update Category" : "Create Category"}
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
}