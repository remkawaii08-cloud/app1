import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, X } from 'lucide-react';

const LockscreenUI = ({ onComplete, onErrorClear, isError, title, subtitle }) => {
    const [pin, setPin] = useState('');
    const [shake, setShake] = useState(false);

    const triggerVibration = () => {
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
    };

    const handleNumberClick = (num) => {
        if (pin.length < 6) {
            triggerVibration();
            setPin(prev => prev + num);
        }
    };

    useEffect(() => {
        if (pin.length === 6) {
            const timer = setTimeout(() => {
                onComplete(pin);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [pin, onComplete]);

    const handleDelete = () => {
        triggerVibration();
        setPin(pin.slice(0, -1));
        if (isError) onErrorClear();
    };

    const handleClear = () => {
        triggerVibration();
        setPin('');
        if (isError) onErrorClear();
    };

    useEffect(() => {
        if (isError) {
            setShake(true);
            const timer = setTimeout(() => {
                setShake(false);
                setPin('');
                onErrorClear();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isError, onErrorClear]);

    const numpadButtons = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        'CLR', '0', 'DEL'
    ];

    return (
        <div className="lockscreen-container">
            <div className="lockscreen-header">
                <h2 className="lockscreen-title">{title || 'Enter PIN'}</h2>
                {subtitle && <p className="lockscreen-subtitle">{subtitle}</p>}
            </div>

            <motion.div
                className="pin-indicators"
                animate={shake ? { x: [-10, 10, -10, 10, 0], color: 'var(--danger)' } : { x: 0 }}
                transition={{ duration: 0.4 }}
            >
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className={`pin-dot ${i < pin.length ? 'filled' : ''} ${shake ? 'error' : ''}`}
                    />
                ))}
            </motion.div>

            <div className="numpad-grid">
                {numpadButtons.map((btn) => {
                    let onClick = () => handleNumberClick(btn);
                    let content = btn;
                    let className = "numpad-btn";

                    if (btn === 'CLR') {
                        onClick = handleClear;
                        content = <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>CLEAR</span>;
                        className += " text-btn";
                    } else if (btn === 'DEL') {
                        onClick = handleDelete;
                        content = <Delete size={24} />;
                        className += " icon-btn";
                    }

                    return (
                        <motion.button
                            key={btn}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={className}
                            onClick={(e) => {
                                e.preventDefault();
                                onClick();
                            }}
                        >
                            {content}
                        </motion.button>
                    );
                })}
            </div>

        </div>
    );
};

export default LockscreenUI;
