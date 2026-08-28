// ==========================================
// LIXEIRA (RETENÇÃO DE 3 DIAS) & RECUPERAÇÃO
// ==========================================

// Tempo de retenção padrão: 3 dias (em milissegundos)
const TRASH_TTL_MS = 3 * 24 * 60 * 60 * 1000;

// Metadados de exibição por tipo de registro
const TRASH_META = {
    services:  { icon: '🛠️', label: 'Serviço/Orçamento' },
    expenses:  { icon: '💸', label: 'Despesa' },
    inventory: { icon: '📦', label: 'Item de Estoque' },
    notes:     { icon: '📝', label: 'Nota' }
};

/**
 * Move uma cópia fiel do registro para a lixeira.
 * O envelope guarda o estado atual do objeto (que já pode ter passado por
 * efeitos destrutivos, como o estorno de estoque), então a restauração é
 * apenas o re-save — idêntico ao comportamento do desfazer via toast.
 * @param {string} storeName Nome da store original ('services', 'expenses', 'inventory' ou 'notes').
 * @param {Object} record Registro original.
 */
function moverParaLixeira(storeName, record) {
    if (!storeName || !record || record.id == null) return;
    if (typeof dbTrashPut !== 'function') return;

    try {
        const envelope = {
            tid: storeName + ':' + record.id,
            storeName: storeName,
            id: record.id,
            deletedAt: Date.now(),
            data: JSON.parse(JSON.stringify(record))
        };
        dbTrashPut(envelope);
    } catch (e) {
        console.error('Erro ao mover registro para a lixeira:', e);
    }
}

/**
 * Remove um envelope da lixeira (em casos de desfazer imediato ou exclusão definitiva).
 * @param {string} tid Chave do envelope ('storeName:id').
 * @param {Function} [callback] Opcional, executado após a remoção.
 */
function removerItemLixeira(tid, callback) {
    if (!tid || typeof dbTrashDelete !== 'function') {
        if (callback) callback();
        return;
    }
    dbTrashDelete(tid, callback);
}

/**
 * Restaura um registro da lixeira de volta para o seu local original.
 * Para serviços, re-agenda a notificação; para notas, re-agenda o lembrete.
 * @param {string} tid Chave do envelope.
 */
function restaurarItemLixeira(tid) {
    dbTrashGetAll(entries => {
        const entry = entries.find(e => e.tid === tid);
        if (!entry || !entry.data) {
            alert('Este item não está mais na lixeira (pode ter expirado o prazo de 3 dias).');
            return;
        }

        const data = entry.data;

        // Notas vivem no localStorage (única store fora do IndexedDB)
        if (entry.storeName === 'notes') {
            const notes = getNotes();
            if (!notes.some(n => n.id === data.id)) notes.push(data);
            setNotes(notes);
            if (typeof agendarLembreteNota === 'function') agendarLembreteNota(data);
        } else {
            dbSave(entry.storeName, data);
        }

        removerItemLixeira(entry.tid, () => {
            if (entry.storeName === 'services' && typeof agendarNotificacaoServico === 'function') {
                agendarNotificacaoServico(data);
            }
            carregarDados();
            renderTrashList();
        });
    });
}

/**
 * Exclui DEFINITIVAMENTE um item da lixeira (não é possível desfazer).
 * Os efeitos destrutivos (ex.: estorno de estoque) já foram aplicados no
 * momento da exclusão original, portanto aqui basta descartar o envelope.
 * @param {string} tid Chave do envelope.
 */
function excluirDefinitivamenteItemLixeira(tid) {
    dbTrashGetAll(entries => {
        const entry = entries.find(e => e.tid === tid);
        const desc = entry ? trashDescricao(entry) : 'este item';
        if (!confirm(`Excluir DEFINITIVAMENTE "${desc}"?\n\nEste item será apagado e não poderá mais ser recuperado.`)) {
            return;
        }
        removerItemLixeira(tid, () => renderTrashList());
    });
}

/**
 * Esvazia toda a lixeira (após confirmação dupla).
 */
function esvaziarLixeira() {
    dbTrashGetAll(entries => {
        if (!entries.length) {
            alert('A lixeira já está vazia.');
            return;
        }
        if (!confirm(`Esvaziar a lixeira?\n\n${entries.length} item(ns) serão apagados DEFINITIVAMENTE e não poderão ser recuperados.`)) {
            return;
        }
        let restantes = entries.length;
        if (restantes === 0) return;
        entries.forEach(entry => {
            removerItemLixeira(entry.tid, () => {
                restantes--;
                if (restantes === 0) renderTrashList();
            });
        });
    });
}

