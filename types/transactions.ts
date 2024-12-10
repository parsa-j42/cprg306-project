export interface Transaction {
    id: string;
    accountId: string;
    amount: number;
    type: 'POSITIVE' | 'NEGATIVE';
    category: string;
    description: string;
    userId: string;
    requiresPayback: boolean;
    partyName: string | null;
    chainId: string | null;
    paybackDetails: {
        dueDate: Date;
        status: 'PENDING' | 'PAID';
        completedAt: Date | null;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTransactionDTO {
    accountId: string;
    amount: number;
    type: 'POSITIVE' | 'NEGATIVE';
    category: string;
    description: string;
    partyName?: string;
    requiresPayback?: boolean;
    paybackDetails?: {
        dueDate: Date;
    };
    chainId?: string;
    transactionDate?: Date;
}

export interface UpdateTransactionDTO {
    amount?: number;
    type?: 'POSITIVE' | 'NEGATIVE';
    category?: string;
    description?: string;
    partyName?: string | null;
    requiresPayback?: boolean;
    paybackDetails?: {
        dueDate: Date;
        status: 'PENDING' | 'PAID';
        completedAt: Date | null;
    } | null;
}

export interface TransactionCategory {
    id: string;
    name: string;
    type: 'EXPENSE' | 'INCOME' | 'SELFTRANSFER';
    icon: string;
    color?: string;
    isCustom?: boolean;
    userId?: string;
}

export interface CreateCategoryDTO {
    name: string;
    type: TransactionCategory['type'];
    icon: string;
    color?: string;
}

export interface ChainedTransactions {
    chainId: string;
    transactionIds: string[];
    createdAt: Date;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    userId: string;
}

export interface TransactionFilters {
    startDate?: Date;
    endDate?: Date;
    type?: 'POSITIVE' | 'NEGATIVE' | 'TRANSFER';
    category?: string;
    accountId?: string;
    searchTerm?: string;
}