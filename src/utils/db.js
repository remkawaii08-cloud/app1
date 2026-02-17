
import { openDB } from 'idb';

const DB_NAME = 'secure-password-manager';
const STORE_NAME = 'accounts';
const MASTER_KEY_NAME = 'master-password-hash';
const BIOMETRIC_STORE = 'biometric-metadata';

// Initialize the database
export const initDB = async () => {
    return await openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(MASTER_KEY_NAME)) {
                db.createObjectStore(MASTER_KEY_NAME);
            }
            if (!db.objectStoreNames.contains(BIOMETRIC_STORE)) {
                db.createObjectStore(BIOMETRIC_STORE);
            }
            if (!db.objectStoreNames.contains('sync-metadata')) {
                db.createObjectStore('sync-metadata');
            }
        },
    });
};

export const setBiometricData = async (data) => {
    const db = await initDB();
    await db.put(BIOMETRIC_STORE, data, 'metadata');
};

export const getBiometricData = async () => {
    const db = await initDB();
    return await db.get(BIOMETRIC_STORE, 'metadata');
};

// Store master password hash
export const setMasterHash = async (hash) => {
    const db = await initDB();
    await db.put(MASTER_KEY_NAME, hash, 'hash');
};

// Retrieve master password hash
export const getMasterHash = async () => {
    const db = await initDB();
    return await db.get(MASTER_KEY_NAME, 'hash');
};

// Add new account
export const addAccount = async (account) => {
    const db = await initDB();
    await db.add(STORE_NAME, account);
};

// Get all accounts
export const getAccounts = async () => {
    const db = await initDB();
    return await db.getAll(STORE_NAME);
};

// Update existing account
export const updateAccount = async (account) => {
    const db = await initDB();
    await db.put(STORE_NAME, account);
};

// Delete account
export const deleteAccount = async (id) => {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
};

// Clear all accounts (for restore)
export const clearAllAccounts = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
};
