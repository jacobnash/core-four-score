/**
 * Shared Firestore ↔ JSON serialization for backup/restore scripts.
 */

function isFirestoreTimestamp(value) {
    return value && typeof value.toDate === 'function' && value instanceof Date === false && !Array.isArray(value);
}

function safeInstanceof(value, Type) {
    try {
        return Boolean(Type && value instanceof Type);
    } catch {
        return false;
    }
}

function serializeValue(value, admin, options = {}) {
    const { stripPhotos = false } = options;
    if (value === null || value === undefined) return value;

    if (isFirestoreTimestamp(value)) {
        return { __type: 'Timestamp', value: value.toDate().toISOString() };
    }
    if (value instanceof Date) {
        return { __type: 'Timestamp', value: value.toISOString() };
    }
    if (safeInstanceof(value, admin.firestore.GeoPoint)) {
        return { __type: 'GeoPoint', latitude: value.latitude, longitude: value.longitude };
    }
    if (safeInstanceof(value, admin.firestore.DocumentReference)) {
        return { __type: 'DocumentReference', path: value.path };
    }

    if (Array.isArray(value)) {
        return value.map(v => serializeValue(v, admin, options));
    }

    if (typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (stripPhotos && k === 'photoURL') continue;
            out[k] = serializeValue(v, admin, options);
        }
        return out;
    }

    return value;
}

function deserializeValue(value, admin, db) {
    if (value === null || value === undefined) return value;

    if (typeof value === 'object' && value.__type === 'Timestamp') {
        return admin.firestore.Timestamp.fromDate(new Date(value.value));
    }
    if (typeof value === 'object' && value.__type === 'GeoPoint') {
        return new admin.firestore.GeoPoint(value.latitude, value.longitude);
    }
    if (typeof value === 'object' && value.__type === 'DocumentReference') {
        return db.doc(value.path);
    }

    if (Array.isArray(value)) {
        return value.map(v => deserializeValue(v, admin, db));
    }

    if (typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = deserializeValue(v, admin, db);
        }
        return out;
    }

    return value;
}

module.exports = { serializeValue, deserializeValue };
