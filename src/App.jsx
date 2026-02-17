
import React, { useState, useEffect } from 'react';
import { Setup, Login } from './components/Auth';
import Dashboard from './components/Dashboard';
import { getMasterHash, addAccount } from './utils/db';
import { hashMasterPassword } from './utils/crypto';
import { v4 as uuidv4 } from 'uuid';
import { Loader, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasMasterPassword, setHasMasterPassword] = useState(false);
  const [masterPassword, setMasterPassword] = useState(null);
  const [storedHash, setStoredHash] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [view, setView] = useState(null); // 'setup' | 'login'

  useEffect(() => {
    checkSetup();
    // Hide splash after 2 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', () => { });
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const checkSetup = async () => {
    try {
      const hash = await getMasterHash();
      if (hash) {
        setHasMasterPassword(true);
        setStoredHash(hash);
        if (!view) setView('login');
      } else {
        setHasMasterPassword(false);
        if (!view) setView('setup');
      }
    } catch (error) {
      console.error("Failed to check setup:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (password) => {
    setMasterPassword(password);
  };

  const handleSetupComplete = (password) => {
    const hash = hashMasterPassword(password);
    setStoredHash(hash);
    setMasterPassword(password);
    setHasMasterPassword(true);
  };

  const handleLogout = () => {
    setMasterPassword(null);
  };

  const handleRestore = async (accounts) => {
    for (const acc of accounts) {
      // Mapping: Ensure we support 'password' field from old backups and map to 'encryptedPassword'
      const mappedAcc = {
        ...acc,
        id: acc.id || uuidv4(),
        encryptedPassword: acc.encryptedPassword || acc.password,
        name: acc.name || acc.platform || 'Unknown'
      };
      await addAccount(mappedAcc);
    }
  };

  if (showSplash || loading) {
    return (
      <div className="splash-container">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="btn btn-primary"
            style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10001, boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}
          >
            Install App
          </button>
        )}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="splash-logo"
        >
          <svg width="120" height="120" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#1e293b" />
            <path d="M256 80L120 140V240C120 326 178 406 256 432C334 406 392 326 392 240V140L256 80Z" fill="#3b82f6" />
            <circle cx="256" cy="240" r="40" fill="white" />
            <rect x="236" y="270" width="40" height="60" rx="4" fill="white" />
          </svg>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}
        >
          SecureVault
        </motion.h1>
      </div>
    );
  }

  if (!masterPassword) {
    if (view === 'setup') {
      return (
        <Setup
          onSetupComplete={handleSetupComplete}
          onBack={() => setView('login')}
          showBack={hasMasterPassword}
          onGoToLogin={() => setView('login')}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        storedHash={storedHash}
        onGoToSetup={() => setView('setup')}
        onRestore={handleRestore}
      />
    );
  }

  return <Dashboard masterPassword={masterPassword} onLogout={() => { handleLogout(); setView('login'); }} />;
};

export default App;
