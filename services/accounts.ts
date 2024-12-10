import {AppError, ErrorCodes} from '@/lib/errors';
import {ValidationService} from '@/lib/validation';
import {Account, CreateAccountDTO, UpdateAccountDTO} from '@/types/accounts';
import {AccountDTO} from "@/types/models";
import {db} from '@/lib/firebase';
import {addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where} from 'firebase/firestore';
import {services} from "@/lib/services";

export class AccountService {
    private collection = 'accounts';
    private validator = new ValidationService();

    async createAccount(userId: string, data: CreateAccountDTO): Promise<Account> {
        // validate input
        this.validator.validateAccount(data);

        const accountsRef = collection(db, this.collection);

        // check for duplicate name
        const duplicateQuery = query(
            accountsRef,
            where('userId', '==', userId),
            where('name', '==', data.name),
            where('isArchived', '==', false)
        );

        const duplicates = await getDocs(duplicateQuery);
        if (!duplicates.empty) {
            throw new AppError(
                'An account with this name already exists',
                ErrorCodes.ACCOUNT_EXISTS,
                400
            );
        }

        const newAccount = {
            ...data,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isArchived: false
        };

        const docRef = await addDoc(accountsRef, newAccount);
        const createdDoc = await getDoc(docRef);

        if (!createdDoc.exists()) {
            throw new AppError(
                'Failed to create account',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }

        return this.convertToAccount({
            id: docRef.id,
            ...createdDoc.data()
        } as AccountDTO);
    }

    async updateAccount(accountId: string, data: UpdateAccountDTO): Promise<void> {
        try {
            const accountRef = doc(db, this.collection, accountId);
            const accountDoc = await getDoc(accountRef);

            if (!accountDoc.exists()) {
                throw new AppError(
                    'Account not found',
                    ErrorCodes.ACCOUNT_NOT_FOUND,
                    404
                );
            }

            await updateDoc(accountRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                'Failed to update account',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async getAccountsByUser(userId: string): Promise<Account[]> {
        const accountsRef = collection(db, this.collection);
        const q = query(
            accountsRef,
            where('userId', '==', userId),
            where('isArchived', '==', false)
        );

        const snapshot = await getDocs(q);
        const accounts = snapshot.docs.map(doc =>
            this.convertToAccount({
                id: doc.id,
                ...doc.data()
            } as AccountDTO)
        );

        // calc balance for each account
        for (const account of accounts) {
            const transactions = await services.transactions.getTransactionsByAccount(account.id);
            account.balance = transactions.reduce((sum, transaction) => {
                if (transaction.type === 'POSITIVE') {
                    return sum + transaction.amount;
                } else {
                    return sum - transaction.amount;
                }
            }, 0);
        }

        return accounts;
    }

    async deleteAccount(accountId: string, userId: string): Promise<void> {
        try {
            const accountRef = doc(db, this.collection, accountId);
            const accountDoc = await getDoc(accountRef);

            if (!accountDoc.exists()) {
                throw new AppError(
                    'Account not found',
                    ErrorCodes.ACCOUNT_NOT_FOUND,
                    404
                );
            }

            const accountData = accountDoc.data();
            if (accountData.userId !== userId) {
                throw new AppError(
                    'Not authorized to delete this account',
                    ErrorCodes.UNAUTHORIZED,
                    403
                );
            }

            // we archive instead of actually deleting
            await updateDoc(accountRef, {
                isArchived: true,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                'Failed to delete account',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    private convertToAccount(dto: AccountDTO): Account {
        return {
            ...dto,
            createdAt: dto.createdAt.toDate(),
            updatedAt: dto.updatedAt.toDate(),
            balance: 0
        };
    }
}