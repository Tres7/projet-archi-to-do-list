export interface IDatabaseConnection {
    init(): Promise<void>;
    teardown(): Promise<void>;
}
