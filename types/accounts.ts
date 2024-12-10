export interface Account {
    id: string;
    name: string;
    color: string;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
    isArchived: boolean;
}

export interface CreateAccountDTO {
    name: string;
    color: string;
}

export interface UpdateAccountDTO {
    name?: string;
    color?: string;
}
