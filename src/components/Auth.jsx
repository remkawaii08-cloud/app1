
import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowRight, Loader, Eye, EyeOff, Fingerprint, X, AlertTriangle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { setMasterHash as saveMasterHash, getMasterHash, setBiometricData, getBiometricData } from '../utils/db';
import { hashMasterPassword } from '../utils/crypto';
import { isBiometricAvailable, registerBiometrics, authenticateBiometrics } from '../utils/biometrics';
import LockscreenUI from './LockscreenUI';
import '../index.css';

const Setup = ({ onSetupComplete, onBack, showBack, onGoToLogin }) => {
    const [step, setStep] = useState('create'); // 'create' or 'confirm'
    const [tempPin, setTempPin] = useState('');
    const [enableBiometrics, setEnableBiometrics] = useState(false);
    const [isBioSupported, setIsBioSupported] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        isBiometricAvailable().then(setIsBioSupported);
    }, []);

    const handlePinComplete = async (pin) => {
        if (step === 'create') {
            setTempPin(pin);
            setStep('confirm');
        } else {
            if (pin !== tempPin) {
                setError('PINs do not match. Try again.');
                setStep('create');
                setTempPin('');
                return;
            }

            setLoading(true);
            try {
                const hash = hashMasterPassword(pin);
                await saveMasterHash(hash);

                if (enableBiometrics && isBioSupported) {
                    const bioData = await registerBiometrics(pin);
                    if (bioData) {
                        await setBiometricData(bioData);
                    }
                }

                onSetupComplete(pin);
            } catch (err) {
                setError('Failed to setup PIN.');
                console.error(err);
                setStep('create');
                setTempPin('');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex-center container" style={{ minHeight: '100vh' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card" style={{ maxWidth: '400px', width: '100%', position: 'relative' }}
            >
                {showBack && (
                    <button
                        onClick={onBack}
                        className="btn btn-secondary"
                        style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '0.4rem', borderRadius: '50%' }}
                        title="Back to Sign In"
                    >
                        <X size={16} />
                    </button>
                )}
                <div className="text-center mb-2">
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Lock size={30} color="var(--accent-primary)" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Create PIN</h1>
                    <p className="text-muted text-xs">Set a 6-digit PIN to secure your vault.</p>
                </div>

                <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {loading ? (
                        <div className="flex-center" style={{ height: '300px' }}>
                            <Loader className="animate-spin" size={48} />
                        </div>
                    ) : (
                        <LockscreenUI
                            onComplete={handlePinComplete}
                            isError={!!error}
                            onErrorClear={() => setError('')}
                            title={step === 'create' ? "New PIN" : "Confirm PIN"}
                            subtitle={step === 'create' ? "Enter 6 digits" : "Repeat your 6-digit PIN"}
                        />
                    )}
                </div>

                {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center', marginTop: '-1rem', marginBottom: '1rem' }}>{error}</p>}

                <div className="flex-center flex-direction-column" style={{ width: '100%' }}>
                    {isBioSupported && (
                        <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', width: '100%' }} onClick={() => setEnableBiometrics(!enableBiometrics)}>
                            <input type="checkbox" checked={enableBiometrics} onChange={() => { }} style={{ cursor: 'pointer' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Fingerprint size={16} color="var(--accent-secondary)" />
                                <span className="text-xs">Enable Fingerprint Login</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        className="text-muted text-xs"
                        onClick={onGoToLogin}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Already have a PIN? Sign In
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const Login = ({ onLogin, storedHash, onGoToSetup, onRestore }) => {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [bioMetadata, setBioMetadata] = useState(null);

    useEffect(() => {
        const checkBio = async () => {
            const available = await isBiometricAvailable();
            if (available) {
                const data = await getBiometricData();
                if (data) setBioMetadata(data);
            }
        };
        checkBio();
    }, []);

    const handleBiometricLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const masterPw = await authenticateBiometrics(bioMetadata);
            if (masterPw) {
                onLogin(masterPw);
            } else {
                setError('Biometric authentication failed.');
                setLoading(false);
            }
        } catch (err) {
            setError('Fingerprint sensor error.');
            setLoading(false);
        }
    };

    const handleGoToSetup = () => {
        const proceed = window.confirm('Warning: Creating a new Master Key may overwrite your current one. Proceed?');
        if (proceed) {
            onGoToSetup();
        }
    };

    const handleRestoreFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backup = JSON.parse(event.target.result);
                if (!backup.accounts || !Array.isArray(backup.accounts)) {
                    throw new Error('Invalid backup file');
                }

                if (onRestore) {
                    await onRestore(backup.accounts);
                    alert(`Success! ${backup.accounts.length} accounts have been imported. You can now sign in to view them.`);
                }
            } catch (err) {
                alert('Failed to restore backup: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handlePinComplete = async (pin) => {
        setLoading(true);
        setError('');

        // Use a micro-task delay to ensure UI transitions smoothly
        await new Promise(resolve => setTimeout(resolve, 50));

        const hash = hashMasterPassword(pin);
        if (hash === storedHash) {
            onLogin(pin);
        } else {
            setError('Incorrect PIN.');
            setLoading(false);
        }
    };

    return (
        <div className="flex-center container" style={{ minHeight: '100vh' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card" style={{ maxWidth: '400px', width: '100%' }}
            >
                <div className="text-center mb-4">
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Unlock size={40} color="var(--accent-primary)" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Unlock Vault</h1>
                    <p className="text-muted text-sm">Enter your 6-digit PIN to unlock.</p>
                </div>

                <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {loading ? (
                        <div className="flex-center" style={{ height: '300px' }}>
                            <Loader className="animate-spin" size={48} />
                        </div>
                    ) : (
                        <LockscreenUI
                            onComplete={handlePinComplete}
                            isError={!!error}
                            onErrorClear={() => setError('')}
                        />
                    )}
                </div>

                {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center', marginTop: '-1rem', marginBottom: '1.5rem' }}>{error}</p>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {bioMetadata && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleBiometricLogin}
                            style={{ width: '100%', padding: '0.875rem', gap: '0.75rem', border: '1px solid var(--accent-primary)', fontSize: '0.875rem' }}
                            disabled={loading}
                        >
                            <Fingerprint size={18} color="var(--accent-secondary)" />
                            Biometric Unlock
                        </button>
                    )}

                    <button
                        type="button"
                        className="text-muted text-xs"
                        onClick={handleGoToSetup}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.5rem', textDecoration: 'underline', alignSelf: 'center' }}
                    >
                        Forgot PIN or Reset Vault
                    </button>
                </div>

                {/* Emergency / Recovery Options */}
                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <p className="text-xs text-muted mb-2">Recovery Options</p>
                    <label
                        className="btn btn-secondary"
                        style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', gap: '0.5rem', cursor: 'pointer', borderStyle: 'dashed' }}
                    >
                        <Upload size={16} color="var(--accent-secondary)" />
                        Import / Restore Backup
                        <input type="file" accept=".json,.bin" onChange={handleRestoreFile} style={{ display: 'none' }} />
                    </label>
                </div>
            </motion.div>
        </div>
    );
};

export { Setup, Login };
