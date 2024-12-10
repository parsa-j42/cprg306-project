import {Timestamp} from 'firebase/firestore';

export interface AccountDTO {
    id: string;
    name: string;
    color: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isArchived: boolean;
    userId: string;
}

export interface TransactionDTO {
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
        dueDate: Timestamp;
        status: 'PENDING' | 'PAID';
        completedAt: Timestamp | null;
    } | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}