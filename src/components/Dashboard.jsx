
import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, User, Lock, Copy, Eye, EyeOff, X, Plus, Search, Loader, Key, ChevronDown, ChevronRight, Check, Download, Upload, FileJson } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccounts, addAccount, updateAccount, deleteAccount, clearAllAccounts } from '../utils/db';
import { encryptData, decryptData, hashMasterPassword } from '../utils/crypto';
import { performAutoBackup, requestSyncFile, getStoredSyncHandle, isFileSystemSupported, manualExportFile } from '../utils/sync';
import { v4 as uuidv4 } from 'uuid';

// Utility to copy text
const copyToClipboard = (text, callback) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        if (callback) callback();
    });
};

const Toast = ({ message, visible, onHide }) => {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(onHide, 2000);
            return () => clearTimeout(timer);
        }
    }, [visible, onHide]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 20, x: '-50%' }}
                    style={{
                        position: 'fixed',
                        bottom: '2rem',
                        left: '50%',
                        backgroundColor: 'var(--accent-primary)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '2rem',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 500
                    }}
                >
                    <Check size={18} />
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const AccountRow = ({ account, masterPassword, onDelete, onEdit, onCopyToast }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [decryptedPassword, setDecryptedPassword] = useState('');
    const [isDecrypted, setIsDecrypted] = useState(false);
    const [copiedUser, setCopiedUser] = useState(false);
    const [copiedPass, setCopiedPass] = useState(false);

    // Reset decryption state if account changes
    useEffect(() => {
        setIsDecrypted(false);
        setDecryptedPassword('');
        setShowPassword(false);
    }, [account.id]);

    const handleTogglePassword = () => {
        if (!showPassword && !isDecrypted) {
            // Support both internal naming and potential legacy/imported 'password' field
            const passwordToDecrypt = account.encryptedPassword || account.password;
            const decrypted = decryptData(passwordToDecrypt, masterPassword);

            if (decrypted) {
                setDecryptedPassword(decrypted);
                setIsDecrypted(true);
            } else {
                setDecryptedPassword('ERROR: Decrypt failed');
            }
        }
        setShowPassword(!showPassword);
    };

    const handleCopyUser = () => {
        copyToClipboard(account.username, () => onCopyToast('Username Copied!'));
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 2000);
    };

    const handleCopyPass = () => {
        let pass = decryptedPassword;
        if (!isDecrypted) {
            const passwordToDecrypt = account.encryptedPassword || account.password;
            pass = decryptData(passwordToDecrypt, masterPassword);
            if (pass) {
                setDecryptedPassword(pass);
                setIsDecrypted(true);
            }
        }

        if (pass && pass !== 'ERROR: Decrypt failed') {
            copyToClipboard(pass, () => onCopyToast('Password Copied!'));
            setCopiedPass(true);
            setTimeout(() => setCopiedPass(false), 2000);
        } else {
            console.error("Copy failed: Could not decrypt password.");
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="account-row"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)'
            }}
        >
            <div className="account-row-content" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1, overflow: 'hidden' }}>
                {/* Username Section */}
                <div className="account-info-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} className="text-muted" />
                        <span className="text-sm" style={{ fontWeight: 500 }}>{account.username}</span>
                    </div>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem', height: '24px', width: '24px' }}
                        onClick={handleCopyUser}
                        title="Copy Username"
                    >
                        {copiedUser ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    </button>
                </div>

                {/* Password Section */}
                <div className="account-info-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Key size={16} className="text-muted" />
                        <span className="text-sm" style={{ fontFamily: 'monospace', width: '120px', display: 'inline-block' }}>
                            {showPassword ? decryptedPassword : '••••••••••••'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem', height: '24px', width: '24px' }}
                            onClick={handleTogglePassword}
                            title={showPassword ? "Hide" : "Show"}
                        >
                            {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem', height: '24px', width: '24px' }}
                            onClick={handleCopyPass}
                            title="Copy Password"
                        >
                            {copiedPass ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => onEdit(account)} title="Edit">
                    <Pencil size={14} />
                </button>
                <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => onDelete(account.id)} title="Delete">
                    <Trash2 size={14} />
                </button>
            </div>
        </motion.div>
    );
};

