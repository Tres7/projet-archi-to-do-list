export type TodoItem = {
    id: string;
    name: string;
    completed: boolean;
};

export type CreateItemBody = {
    name: string;
};

export type UpdateItemBody = {
    name?: string;
    completed?: boolean;
};
