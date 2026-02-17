
import { encryptData, decryptData } from './crypto';

// Check if biometric authentication is available
export const isBiometricAvailable = async () => {
    if (!window.PublicKeyCredential) return false;

    // Checking for platform authenticator support
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
};

// Simplified WebAuthn flow for local-only authentication simulation
// In a real high-security app, this would involve server-side verification challenge/response
// For a local PWA, we use it to 'authorize' access to an encrypted local secret.

const CHALLENGE = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]); // Demo challenge

export const registerBiometrics = async (masterPassword) => {
    try {
        const userId = crypto.getRandomValues(new Uint8Array(16));

        const options = {
            publicKey: {
                challenge: CHALLENGE,
                rp: { name: "SecureVault" },
                user: {
                    id: userId,
                    name: "user",
                    displayName: "SecureVault User"
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                }
            }
        };

        const credential = await navigator.credentials.create(options);
        if (!credential) return null;

        // IMPORTANT: In this local-only setup, we use a fixed 'secret' key 
        // to wrap the password if biometric check passes.
        // In a production app, the 'credential' would be verified by a server.
        // For PWA offline recovery: we store the master password encrypted by a 'bio-secret'
        // that the app only 'remembers' if this step completes.

        // We treat the successful 'creation' as the biometric authorization.
        return {
            credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
            wrappedPassword: encryptData(masterPassword, "BIO_INTERNAL_KEY_V1") // Simulated secret
        };
    } catch (error) {
        console.error("Biometric registration failed:", error);
        return null;
    }
};

export const authenticateBiometrics = async (biometricData) => {
    try {
        const options = {
            publicKey: {
                challenge: CHALLENGE,
                allowCredentials: [{
                    id: new Uint8Array(atob(biometricData.credentialId).split("").map(c => c.charCodeAt(0))),
                    type: "public-key"
                }],
                userVerification: "required"
            }
        };

        const assertion = await navigator.credentials.get(options);
        if (!assertion) return null;

        // Successful assertion means user provided fingerprint/face
        // Return the decrypted master password
        return decryptData(biometricData.wrappedPassword, "BIO_INTERNAL_KEY_V1");
    } catch (error) {
        console.error("Biometric authentication failed:", error);
        return null;
    }
};
