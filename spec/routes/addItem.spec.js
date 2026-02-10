import { jest } from '@jest/globals';

const ITEM = { id: 12345 };

jest.unstable_mockModule('uuid', () => ({ v4: jest.fn() }));

jest.unstable_mockModule('../../src/persistence/index.js', () => ({
    default: {
        removeItem: jest.fn(),
        storeItem: jest.fn(),
        getItem: jest.fn(),
    },
}));

const { v4: uuid } = await import('uuid');
const { default: db } = await import('../../src/persistence/index.js');
const { default: addItem } = await import('../../src/routes/addItem.js');

test('it stores item correctly', async () => {
    const id = 'something-not-a-uuid';
    const name = 'A sample item';
    const req = { body: { name } };
    const res = { send: jest.fn() };

    uuid.mockReturnValue(id);

    await addItem(req, res);

    const expectedItem = { id, name, completed: false };

    expect(db.storeItem.mock.calls.length).toBe(1);
    expect(db.storeItem.mock.calls[0][0]).toEqual(expectedItem);
    expect(res.send.mock.calls[0].length).toBe(1);
    expect(res.send.mock.calls[0][0]).toEqual(expectedItem);
});
