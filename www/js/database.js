let db;

function initDB(callback) {
    let tentativas = 0;

    function abrir() {
        const request = indexedDB.open('ControleNegocioDB', 4);

        request.onerror = e => {
            console.error("Erro no IndexedDB", e);
            alert('Falha ao abrir o banco de dados do app.\n\nFeche todas as outras abas/janelas deste app e reinicie.');
        };

        request.onupgradeneeded = e => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('services')) db.createObjectStore('services', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('quickEntries')) db.createObjectStore('quickEntries', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory', { keyPath: 'id' });
            // Store da Lixeira (3 dias): keyPath 'tid' = '<storeName>:<id>'
            if (!db.objectStoreNames.contains('trash')) db.createObjectStore('trash', { keyPath: 'tid' });
        };

        // Evita que uma aba/janela antiga ainda aberta trave o upgrade do banco
        // (caso em que o app ficava sem dados e backups pareciam "corrompidos").
        request.onblocked = () => {
            console.warn('[DB] Upgrade bloqueado por outra aba/janela aberta. Nova tentativa em 2s...');
            tentativas++;
            if (tentativas === 1) {
                alert('⚠️ Outra janela/aba deste app está aberta com uma versão antiga e impede a atualização dos dados.\n\n• Feche todas as outras abas/janelas deste app (inclusive a versão instalada na tela inicial)\n• Este app tentará reabrir o banco automaticamente.');
            }
            if (tentativas <= 10) {
                setTimeout(abrir, 2000);
            } else {
                alert('Não foi possível atualizar o banco de dados.\n\nFeche todas as janelas/abas deste app e abra novamente.');
            }
        };

        request.onsuccess = e => {
            db = e.target.result;
            // Libera a conexão atual se outra aba atualizar a versão do banco
            db.onversionchange = () => {
                console.warn('[DB] Conexão fechada: outra aba atualizou a versão do banco.');
                try { db.close(); } catch (err) { console.warn('[DB] Falha ao fechar conexão antiga:', err); }
            };
            if (callback) callback();
        };
    }

    abrir();
}

function dbSave(storeName, item, callback) {
    if (!db) { console.warn('[DB] Ainda não inicializado — dbSave ignorado.'); return; }
    let tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => {
        if (callback) callback();
    };
}

function dbDelete(storeName, id, callback) {
    if (!db) { console.warn('[DB] Ainda não inicializado — dbDelete ignorado.'); return; }
    let tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => {
        if (callback) callback();
    };
}

function dbGetAll(callback) {
    // Guarda essencial: pode ser chamado antes do initDB concluir (ex.: reagendar
    // notificações no boot). Nunca lançar TypeError em cima de 'db' indefinido.
    if (!db) { console.warn('[DB] Ainda não inicializado — dbGetAll ignorado.'); return; }
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
    if (!db) { console.warn('[DB] Ainda não inicializado — dbSaveAll ignorado.'); return; }
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
    if (!db) { console.warn('[DB] Ainda não inicializado — dbTrashPut ignorado.'); return; }
    let tx = db.transaction('trash', 'readwrite');
    tx.objectStore('trash').put(entry);
    tx.oncomplete = () => {
        if (callback) callback();
    };
}

function dbTrashGetAll(callback) {
    if (!db) { console.warn('[DB] Ainda não inicializado — dbTrashGetAll ignorado.'); return; }
    let tx = db.transaction('trash', 'readonly');
    let req = tx.objectStore('trash').getAll();
    tx.oncomplete = () => {
        callback(req.result || []);
    };
}

function dbTrashDelete(tid, callback) {
    if (!db) { console.warn('[DB] Ainda não inicializado — dbTrashDelete ignorado.'); return; }
    let tx = db.transaction('trash', 'readwrite');
    tx.objectStore('trash').delete(tid);
    tx.oncomplete = () => {
        if (callback) callback();
    };
}