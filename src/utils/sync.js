
import { initDB } from './db';

const SYNC_STORE = 'sync-metadata';

// Check if File System Access API is supported
export const isFileSystemSupported = () => {
    return 'showSaveFilePicker' in window;
};

// Request a file handle from the user
export const requestSyncFile = async () => {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: 'securevault_sync_backup.json',
            types: [{
                description: 'JSON Backup File',
                accept: { 'application/json': ['.json'] },
            }],
        });

        // Store handle in DB
        const db = await initDB();
        await db.put(SYNC_STORE, handle, 'fileHandle');
        return handle;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('File picker error:', err);
        }
        return null;
    }
};

// Get existing handle from DB
export const getStoredSyncHandle = async () => {
    const db = await initDB();
    return await db.get(SYNC_STORE, 'fileHandle');
};

// Verify if we still have permission
export const verifyPermission = async (fileHandle) => {
    const options = { mode: 'readwrite' };
    if ((await fileHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
};

// Write backup to the linked file
export const performAutoBackup = async (accounts) => {
    try {
        const handle = await getStoredSyncHandle();
        if (!handle) return;

        // Attempt to verify permission (browsers often require a user gesture, 
        // so this might fail if called automatically. We'll handle gracefully)
        if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            return;
        }

        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            accounts: accounts
        };

        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(backupData, null, 2));
        await writable.close();
        console.log('Auto-backup successful');
    } catch (err) {
        console.warn('Auto-backup skipped or failed:', err);
    }
};

// Manual export with folder selection (if supported)
export const manualExportFile = async (data, suggestedName) => {
    // 1. User Confirmation as requested
    const proceed = window.confirm('Preparing your backup. Please choose a secure folder in the next step. Continue?');
    if (!proceed) return false;

    // 2. Try the modern File System Access API (Desktop Chrome/Edge)
    if (isFileSystemSupported()) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: 'Encrypted Vault Backup',
                    accept: { 'application/octet-stream': ['.bin'] },
                }],
            });
            const writable = await handle.createWritable();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/octet-stream' });
            await writable.write(blob);
            await writable.close();
            return true;
        } catch (err) {
            if (err.name === 'AbortError') return false;
            console.warn('File Picker failed, falling back to download:', err);
        }
    }

    // 3. Fallback: Trigger modern download with clean Blob URL (Android/iOS/Other)
    try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = suggestedName;

        // This simulates a 'New File' context for the browser
        a.setAttribute('data-created', Date.now());

        document.body.appendChild(a);
        a.click();

        // Cleanup with some delay to ensure the browser has started the download
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        return true;
    } catch (err) {
        console.error('Export failed completely:', err);
        return false;
    }
};