/**
 * Remove automaticamente (purga) os itens que excederam o prazo de 3 dias.
 * Chamado na inicialização e ao abrir/renderizar a lixeira.
 * @param {Function} [callback] Opcional, executado ao concluir.
 */
function limparLixeiraVencida(callback) {
    if (typeof dbTrashGetAll !== 'function' || typeof dbTrashDelete !== 'function') {
        if (callback) callback();
        return;
    }
    dbTrashGetAll(entries => {
        const agora = Date.now();
        let restantes = 0;
        entries.forEach(entry => {
            if (entry.deletedAt && agora - entry.deletedAt >= TRASH_TTL_MS) restantes++;
        });
        if (restantes === 0) {
            if (callback) callback();
            return;
        }
        entries.filter(entry => entry.deletedAt && agora - entry.deletedAt >= TRASH_TTL_MS).forEach(entry => {
            dbTrashDelete(entry.tid);
        });
        if (callback) callback();
    });
}

// ==========================================
// UI — ABRIR/FECHAR/RENDERIZAR A LIXEIRA
// ==========================================

function openTrashModal() {
    const modal = document.getElementById('modalTrash');
    if (modal) {
        modal.classList.remove('hidden');
        renderTrashList();
    }
}

function closeTrashModal() {
    const modal = document.getElementById('modalTrash');
    if (modal) modal.classList.add('hidden');
}

/**
 * Gera a descrição exibida para um item da lixeira.
 * @param {Object} entry Envelope da lixeira.
 * @returns {string} Texto amigável do item.
 */
function trashDescricao(entry) {
    const d = entry.data || {};
    switch (entry.storeName) {
        case 'services':
            return d.client || 'Serviço';
        case 'expenses':
            return d.desc || 'Despesa';
        case 'inventory':
            return d.name || 'Item de estoque';
        case 'notes':
            return d.text || 'Nota';
        default:
            return 'Item';
    }
}

/**
 * Calcular quantos dias ainda restam antes do item ser purgado da lixeira.
 * @param {number} deletedAt Timestamp da exclusão (ms).
 * @returns {number} Dias restantes (mínimo 1).
 */
function trashDiasRestantes(deletedAt) {
    const restante = TRASH_TTL_MS - (Date.now() - deletedAt);
    return Math.max(1, Math.ceil(restante / (24 * 60 * 60 * 1000)));
}

/**
 * Renderiza a lista de itens na lixeira.
 */
function renderTrashList() {
    const container = document.getElementById('trashListContainer');
    if (!container) return;

    // Sempre purga vencidos primeiro para a tela refletir a retenção real de 3 dias
    limparLixeiraVencida(() => {
        dbTrashGetAll(entries => {
            if (!entries.length) {
                container.innerHTML = '<div style="text-align:center; padding:32px 16px; color:#777;"><span style="font-size:32px; display:block; margin-bottom:6px;">🗃️</span>A lixeira está vazia.</div>';
                return;
            }

            // Mais recentes primeiro
            entries.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

            container.innerHTML = entries.map(entry => {
                const meta = TRASH_META[entry.storeName] || { icon: '🗂️', label: entry.storeName };
                const d = entry.data || {};
                const tipoBadge = `<span style="font-size:10px; background:#e3f2fd; color:#1565c0; padding:2px 8px; border-radius:10px;">${meta.icon} ${meta.label}</span>`;
                const dataExclusao = typeof formatDateToBR === 'function' && d && entry.deletedAt
                    ? formatDateToBR(new Date(entry.deletedAt).toISOString().slice(0, 10))
                    : '';
                const expireInfo = `🗓️ Excluído em ${dataExclusao || '—'} • ⏳ Expira em <b>${trashDiasRestantes(entry.deletedAt)} dia(s)</b>`;

                return `
                    <div class="item" style="margin-bottom:8px;">
                        <div style="display:flex; align-items:flex-start; gap:10px;">
                            <div style="flex:1; min-width:0;">
                                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                    ${tipoBadge}
                                    <b style="font-size:13px; color:#1e293b;">${trashDescricao(entry)}</b>
                                </div>
                                <div class="small" style="color:#666; margin-top:4px;">${expireInfo}</div>
                            </div>
                            <div style="display:flex; gap:6px; flex-shrink:0;">
                                <button type="button" class="primary" style="font-size:11px; padding:6px 10px;" onclick='restaurarItemLixeira("${entry.tid}")'>↩️ Restaurar</button>
                                <button type="button" class="danger" style="font-size:11px; padding:6px 10px;" onclick='excluirDefinitivamenteItemLixeira("${entry.tid}")'>✕</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        });
    });
}