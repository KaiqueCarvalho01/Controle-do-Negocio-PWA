// ==========================================
// MÓDULO DE CRIPTOGRAFIA & SEGURANÇA (AES-256 GCM)
// ==========================================

/**
 * Converte ArrayBuffer para string Base64.
 */
function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Converte string Base64 para Uint8Array.
 */
function base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Deriva uma chave AES-GCM de 256 bits a partir de uma senha e salt usando PBKDF2 (100.000 iterações).
 */
async function deriveCryptoKey(password, saltBytes) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Criptografa um objeto de dados em um payload seguro AES-GCM usando a senha fornecida pelo usuário.
 * @param {Object} dataObj Dados a serem criptografados.
 * @param {string} password Senha definida pelo usuário.
 */
async function encryptBackupData(dataObj, password) {
    try {
        if (!password) {
            throw new Error('Uma senha deve ser informada para criptografar o backup.');
        }

        const plainText = JSON.stringify(dataObj);
        const enc = new TextEncoder();
        const encodedData = enc.encode(plainText);

        // Gera Salt (16 bytes) e IV (12 bytes) criptograficamente seguros
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const key = await deriveCryptoKey(password, salt);

        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encodedData
        );

        return {
            __encrypted: true,
            version: 1,
            algorithm: 'AES-256-GCM',
            salt: bufferToBase64(salt),
            iv: bufferToBase64(iv),
            payload: bufferToBase64(encryptedContent),
            exportedAt: new Date().toISOString()
        };
    } catch (err) {
        console.error('Erro ao criptografar backup:', err);
        throw new Error('Falha na criptografia do backup: ' + err.message);
    }
}

/**
 * Descriptografa um payload de backup usando a senha informada.
 * @param {Object} encryptedObj Payload criptografado.
 * @param {string} password Senha fornecida pelo usuário.
 */
async function decryptBackupData(encryptedObj, password) {
    try {
        if (!encryptedObj || !encryptedObj.__encrypted || !encryptedObj.payload) {
            // Não está criptografado, retorna o próprio objeto (legado)
            return encryptedObj;
        }

        if (!password) {
            throw new Error('Informe a senha para descriptografar o backup.');
        }

        const salt = base64ToBuffer(encryptedObj.salt);
        const iv = base64ToBuffer(encryptedObj.iv);
        const encryptedBytes = base64ToBuffer(encryptedObj.payload);

        const key = await deriveCryptoKey(password, salt);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encryptedBytes
        );

        const dec = new TextDecoder();
        const jsonStr = dec.decode(decryptedBuffer);
        return JSON.parse(jsonStr);
    } catch (err) {
        console.warn('Falha ao descriptografar:', err);
        throw new Error('Senha incorreta ou arquivo de backup corrompido.');
    }
}

/**
 * Gera um hash SHA-256 seguro a partir de um valor e um salt em Base64.
 * @param {string} value Valor a ser hasheado (ex: PIN ou Resposta Secreta).
 * @param {string} saltBase64 Salt em Base64 (se omitido, um novo salt de 16 bytes é gerado).
 */
async function hashValueWithSalt(value, saltBase64 = null) {
    let saltBytes;
    if (saltBase64) {
        saltBytes = base64ToBuffer(saltBase64);
    } else {
        saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
        saltBase64 = bufferToBase64(saltBytes);
    }

    const enc = new TextEncoder();
    const valueBytes = enc.encode(value.toLowerCase().trim());
    
    // Concatena Salt + Valor
    const combined = new Uint8Array(saltBytes.length + valueBytes.length);
    combined.set(saltBytes, 0);
    combined.set(valueBytes, saltBytes.length);

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined);
    const hashBase64 = bufferToBase64(hashBuffer);

    return {
        salt: saltBase64,
        hash: hashBase64
    };
}

/**
 * Valida se um valor bate com o hash e salt armazenados.
 */
async function verifyHashedValue(value, saltBase64, expectedHash) {
    if (!value || !saltBase64 || !expectedHash) return false;
    const result = await hashValueWithSalt(value, saltBase64);
    return result.hash === expectedHash;
}

