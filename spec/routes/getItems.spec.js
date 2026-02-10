import { jest } from '@jest/globals';

const ITEMS = [{ id: 12345 }];

jest.unstable_mockModule('../../src/persistence/index.js', () => ({
    default: {
        getItems: jest.fn()
    },
}));

const { default: db } = await import('../../src/persistence/index.js');
const { default: getItems } = await import('../../src/routes/getItems.js');

test('it gets items correctly', async () => {
    const req = {};
    const res = { send: jest.fn() };
    db.getItems.mockReturnValue(Promise.resolve(ITEMS));

    await getItems(req, res);

    expect(db.getItems.mock.calls.length).toBe(1);
    expect(res.send.mock.calls[0].length).toBe(1);
    expect(res.send.mock.calls[0][0]).toEqual(ITEMS);
});
