export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public httpStatus: number = 500
    ) {
        super(message);
    }
}

export const ErrorCodes = {
    // Auth errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

    // Account errors
    ACCOUNT_EXISTS: 'ACCOUNT_EXISTS',
    ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',

    // Transaction errors
    INVALID_AMOUNT: 'INVALID_AMOUNT',
    TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',

    // General errors
    INVALID_INPUT: 'INVALID_INPUT',
    UNAUTHORIZED: 'UNAUTHORIZED'
} as const;