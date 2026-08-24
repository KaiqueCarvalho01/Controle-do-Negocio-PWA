let db;

function initDB(callback) {
    const request = indexedDB.open('ControleNegocioDB', 3);

    request.onerror = e => console.error("Erro no IndexedDB", e);

    request.onupgradeneeded = e => {
        db = e.target.result;
        if (!db.objectStoreNames.contains('services')) db.createObjectStore('services', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('quickEntries')) db.createObjectStore('quickEntries', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory', { keyPath: 'id' });
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