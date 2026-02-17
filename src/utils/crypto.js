
import CryptoJS from 'crypto-js';

const SALT_ROUNDS = 10;
const ALGO = 'AES';

// Hash function for master password verifier
export const hashMasterPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};

// Encrypt data with password
export const encryptData = (dataStr, password) => {
  return CryptoJS.AES.encrypt(dataStr, password).toString();
};

// Decrypt data with password
export const decryptData = (encryptedData, password) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedData) return null;
    return decryptedData;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};
