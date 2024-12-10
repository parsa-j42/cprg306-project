import {services} from '@/lib/services';
import {AppError, ErrorCodes} from '@/lib/errors';

export class StatsService {
    async getSpendingByCategory(userId: string, startDate: Date, endDate: Date): Promise<Record<string, number>> {
        try {
            const accounts = await services.accounts.getAccountsByUser(userId);
            const categorySpending: Record<string, number> = {};

            for (const account of accounts) {
                const transactions = await services.transactions.getTransactionsByAccount(
                    account.id,
                    startDate,
                    endDate
                );

                for (const transaction of transactions) {
                    if (transaction.type === 'NEGATIVE' && transaction.category !== 'TRANSFER') {
                        categorySpending[transaction.category] = (categorySpending[transaction.category] || 0) + transaction.amount;
                    }
                }
            }

            return categorySpending;
        } catch (error) {
            throw new AppError(
                'Failed to calculate category spending',
                ErrorCodes.INVALID_INPUT,
                500
            );
        }
    }
}