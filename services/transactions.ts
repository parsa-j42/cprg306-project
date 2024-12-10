import {auth, db} from '@/lib/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    QueryConstraint,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    ChainedTransactions,
    CreateTransactionDTO,
    Transaction,
    TransactionFilters,
    UpdateTransactionDTO
} from '@/types/transactions';
import {TransactionDTO} from "@/types/models";
import {AppError, ErrorCodes} from '@/lib/errors';
import {ValidationService} from '@/lib/validation';

export class TransactionService {
    private collection = 'transactions';
    private chainedCollection = 'chainedTransactions';
    private validator = new ValidationService();

    async createTransaction(userId: string, data: CreateTransactionDTO): Promise<Transaction> {
        try {
            this.validator.validateTransaction(data);

            const transactionsRef = collection(db, this.collection);
            const newTransaction = this.prepareTransactionData(userId, data);

            const docRef = await addDoc(transactionsRef, newTransaction);
            const createdDoc = await getDoc(docRef);

            if (!createdDoc.exists()) {
                throw new AppError(
                    'Failed to create transaction',
                    ErrorCodes.INVALID_INPUT,
                    500
                );
            }

            return this.convertToTransaction({
                id: docRef.id,
                ...createdDoc.data()
            } as TransactionDTO);
        } catch (error) {
            console.error('Transaction creation error:', error);
            if (error instanceof AppError) throw error;
            throw new AppError(
                'Failed to create transaction',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async createChainedTransactions(
        userId: string,
        transactions: CreateTransactionDTO[]
    ): Promise<ChainedTransactions> {
        if (!transactions.length) {
            throw new AppError(
                'No transactions provided',
                ErrorCodes.INVALID_INPUT,
                400
            );
        }

        const chainId = crypto.randomUUID();
        const createdTransactions: Transaction[] = [];

        try {
            // create all the transactions with the same chainId
            for (const transaction of transactions) {
                const newTransaction = await this.createTransaction(userId, {
                    ...transaction,
                    chainId
                });
                createdTransactions.push(newTransaction);
            }

            // create chain record
            const chainedRef = collection(db, this.chainedCollection);
            const chainRecord = {
                chainId,
                userId,
                transactionIds: createdTransactions.map(t => t.id),
                createdAt: serverTimestamp(),
                status: 'COMPLETED'
            };

            await addDoc(chainedRef, chainRecord);

            return {
                ...chainRecord,
                createdAt: new Date(),
                status: 'COMPLETED',
                userId
            };
        } catch (error) {
            throw new AppError(
                'Failed to create chained transactions',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async updateTransaction(
        transactionId: string,
        data: UpdateTransactionDTO,
        userId: string
    ): Promise<void> {
        const transactionRef = doc(db, this.collection, transactionId);

        try {
            const docSnap = await getDoc(transactionRef);
            if (!docSnap.exists()) {
                throw new AppError(
                    'Transaction not found',
                    ErrorCodes.TRANSACTION_NOT_FOUND,
                    404
                );
            }

            const transaction = docSnap.data();
            if (transaction.userId !== userId) {
                throw new AppError(
                    'Not authorized to update this transaction',
                    ErrorCodes.UNAUTHORIZED,
                    403
                );
            }

            const updateData = this.prepareUpdateData(data);

            if (transaction.category === 'TRANSFER') {
                const {type, category, amount, ...allowedUpdates} = updateData;
                await updateDoc(transactionRef, allowedUpdates);
            } else {
                await updateDoc(transactionRef, updateData);
            }
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                'Failed to update transaction',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async deleteTransaction(transactionId: string, userId: string): Promise<void> {
        try {
            const transactionRef = doc(db, this.collection, transactionId);
            const docSnap = await getDoc(transactionRef);

            if (!docSnap.exists()) {
                throw new AppError(
                    'Transaction not found',
                    ErrorCodes.TRANSACTION_NOT_FOUND,
                    404
                );
            }

            const transaction = docSnap.data();
            if (transaction.userId !== userId) {
                throw new AppError(
                    'Not authorized to delete this transaction',
                    ErrorCodes.UNAUTHORIZED,
                    403
                );
            }

            // If it's part of a chain, delete all related transactions
            if (transaction.chainId) {
                // Get all transactions in the chain
                const transactionsRef = collection(db, this.collection);
                const chainQuery = query(transactionsRef, where('chainId', '==', transaction.chainId));
                const chainedTransactionsSnap = await getDocs(chainQuery);

                // Delete all transactions in the chain
                const deletePromises = chainedTransactionsSnap.docs.map(doc =>
                    deleteDoc(doc.ref)
                );
                await Promise.all(deletePromises);

                // Delete the chain record
                const chainedRef = collection(db, this.chainedCollection);
                const chainRecordQuery = query(chainedRef, where('chainId', '==', transaction.chainId));
                const chainRecordSnap = await getDocs(chainRecordQuery);

                const chainDeletePromises = chainRecordSnap.docs.map(doc =>
                    deleteDoc(doc.ref)
                );
                await Promise.all(chainDeletePromises);
            } else {
                // Delete single transaction
                await deleteDoc(transactionRef);
            }
        } catch (error) {
            console.error('Error in deleteTransaction:', error);
            throw new AppError(
                'Failed to delete transaction',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async getTransactionsByAccount(
        accountId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<Transaction[]> {
        if (!accountId || !auth.currentUser) {
            throw new AppError(
                'Account ID and authentication required',
                ErrorCodes.INVALID_INPUT,
                400
            );
        }

        try {
            const constraints = this.getTransactionQueryConstraints({
                accountId,
                startDate,
                endDate
            });
            const transactionsRef = collection(db, this.collection);
            const q = query(transactionsRef, ...constraints);

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                return [];
            }

            const transactions = snapshot.docs.map(doc => {
                try {
                    const data = doc.data();

                    const converted = this.convertToTransaction({
                        id: doc.id,
                        ...data
                    } as TransactionDTO);

                    return converted;
                } catch (error) {
                    throw error;
                }
            });

            return transactions;
        } catch (error) {
            console.error('Error in getTransactionsByAccount:', error);
            if (error instanceof AppError) throw error;
            throw new AppError(
                'Failed to fetch transactions',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async getTransactionById(transactionId: string, userId: string): Promise<Transaction> {
        try {
            const transactionRef = doc(db, this.collection, transactionId);
            const docSnap = await getDoc(transactionRef);

            if (!docSnap.exists()) {
                throw new AppError(
                    'Transaction not found',
                    ErrorCodes.TRANSACTION_NOT_FOUND,
                    404
                );
            }

            const transaction = docSnap.data();
            if (transaction.userId !== userId) {
                throw new AppError(
                    'Not authorized to view this transaction',
                    ErrorCodes.UNAUTHORIZED,
                    403
                );
            }

            return this.convertToTransaction({
                id: docSnap.id,
                ...transaction
            } as TransactionDTO);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                'Failed to fetch transaction',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    async getChainedTransactions(chainId: string): Promise<Transaction[]> {
        if (!chainId) {
            throw new AppError(
                'Chain ID is required',
                ErrorCodes.INVALID_INPUT,
                400
            );
        }

        try {
            const transactionsRef = collection(db, this.collection);
            const q = query(transactionsRef, where('chainId', '==', chainId));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc =>
                this.convertToTransaction({
                    id: doc.id,
                    ...doc.data()
                } as TransactionDTO)
            );
        } catch (error) {
            throw new AppError(
                'Failed to fetch chained transactions',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }

    private convertToTransaction(dto: TransactionDTO): Transaction {
        try {
            const result = {
                ...dto,
                createdAt: dto.createdAt?.toDate() || new Date(),
                updatedAt: dto.updatedAt?.toDate() || new Date(),
                paybackDetails: dto.paybackDetails ? {
                    ...dto.paybackDetails,
                    dueDate: dto.paybackDetails.dueDate?.toDate() || new Date(),
                    completedAt: dto.paybackDetails.completedAt?.toDate() || null,
                    status: dto.paybackDetails.status
                } : null
            };
            return result;
        } catch (error) {
            console.error('Error in convertToTransaction:', error);
            throw error;
        }
    }

    private prepareTransactionData(userId: string, data: CreateTransactionDTO) {
        const paybackDetails = data.requiresPayback ? {
            dueDate: Timestamp.fromDate(data.paybackDetails?.dueDate || new Date()),
            status: 'PENDING' as const,
            completedAt: null
        } : null;

        return {
            accountId: data.accountId,
            amount: data.amount,
            type: data.type,
            category: data.category,
            description: data.description,
            userId: userId,
            requiresPayback: Boolean(data.requiresPayback),
            partyName: data.partyName || null,
            chainId: data.chainId || null,
            createdAt: data.transactionDate ?
                Timestamp.fromDate(data.transactionDate) :
                serverTimestamp(),
            updatedAt: serverTimestamp(),
            paybackDetails
        };
    }

    private prepareUpdateData(data: UpdateTransactionDTO) {
        const updateData: any = {
            ...data,
            updatedAt: serverTimestamp()
        };
        if ('paybackDetails' in data) {
            if (data.paybackDetails) {
                updateData.paybackDetails = {
                    dueDate: data.paybackDetails.dueDate ? Timestamp.fromDate(data.paybackDetails.dueDate) : null,
                    status: data.paybackDetails.status || 'PENDING',
                    completedAt: data.paybackDetails.completedAt ? Timestamp.fromDate(data.paybackDetails.completedAt) : null
                };
            } else {
                updateData.paybackDetails = null;
            }
        }

        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        return updateData;
    }

    private getTransactionQueryConstraints(filters: TransactionFilters): QueryConstraint[] {
        const constraints: QueryConstraint[] = [
            where('userId', '==', auth.currentUser?.uid),
            where('accountId', '==', filters.accountId)
        ];

        if (filters.startDate) {
            constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
        }

        if (filters.endDate) {
            constraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
        }

        constraints.push(orderBy('createdAt', 'desc'));

        return constraints;
    }
}