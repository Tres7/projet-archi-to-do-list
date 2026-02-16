import { jest, beforeEach, expect, test, describe } from '@jest/globals';

const { TodoRouter } = (await import('../../src/routes/todoRouter')) as any;
const { Todo } = (await import('../../src/domain/entities/Todo')) as any;

function makeRes() {
    const res: any = {};
    res.statusCode = 200;

    res.status = jest.fn((code: number) => {
        res.statusCode = code;
        return res;
    });

    res.send = jest.fn((payload: any) => {
        res.body = payload;
        return res;
    });

    res.sendStatus = jest.fn((code: number) => {
        res.statusCode = code;
        return res;
    });

    return res;
}

describe('TodoRouter', () => {
    let service: any;
    let router: any;

    beforeEach(() => {
        jest.clearAllMocks();

        service = {
            getAllTodos: jest.fn(),
            createTodo: jest.fn(),
            updateTodo: jest.fn(),
            deleteTodo: jest.fn(),
        };

        router = new TodoRouter(service);
    });

    test('getRouter: returns express router instance', () => {
        const r = router.getRouter();
        expect(r).toBeDefined();
        expect(typeof r.use).toBe('function');
        expect(Array.isArray(r.stack)).toBe(true);
        expect(r.stack.length).toBeGreaterThanOrEqual(4);
    });

    test('getTodos: sends items', async () => {
        const items = [new Todo('1', 'Todo 1', false)];
        service.getAllTodos.mockResolvedValue(items);

        const req: any = {};
        const res = makeRes();
        const next = jest.fn();

        await router.getTodos(req, res, next);

        expect(service.getAllTodos).toHaveBeenCalledTimes(1);
        expect(res.send).toHaveBeenCalledWith(items);
        expect(next).not.toHaveBeenCalled();
    });

    test('getTodos: calls next on error', async () => {
        const err = new Error();
        service.getAllTodos.mockRejectedValue(err);

        const res = makeRes();
        const next = jest.fn();

        await router.getTodos({} as any, res as any, next as any);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(err);
        expect(res.send).not.toHaveBeenCalled();
    });

    test('addTodo: validates name and returns 400', async () => {
        const req: any = { body: { name: '   ' } };
        const res = makeRes();
        const next = jest.fn();

        await router.addTodo(req, res, next);

        expect(service.createTodo).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: 'name is required' });
        expect(next).not.toHaveBeenCalled();
    });

    test('addTodo: creates todo and sends it', async () => {
        const created = new Todo('x', 'A sample item', false);
        service.createTodo.mockResolvedValue(created);

        const req: any = { body: { name: 'A sample item' } };
        const res = makeRes();
        const next = jest.fn();

        await router.addTodo(req, res, next);

        expect(service.createTodo).toHaveBeenCalledWith('A sample item');
        expect(res.send).toHaveBeenCalledWith(created);
        expect(next).not.toHaveBeenCalled();
    });

    test('addTodo: calls next on error', async () => {
        const err = new Error();
        service.createTodo.mockRejectedValue(err);

        const req: any = { body: { name: 'Valid' } };
        const res = makeRes();
        const next = jest.fn();

        await router.addTodo(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(err);
        expect(res.send).not.toHaveBeenCalled();
    });

    test('updateTodo: validates name and returns 400', async () => {
        const req: any = {
            params: { id: '1234' },
            body: { name: '   ', completed: false },
        };
        const res = makeRes();
        const next = jest.fn();

        await router.updateTodo(req, res, next);

        expect(service.updateTodo).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: 'name is required' });
        expect(next).not.toHaveBeenCalled();
    });

    test('updateTodo: calls service and sends result', async () => {
        const updated = new Todo('1234', 'New title', false);
        service.updateTodo.mockResolvedValue(updated);

        const req: any = {
            params: { id: '1234' },
            body: { name: 'New title', completed: false },
        };
        const res = makeRes();
        const next = jest.fn();

        await router.updateTodo(req, res, next);

        expect(service.updateTodo).toHaveBeenCalledWith(
            '1234',
            'New title',
            false,
        );
        expect(res.send).toHaveBeenCalledWith(updated);
        expect(next).not.toHaveBeenCalled();
    });

    test('updateTodo: calls next on error', async () => {
        const err = new Error();
        service.updateTodo.mockRejectedValue(err);

        const req: any = {
            params: { id: '1234' },
            body: { name: 'Ok', completed: true },
        };
        const res = makeRes();
        const next = jest.fn();

        await router.updateTodo(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(err);
        expect(res.send).not.toHaveBeenCalled();
    });

    test('deleteTodo: calls service and sends 200', async () => {
        service.deleteTodo.mockResolvedValue(undefined);

        const req: any = { params: { id: '12345' } };
        const res = makeRes();
        const next = jest.fn();

        await router.deleteTodo(req, res, next);

        expect(service.deleteTodo).toHaveBeenCalledWith('12345');
        expect(res.sendStatus).toHaveBeenCalledWith(200);
        expect(next).not.toHaveBeenCalled();
    });

    test('deleteTodo: calls next on error', async () => {
        const err = new Error();
        service.deleteTodo.mockRejectedValue(err);

        const req: any = { params: { id: '12345' } };
        const res = makeRes();
        const next = jest.fn();

        await router.deleteTodo(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(err);
        expect(res.sendStatus).not.toHaveBeenCalled();
    });
});
