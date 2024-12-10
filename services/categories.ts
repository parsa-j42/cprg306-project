import {db} from '@/lib/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {CreateCategoryDTO, TransactionCategory} from '@/types/transactions';
import {AppError, ErrorCodes} from '@/lib/errors';

export class CategoryService {
    private collection = 'categories';

    private defaultCategories: TransactionCategory[] = [
        // pre defined expense categories
        {id: 'default-food', name: 'Food & Dining', type: 'EXPENSE', icon: 'bowl', color: '#FF6B6B', isCustom: false},
        {
            id: 'default-transport',
            name: 'Transportation',
            type: 'EXPENSE',
            icon: 'car',
            color: '#4DABF7',
            isCustom: false
        },
        {
            id: 'default-shopping',
            name: 'Shopping',
            type: 'EXPENSE',
            icon: 'shopping-cart',
            color: '#FF922B',
            isCustom: false
        },
        {
            id: 'default-bills',
            name: 'Bills & Utilities',
            type: 'EXPENSE',
            icon: 'receipt',
            color: '#20C997',
            isCustom: false
        },
        {
            id: 'default-entertainment',
            name: 'Entertainment',
            type: 'EXPENSE',
            icon: 'movie',
            color: '#845EF7',
            isCustom: false
        },
        {
            id: 'default-healthcare',
            name: 'Healthcare',
            type: 'EXPENSE',
            icon: 'heart',
            color: '#F06595',
            isCustom: false
        },
        {id: 'default-home', name: 'Home', type: 'EXPENSE', icon: 'home', color: '#339AF0', isCustom: false},
        {
            id: 'default-education',
            name: 'Education',
            type: 'EXPENSE',
            icon: 'school',
            color: '#FF922B',
            isCustom: false
        },

        // pre defined income categories
        {id: 'default-salary', name: 'Salary', type: 'INCOME', icon: 'wallet', color: '#51CF66', isCustom: false},
        {
            id: 'default-investments',
            name: 'Investments',
            type: 'INCOME',
            icon: 'chart-bar',
            color: '#339AF0',
            isCustom: false
        },
        {
            id: 'default-freelance',
            name: 'Freelance',
            type: 'INCOME',
            icon: 'briefcase',
            color: '#FF922B',
            isCustom: false
        },
        {id: 'default-gifts', name: 'Gifts', type: 'INCOME', icon: 'gift', color: '#BE4BDB', isCustom: false},

        // pre defined transfer categories
        {
            id: 'default-transfer',
            name: 'Account Transfer',
            type: 'SELFTRANSFER',
            icon: 'arrows-right-left',
            color: '#4C6EF5',
            isCustom: false
        }
    ];

    async initializeDefaultCategories(): Promise<void> {
        return Promise.resolve();
    }

    async getCategories(): Promise<TransactionCategory[]> {
        try {
            const categoriesRef = collection(db, this.collection);
            const snapshot = await getDocs(categoriesRef);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TransactionCategory[];
        } catch (error) {
            throw new AppError(
                'Failed to fetch categories',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async getCategoriesByType(type: TransactionCategory['type']): Promise<TransactionCategory[]> {
        if (!type) {
            throw new AppError(
                'Category type is required',
                ErrorCodes.INVALID_INPUT,
                400
            );
        }

        try {
            // get custom categories
            const categoriesRef = collection(db, this.collection);
            const q = query(
                categoriesRef,
                where('type', '==', type)
            );

            const snapshot = await getDocs(q);
            const customCategories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TransactionCategory[];

            // combine default and custom categories
            const defaultCategoriesOfType = this.defaultCategories.filter(cat => cat.type === type);
            const allCategories = [...defaultCategoriesOfType, ...customCategories];

            // sort with default categories first, then by name
            return allCategories.sort((a, b) => {
                if (a.isCustom === b.isCustom) {
                    return a.name.localeCompare(b.name);
                }
                return a.isCustom ? 1 : -1;
            });
        } catch (error) {
            throw new AppError(
                'Failed to fetch categories',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async createCategory(data: CreateCategoryDTO, userId: string): Promise<TransactionCategory> {
        try {
            const categoriesRef = collection(db, this.collection);

            // check for duplicates
            const existingCategories = await this.getCategoriesByType(data.type);
            const isDuplicate = existingCategories.some(cat =>
                cat.name.toLowerCase() === data.name.toLowerCase()
            );

            if (isDuplicate) {
                throw new AppError(
                    'A category with this name already exists for this type',
                    ErrorCodes.INVALID_INPUT,
                    400
                );
            }

            const newCategory = {
                ...data,
                isCustom: true,
                userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(categoriesRef, newCategory);
            const createdDoc = await getDoc(docRef);

            if (!createdDoc.exists()) {
                throw new AppError(
                    'Failed to create category',
                    ErrorCodes.INVALID_INPUT,
                    500
                );
            }

            return {
                id: docRef.id,
                ...createdDoc.data()
            } as TransactionCategory;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                'Failed to create category',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async updateCategory(categoryId: string, data: Partial<CreateCategoryDTO>, userId: string): Promise<void> {
        try {
            const categoryRef = doc(db, this.collection, categoryId);
            const categoryDoc = await getDoc(categoryRef);

            if (!categoryDoc.exists()) {
                throw new AppError('Category not found', ErrorCodes.INVALID_INPUT, 404);
            }

            const categoryData = categoryDoc.data();
            if (!categoryData.isCustom || categoryData.userId !== userId) {
                throw new AppError('Not authorized to update this category', ErrorCodes.UNAUTHORIZED, 403);
            }

            await updateDoc(categoryRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to update category', ErrorCodes.INVALID_INPUT, 500);
        }
    }

    async deleteCategory(categoryId: string, userId: string): Promise<void> {
        try {
            const categoryRef = doc(db, this.collection, categoryId);
            const categoryDoc = await getDoc(categoryRef);

            if (!categoryDoc.exists()) {
                throw new AppError('Category not found', ErrorCodes.INVALID_INPUT, 404);
            }

            const categoryData = categoryDoc.data();
            if (!categoryData.isCustom || categoryData.userId !== userId) {
                throw new AppError('Not authorized to delete this category', ErrorCodes.UNAUTHORIZED, 403);
            }

            await deleteDoc(categoryRef);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to delete category', ErrorCodes.INVALID_INPUT, 500);
        }
    }
}