const PlatformAccordion = ({ platformName, accounts, masterPassword, onDelete, onEdit, onAdd, onCopyToast }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Default to open if filtering (optional interaction polish)

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isOpen ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    transition: 'background-color 0.2s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{platformName}</h3>
                    <span className="text-muted text-xs" style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>
                        {accounts.length}
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        {accounts.map(acc => (
                            <AccountRow
                                key={acc.id}
                                account={acc}
                                masterPassword={masterPassword}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                onCopyToast={onCopyToast}
                            />
                        ))}
                        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'center' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', borderStyle: 'dashed', borderWidth: '1px' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdd(platformName);
                                }}
                            >
                                <Plus size={16} /> Add another {platformName} account
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AccountModal = ({ isOpen, onClose, onSave, accountToEdit, existingPlatforms, initialPlatform }) => {
    const [platform, setPlatform] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (accountToEdit) {
            setPlatform(accountToEdit.name); // Using 'name' as platform
            setUsername(accountToEdit.username);
            setPassword('');
        } else {
            setPlatform(initialPlatform || '');
            setUsername('');
            setPassword('');
            // Optional: Auto-generate password on open?
        }
        setShowPassword(false);
    }, [accountToEdit, isOpen, initialPlatform]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name: platform, username, password });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{ width: '90%', maxWidth: '500px', margin: 0, position: 'relative' }}
            >
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '1.5rem' }}>{accountToEdit ? 'Edit Account' : 'Add New Account'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Platform / Website</label>
                        <input
                            className="input-field"
                            value={platform}
                            onChange={e => setPlatform(e.target.value)}
                            placeholder="e.g. Facebook, Gmail"
                            list="platforms"
                            required
                            autoFocus
                        />
                        <datalist id="platforms">
                            {existingPlatforms.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Username / Email</label>
                        <input className="input-field" value={username} onChange={e => setUsername(e.target.value)} placeholder="user@example.com" required />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Password {accountToEdit && <span className="text-muted">(Leave blank to keep current)</span>}</label>
                        <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    className="input-field"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="StrongPassword123"
                                    required={!accountToEdit}
                                    style={{ paddingRight: '2.5rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <button type="button" className="btn btn-secondary" onClick={() => setPassword(Math.random().toString(36).slice(-12) + "!")}>Gen</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ marginRight: '1rem' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Account</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const Dashboard = ({ masterPassword, onLogout }) => {
    const [accounts, setAccounts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ visible: false, message: '' });

    const showToast = (message) => {
        setToast({ visible: true, message });
    };

    const [isSyncEnabled, setIsSyncEnabled] = useState(false);

    useEffect(() => {
        const checkSync = async () => {
            const handle = await getStoredSyncHandle();
            if (handle) setIsSyncEnabled(true);
        };
        checkSync();
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (isSyncEnabled && accounts.length > 0) {
            performAutoBackup(accounts);
        }
    }, [accounts, isSyncEnabled]);

    const handleEnableSync = async () => {
        if (!isFileSystemSupported()) {
            alert("Your browser/device doesn't support direct file sync. You can still use manual Export/Import.");
            return;
        }
        const handle = await requestSyncFile();
        if (handle) {
            setIsSyncEnabled(true);
        }
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const data = await getAccounts();
            setAccounts(data);
        } catch (error) {
            console.error("Failed to fetch accounts", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            accounts: accounts
        };
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `Vault_Backup_${dateStr}.bin`;

        const success = await manualExportFile(backupData, fileName);
        if (success) {
            showToast('Backup Exported successfully!');
        }
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backup = JSON.parse(event.target.result);
                if (!backup.accounts || !Array.isArray(backup.accounts)) {
                    throw new Error('Invalid backup file');
                }

                // Security Check: Verify one account to ensure the current Master Password is correct for this backup
                // OR: Simply import them. Since they are encrypted with the original password, 
                // if the user's current password is different, they just won't be able to decrypt them.
                // We'll warn the user.
                const proceed = window.confirm(`Import ${backup.accounts.length} accounts? This will add them to your current vault.`);
                if (proceed) {
                    for (const acc of backup.accounts) {
                        const mappedAcc = {
                            ...acc,
                            id: acc.id || uuidv4(),
                            encryptedPassword: acc.encryptedPassword || acc.password,
                            name: acc.name || acc.platform || 'Unknown'
                        };
                        await addAccount(mappedAcc);
                    }
                    fetchAccounts();
                    alert('Backup restored successfully!');
                }
            } catch (err) {
                alert('Failed to import backup: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    // Grouping Logic
    const groupedAccounts = useMemo(() => {
        const filtered = accounts.filter(acc =>
            acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acc.username.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const groups = {};
        filtered.forEach(acc => {
            if (!groups[acc.name]) {
                groups[acc.name] = [];
            }
            groups[acc.name].push(acc);
        });

        // Sort keys
        return Object.keys(groups).sort().reduce((obj, key) => {
            obj[key] = groups[key];
            return obj;
        }, {});
    }, [accounts, searchQuery]);

    const existingPlatforms = useMemo(() => {
        return [...new Set(accounts.map(acc => acc.name))].sort();
    }, [accounts]);

    const handleSaveAccount = async ({ name, username, password }) => {
        try {
            if (editingAccount) {
                let encryptedPassword = editingAccount.encryptedPassword;
                if (password) {
                    encryptedPassword = encryptData(password, masterPassword);
                }
                await updateAccount({ ...editingAccount, name, username, encryptedPassword });
            } else {
                const encryptedPassword = encryptData(password, masterPassword);
                const newAccount = {
                    id: uuidv4(),
                    name,
                    username,
                    encryptedPassword,
                    createdAt: new Date().toISOString()
                };
                await addAccount(newAccount);
            }
            fetchAccounts();
        } catch (error) {
            console.error("Failed to save account", error);
        }
    };

    const handleDeleteAccount = async (id) => {
        if (window.confirm("Are you sure you want to delete this account?")) {
            await deleteAccount(id);
            fetchAccounts();
        }
    };

    return (
        <div className="container">
            <header className="flex-between mb-4" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'var(--accent-primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                        <Lock color="white" size={24} />
                    </div>
                    <h1>SecureVault</h1>
                </div>
                <button className="btn btn-secondary" onClick={onLogout} style={{ gap: '0.5rem' }}>
                    <Lock size={16} /> Lock Vault
                </button>
            </header>

            <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileJson size={20} color="var(--accent-primary)" />
                    <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Backup & Recovery</h4>
                        <p className="text-xs text-muted">Keep your accounts safe outside this device.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handleExport} style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
                        <Download size={14} /> Export
                    </button>
                    <label className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>
                        <Upload size={14} /> Import
                        <input type="file" accept=".json,.bin" onChange={handleImport} style={{ display: 'none' }} />
                    </label>
                </div>
            </div>

            {isFileSystemSupported() && (
                <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: isSyncEnabled ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-tertiary)', border: isSyncEnabled ? '1px solid var(--success)' : '1px solid var(--border-color)', marginBottom: '1rem' }}>
                    <input type="checkbox" checked={isSyncEnabled} onChange={handleEnableSync} style={{ cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                        <span className="text-sm" style={{ fontWeight: 600 }}>{isSyncEnabled ? 'Live Backup Active' : 'Enable Live Sync'}</span>
                        <p className="text-xs text-muted">{isSyncEnabled ? 'Your vault file is being updated automatically.' : 'Sync to a folder to keep an automatic hidden backup.'}</p>
                    </div>
                    {isSyncEnabled ? <Check size={16} color="var(--success)" /> : <AlertTriangle size={16} color="var(--accent-secondary)" />}
                </div>
            )}

            <div className="flex-between mb-4">
                <div className="input-group" style={{ marginBottom: 0, flex: 1, marginRight: '1rem', position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        className="input-field"
                        style={{ paddingLeft: '3rem' }}
                        placeholder="Search platforms or usernames..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingAccount(null); setSelectedPlatform(''); setIsModalOpen(true); }}>
                    <Plus size={20} /> Add Account
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {loading ? (
                    <div className="flex-center" style={{ height: '200px' }}>
                        <Loader className="animate-spin" />
                    </div>
                ) : Object.keys(groupedAccounts).length === 0 ? (
                    <div className="text-center text-muted" style={{ padding: '3rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                        <p>{searchQuery ? 'No matching accounts found.' : 'No accounts yet. Add one to get started!'}</p>
                    </div>
                ) : (
                    Object.entries(groupedAccounts).map(([platform, accs]) => (
                        <PlatformAccordion
                            key={platform}
                            platformName={platform}
                            accounts={accs}
                            masterPassword={masterPassword}
                            onDelete={handleDeleteAccount}
                            onEdit={(acc) => { setEditingAccount(acc); setIsModalOpen(true); }}
                            onAdd={(platform) => { setEditingAccount(null); setSelectedPlatform(platform); setIsModalOpen(true); }}
                            onCopyToast={showToast}
                        />
                    ))
                )}
            </div>

            <AccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveAccount}
                accountToEdit={editingAccount}
                existingPlatforms={existingPlatforms}
                initialPlatform={selectedPlatform}
            />

            <Toast
                message={toast.message}
                visible={toast.visible}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </div>
    );
};

export default Dashboard;
