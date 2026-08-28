let db;

function initDB(callback) {
    const request = indexedDB.open('ControleNegocioDB', 4);

    request.onerror = e => console.error("Erro no IndexedDB", e);

    request.onupgradeneeded = e => {
        db = e.target.result;
        if (!db.objectStoreNames.contains('services')) db.createObjectStore('services', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('quickEntries')) db.createObjectStore('quickEntries', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory', { keyPath: 'id' });
        // Store da Lixeira (3 dias): keyPath 'tid' = '<storeName>:<id>'
        if (!db.objectStoreNames.contains('trash')) db.createObjectStore('trash', { keyPath: 'tid' });
    };

    request.onsuccess = e => {
        db = e.target.result;
        if (callback) callback();
    };
}

function dbSave(storeName, item, callback) {
    let tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => {
        if (callback) callback();
    };
}

function dbDelete(storeName, id, callback) {
    let tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => {
        if (callback) callback();
    };
}

function dbGetAll(callback) {
    let tx = db.transaction(['services', 'expenses', 'quickEntries', 'inventory'], 'readonly');
    let reqServices = tx.objectStore('services').getAll();
    let reqExpenses = tx.objectStore('expenses').getAll();
    let reqQuick = tx.objectStore('quickEntries').getAll();
    let reqInventory = tx.objectStore('inventory').getAll();

    tx.oncomplete = () => {
        callback({
            services: reqServices.result || [],
            expenses: reqExpenses.result || [],
            quickEntries: reqQuick.result || [],
            inventory: reqInventory.result || []
        });
    };
}

/**
 * Grava todas as listas de uma vez (usado pela sanatização retrocompatível que
 * corrige registros legados/corrompidos no carregamento).
 * @param {{services?: Array, expenses?: Array, quickEntries?: Array, inventory?: Array}} data
 * @param {Function} [callback]
 */
function dbSaveAll(data, callback) {
    let tx = db.transaction(['services', 'expenses', 'quickEntries', 'inventory'], 'readwrite');
    let s = tx.objectStore('services');
    let e = tx.objectStore('expenses');
    let q = tx.objectStore('quickEntries');
    let i = tx.objectStore('inventory');
    (data.services || []).forEach(it => s.put(it));
    (data.expenses || []).forEach(it => e.put(it));
    (data.quickEntries || []).forEach(it => q.put(it));
    (data.inventory || []).forEach(it => i.put(it));
    tx.oncomplete = () => {
        if (callback) callback();
    };
}

// ==========================================
// LIXEIRA (store 'trash')
// ==========================================

function dbTrashPut(entry, callback) {
    let tx = db.transaction('trash', 'readwrite');
    tx.objectStore('trash').put(entry);
    tx.oncomplete = () => {
        if (callback) callback();
    };
}

function dbTrashGetAll(callback) {
    let tx = db.transaction('trash', 'readonly');
    let req = tx.objectStore('trash').getAll();
    tx.oncomplete = () => {
        callback(req.result || []);
    };
}

function dbTrashDelete(tid, callback) {
    let tx = db.transaction('trash', 'readwrite');
    tx.objectStore('trash').delete(tid);
    tx.oncomplete = () => {
        if (callback) callback();
    };
}