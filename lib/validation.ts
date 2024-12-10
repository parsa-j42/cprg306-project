import {AppError, ErrorCodes} from './errors';
import {CreateAccountDTO} from '@/types/accounts';
import {CreateTransactionDTO} from '@/types/transactions';

export class ValidationService {
    validateAccount(data: CreateAccountDTO) {
        if (!data.name || data.name.trim().length === 0) {
            throw new AppError('Account name is required', ErrorCodes.INVALID_INPUT, 400);
        }
        if (!data.color || data.color.trim().length === 0) {
            throw new AppError('Account color is required', ErrorCodes.INVALID_INPUT, 400);
        }
    }

    validateTransaction(data: CreateTransactionDTO) {
        // Check required string fields
        if (!data.accountId || typeof data.accountId !== 'string') {
            throw new AppError('Account ID is required and must be a string', ErrorCodes.INVALID_INPUT, 400);
        }
        if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
            throw new AppError('Description is required and must be a non-empty string', ErrorCodes.INVALID_INPUT, 400);
        }
        if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
            throw new AppError('Category is required and must be a non-empty string', ErrorCodes.INVALID_INPUT, 400);
        }

        // Check amount
        if (typeof data.amount !== 'number' || data.amount <= 0) {
            throw new AppError('Amount must be a positive number', ErrorCodes.INVALID_AMOUNT, 400);
        }

        // Check transaction type
        if (!data.type || !['POSITIVE', 'NEGATIVE'].includes(data.type)) {
            throw new AppError('Transaction type must be either POSITIVE or NEGATIVE', ErrorCodes.INVALID_INPUT, 400);
        }

        // Check optional fields if present
        // Only validate partyName if it's a non-empty string (allow undefined, null, or empty string)
        if (data.partyName && typeof data.partyName !== 'string') {
            throw new AppError('Party name must be a string if provided', ErrorCodes.INVALID_INPUT, 400);
        }

        // Only validate chainId if it's a non-empty string
        if (data.chainId && typeof data.chainId !== 'string') {
            throw new AppError('Chain ID must be a string if provided', ErrorCodes.INVALID_INPUT, 400);
        }

        // Check payback details if transaction requires payback
        if (data.requiresPayback && (!data.paybackDetails || !data.paybackDetails.dueDate)) {
            throw new AppError('Payback details with due date are required when requiresPayback is true', ErrorCodes.INVALID_INPUT, 400);
        }

        // make sure paybackDetails is structured correct
        if (data.paybackDetails) {
            if (!(data.paybackDetails.dueDate instanceof Date)) {
                throw new AppError('Payback due date must be a valid Date object', ErrorCodes.INVALID_INPUT, 400);
            }
        }
    }
}