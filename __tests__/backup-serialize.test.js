const { serializeValue, deserializeValue } = require('../scripts/export/serialize');

const mockAdmin = {
    firestore: {
        Timestamp: {
            fromDate: (d) => ({ toDate: () => d, __mockTs: true }),
        },
        GeoPoint: class {
            constructor(lat, lng) {
                this.latitude = lat;
                this.longitude = lng;
            }
        },
    },
};

const mockDb = {
    doc: (p) => ({ path: p }),
};

describe('backup serialize helpers', () => {
    it('deserializes Timestamp JSON back to Firestore Timestamp', () => {
        const serialized = { __type: 'Timestamp', value: '2024-06-15T12:00:00.000Z' };
        const restored = deserializeValue(serialized, mockAdmin, mockDb);
        expect(restored.toDate().toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('strips photoURL when stripPhotos is true', () => {
        const data = { displayName: 'Cait', photoURL: 'data:image/jpeg;base64,abc' };
        const serialized = serializeValue(data, mockAdmin, { stripPhotos: true });
        expect(serialized.displayName).toBe('Cait');
        expect(serialized.photoURL).toBeUndefined();
    });

    it('preserves photoURL by default', () => {
        const data = { displayName: 'Cait', photoURL: 'https://example.com/p.jpg' };
        const serialized = serializeValue(data, mockAdmin);
        expect(serialized.photoURL).toBe('https://example.com/p.jpg');
    });
});
