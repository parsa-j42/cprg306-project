import {AccountService} from '@/services/accounts';
import {TransactionService} from '@/services/transactions';
import {UserService} from '@/services/user';
import {CategoryService} from '@/services/categories';
import {StatsService} from "@/services/stats";

export class ServiceContainer {
    private static instance: ServiceContainer;

    private constructor(
        public readonly accounts: AccountService,
        public readonly transactions: TransactionService,
        public readonly users: UserService,
        public readonly categories: CategoryService,
        public readonly stats: StatsService
    ) {
    }

    // get the single instance
    static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer(
                new AccountService(),
                new TransactionService(),
                new UserService(),
                new CategoryService(),
                new StatsService()
            );
        }
        return ServiceContainer.instance;
    }
}

export const services = ServiceContainer.getInstance();

