import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/persistence/index', () => ({
    default: {
        getItem: jest.fn(),
        updateItem: jest.fn(),
    },
}));

const { default: db } = (await import('../../src/persistence/index')) as any;
const { default: updateItem } =
    (await import('../../src/routes/updateItem')) as any;

const ITEM = { id: 12345 };

test('it updates items correctly', async () => {
    const req = {
        params: { id: 1234 },
        body: { name: 'New title', completed: false },
    };
    const res = { send: jest.fn() };

    db.getItem.mockReturnValue(Promise.resolve(ITEM));

    await updateItem(req, res);

    expect(db.updateItem.mock.calls.length).toBe(1);
    expect(db.updateItem.mock.calls[0][0]).toBe(req.params.id);
    expect(db.updateItem.mock.calls[0][1]).toEqual({
        name: 'New title',
        completed: false,
    });

    expect(db.getItem.mock.calls.length).toBe(1);
    expect(db.getItem.mock.calls[0][0]).toBe(req.params.id);

    expect(res.send.mock.calls[0].length).toBe(1);
    expect(res.send.mock.calls[0][0]).toEqual(ITEM);
});
