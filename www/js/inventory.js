// ==========================================
// MÓDULO DE CONTROLE DE ESTOQUE & MATERIAIS
// ==========================================

let inventorySearchQuery = '';
let inventoryFilterCat = 'all';

/**
 * Abre o modal de gerenciamento de estoque.
 */
function openInventoryModal() {
    if (typeof carregarDados === 'function') {
        carregarDados(() => renderInventoryList());
    } else {
        renderInventoryList();
    }
    const modal = document.getElementById('modalInventory');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Fecha o modal de estoque.
 */
function closeInventoryModal() {
    const modal = document.getElementById('modalInventory');
    if (modal) modal.classList.add('hidden');
}

/**
 * Atualiza os textos dos labels do modal de estoque de acordo com a unidade selecionada.
 * @param {string} unit Unidade selecionada (ex: 'm', 'un', 'kg').
 */
function updateInventoryUnitLabels(unit = 'un') {
    const lblQty = document.getElementById('lblInvQty');
    const lblMin = document.getElementById('lblInvMinQty');
    const lblCost = document.getElementById('lblInvCost');
    const lblSale = document.getElementById('lblInvSale');

    if (lblQty) lblQty.textContent = `Quantidade em Estoque (${unit}):`;
    if (lblMin) lblMin.textContent = `Estoque Mínimo (${unit}):`;
    if (lblCost) lblCost.textContent = `Preço de Custo (por ${unit}):`;
    if (lblSale) lblSale.textContent = `Preço de Venda (por ${unit}):`;
}

/**
 * Abre o formulário de cadastro/edição de item de estoque.
 */
function openInventoryForm(item = null) {
    const unit = item ? (item.unit || 'un') : 'un';
    document.getElementById('invItemId').value = item ? item.id : '';
    document.getElementById('invItemName').value = item ? item.name : '';
    document.getElementById('invItemCategory').value = item ? (item.category || '') : '';
    document.getElementById('invItemSpecs').value = item ? (item.specs || '') : '';
    document.getElementById('invItemQty').value = item ? (item.qty !== undefined ? item.qty : '') : '';
    document.getElementById('invItemUnit').value = unit;
    document.getElementById('invItemMinQty').value = item ? (item.minQty || '') : '';
    document.getElementById('invItemCost').value = item ? (item.costPrice || '') : '';
    document.getElementById('invItemSale').value = item ? (item.salePrice || '') : '';

    updateInventoryUnitLabels(unit);

    const titleEl = document.getElementById('modalInventoryFormTitle');
    if (titleEl) {
        titleEl.textContent = item ? '✏️ Editar Item do Estoque' : '＋ Novo Item no Estoque';
    }

    const formModal = document.getElementById('modalInventoryForm');
    if (formModal) formModal.classList.remove('hidden');
}

/**
 * Fecha o formulário de cadastro de item.
 */
function closeInventoryForm() {
    const formModal = document.getElementById('modalInventoryForm');
    if (formModal) formModal.classList.add('hidden');
}

/**
 * Salva um item no estoque (apenas o nome é obrigatório).
 */
function saveInventoryItem() {
    const name = document.getElementById('invItemName').value.trim();
    if (!name) {
        alert('Por favor, informe ao menos o Nome do item.');
        document.getElementById('invItemName').focus();
        return;
    }

    const idStr = document.getElementById('invItemId').value;
    const id = idStr ? parseInt(idStr) : Date.now();

    const category = document.getElementById('invItemCategory').value.trim();
    const specs = document.getElementById('invItemSpecs').value.trim();
    const qty = parseFloat(document.getElementById('invItemQty').value) || 0;
    const unit = document.getElementById('invItemUnit').value || 'un';
    const minQty = parseFloat(document.getElementById('invItemMinQty').value) || 0;
    const costPrice = parseFloat(document.getElementById('invItemCost').value) || 0;
    const salePrice = parseFloat(document.getElementById('invItemSale').value) || 0;

    const item = {
        id: id,
        name: name,
        category: category,
        specs: specs,
        qty: qty,
        unit: unit,
        minQty: minQty,
        costPrice: costPrice,
        salePrice: salePrice,
        updatedAt: new Date().toISOString()
    };

    dbSave('inventory', item, () => {
        closeInventoryForm();
        if (typeof carregarDados === 'function') {
            carregarDados(() => {
                renderInventoryList();
            });
        } else {
            renderInventoryList();
        }
    });
}

/**
 * Exclui um item do estoque com confirmação.
 */
function deleteInventoryItem(id, name) {
    if (!confirm(`Deseja realmente excluir o item "${name}" do estoque?`)) {
        return;
    }

    dbDelete('inventory', id, () => {
        if (typeof carregarDados === 'function') {
            carregarDados(() => {
                renderInventoryList();
            });
        } else {
            renderInventoryList();
        }
    });
}

/**
 * Ajusta a quantidade em estoque rapidamente (+ ou -).
 */
function adjustInventoryQty(id, delta) {
    const items = window.appDataRaw?.inventory || [];
    const item = items.find(x => x.id === id);
    if (!item) return;

    item.qty = Math.max(0, parseFloat(((item.qty || 0) + delta).toFixed(4)));
    item.updatedAt = new Date().toISOString();

    dbSave('inventory', item, () => {
        if (typeof carregarDados === 'function') {
            carregarDados(() => {
                renderInventoryList();
            });
        } else {
            renderInventoryList();
        }
    });
}

/**
 * Renderiza a lista de estoque com busca, filtros de categoria e alertas.
 */
function renderInventoryList() {
    const items = window.appDataRaw?.inventory || [];
    const container = document.getElementById('inventoryListContainer');
    const summaryContainer = document.getElementById('inventorySummaryHeader');
    if (!container) return;

    // Categorias únicas para o select
    const catSelect = document.getElementById('inventoryCatFilter');
    if (catSelect) {
        const currentCatVal = catSelect.value || 'all';
        const categories = Array.from(new Set(items.map(x => x.category).filter(Boolean))).sort();
        catSelect.innerHTML = `<option value="all">Todas Categorias</option>` +
            categories.map(c => `<option value="${c}">${c}</option>`).join('') +
            `<option value="__low">⚠️ Apenas Estoque Baixo</option>`;
        catSelect.value = currentCatVal;
    }

    const search = (document.getElementById('inventorySearchInput')?.value || '').toLowerCase().trim();
    const filterCat = catSelect ? catSelect.value : 'all';

    let filtered = items.slice();

    if (search) {
        filtered = filtered.filter(x => 
            (x.name && x.name.toLowerCase().includes(search)) ||
            (x.category && x.category.toLowerCase().includes(search)) ||
            (x.specs && x.specs.toLowerCase().includes(search))
        );
    }

    if (filterCat === '__low') {
        filtered = filtered.filter(x => x.minQty > 0 && x.qty <= x.minQty);
    } else if (filterCat !== 'all') {
        filtered = filtered.filter(x => x.category === filterCat);
    }

    // Totais para o resumo
    const totalItens = items.length;
    const totalEstoqueBaixo = items.filter(x => x.minQty > 0 && x.qty <= x.minQty).length;
    const valorTotalEstoqueCusto = items.reduce((acc, x) => acc + ((x.qty || 0) * (x.costPrice || 0)), 0);

    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <div class="inv-stat-card" style="flex: 1;">
                    <small>Itens Cadastrados</small>
                    <b>${totalItens}</b>
                </div>
                <div class="inv-stat-card" style="flex: 1; ${totalEstoqueBaixo > 0 ? 'border-color: #ff9800;' : ''}">
                    <small>Estoque Baixo</small>
                    <b style="color: ${totalEstoqueBaixo > 0 ? '#e65100' : '#2e7d32'};">${totalEstoqueBaixo} ${totalEstoqueBaixo > 0 ? '⚠️' : '✅'}</b>
                </div>
                <div class="inv-stat-card" style="flex: 1.3;">
                    <small>Patrimônio em Peças</small>
                    <b class="value-maskable" style="color: #1976d2;">${money(valorTotalEstoqueCusto)}</b>
                </div>
            </div>
        `;
    }

    if (!filtered.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px 16px; color: #777;">
                <span style="font-size: 32px; display: block; margin-bottom: 6px;">📦</span>
                Nenhum item encontrado no estoque.<br>
                <button type="button" class="primary" style="margin-top: 10px; font-size: 12px; padding: 8px 14px; border-radius: 6px;" onclick="openInventoryForm()">＋ Cadastrar Primeiro Item</button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const isLow = item.minQty > 0 && item.qty <= item.minQty;
        const specsText = item.specs ? `<div style="font-size: 11.5px; color: #666; margin-top: 2px;">🏷️ ${item.specs}</div>` : '';
        const catBadge = item.category ? `<span class="inv-badge-cat">${item.category}</span>` : '';
        const lowBadge = isLow ? `<span class="inv-badge-low">⚠️ Estoque Baixo (${item.qty}/${item.minQty})</span>` : '';

        return `
            <div class="inv-item-card ${isLow ? 'inv-card-low' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <b style="font-size: 14px; color: #222;">${item.name}</b>
                            ${catBadge}
                            ${lowBadge}
                        </div>
                        ${specsText}
                        <div style="font-size: 11.5px; color: #555; margin-top: 4px;">
                            ${item.costPrice > 0 ? `Custo: <b class="value-maskable">${money(item.costPrice)}</b> • ` : ''}
                            ${item.salePrice > 0 ? `Preço Venda: <b class="value-maskable" style="color: #2e7d32;">${money(item.salePrice)}</b>` : ''}
                        </div>
                    </div>

                    <!-- Controle de Quantidade -->
                    <div class="inv-qty-box">
                        <span style="font-size: 10px; color: #777;">Saldo</span>
                        <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                            <button type="button" class="btn-qty-mini" onclick="adjustInventoryQty(${item.id}, -1)">-</button>
                            <b style="font-size: 15px; min-width: 32px; text-align: center; color: ${isLow ? '#d32f2f' : '#1976d2'};">
                                ${item.qty} <small style="font-size: 10px; color: #666;">${item.unit || 'un'}</small>
                            </b>
                            <button type="button" class="btn-qty-mini" onclick="adjustInventoryQty(${item.id}, 1)">+</button>
                        </div>
                    </div>
                </div>

                <div class="inv-item-actions">
                    <button type="button" class="btn-mini btn-edit" onclick='openInventoryForm(${JSON.stringify(item)})'>✏️ Editar</button>
                    <button type="button" class="btn-mini btn-delete" onclick="deleteInventoryItem(${item.id}, '${item.name}')">🗑️ Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Calcula a quantidade exata consumida do estoque considerando medidas (largura/altura) e quantidade.
 * @param {Object} sItem Item da lista do serviço.
 * @param {Object} invItem Item correspondente no estoque.
 * @returns {number} Quantidade consumida na unidade do estoque.
 */
function calcularConsumoItemEstoque(sItem, invItem) {
    const sQty = parseFloat(sItem.qty) || 1;
    const width = parseFloat(sItem.width) || 0;
    const height = parseFloat(sItem.height) || 0;
    const mUnit = sItem.mUnit || 'm';

    // Se o item de estoque for medido em metros lineares (m, cm, mm) ou m²
    if (invItem.unit === 'm' || invItem.unit === 'm²' || invItem.unit === 'cm' || invItem.unit === 'mm') {
        if (width > 0 && height > 0) {
            let wM = width;
            let hM = height;
            if (mUnit === 'cm') { wM /= 100; hM /= 100; }
            else if (mUnit === 'mm') { wM /= 1000; hM /= 1000; }

            if (invItem.unit === 'm²') {
                return parseFloat((wM * hM * sQty).toFixed(4));
            } else {
                // Item linear (madeira, perfil, tubo, etc.): soma as medidas lineares informadas
                const somaLinear = wM + hM;
                if (invItem.unit === 'cm') return parseFloat(((somaLinear * 100) * sQty).toFixed(4));
                if (invItem.unit === 'mm') return parseFloat(((somaLinear * 1000) * sQty).toFixed(4));
                return parseFloat((somaLinear * sQty).toFixed(4));
            }
        } else if (width > 0 || height > 0) {
            let dim = width > 0 ? width : height;
            if (mUnit === 'cm' && invItem.unit === 'm') dim /= 100;
            else if (mUnit === 'mm' && invItem.unit === 'm') dim /= 1000;
            else if (mUnit === 'm' && invItem.unit === 'cm') dim *= 100;
            else if (mUnit === 'm' && invItem.unit === 'mm') dim *= 1000;
            return parseFloat((dim * sQty).toFixed(4));
        }
    }

    // Se não houver medidas lineares ou para produtos unitários, utiliza o campo Qtd direto (que aceita decimais)
    return parseFloat(sQty.toFixed(4));
}

/**
 * Debita automaticamente os itens do estoque usados em um serviço quando ele é marcado como Realizado ou Pago.
 */
function debitarEstoqueDoServico(service) {
    if (!service || service.stockDebited) return;
    if (!Array.isArray(service.items) || service.items.length === 0) return;

    const inventory = window.appDataRaw?.inventory || [];
    if (inventory.length === 0) return;

    let debitedAny = false;

    service.items.forEach(sItem => {
        if (!sItem.type) return;
        const sType = sItem.type.trim().toLowerCase();

        const match = inventory.find(inv => {
            const fullName = `${inv.name}${inv.specs ? ' (' + inv.specs + ')' : ''}`.toLowerCase();
            return inv.name.toLowerCase() === sType || fullName === sType;
        });

        if (match) {
            const consumo = calcularConsumoItemEstoque(sItem, match);
            match.qty = Math.max(0, parseFloat(((match.qty || 0) - consumo).toFixed(4)));
            match.updatedAt = new Date().toISOString();
            dbSave('inventory', match);
            debitedAny = true;
        }
    });

    if (debitedAny) {
        service.stockDebited = true;
        dbSave('services', service);
    }
}

/**
 * Estorna os itens ao estoque se um serviço realizado/pago for excluído ou revertido para orçamento/agendado.
 */
function estornarEstoqueDoServico(service) {
    if (!service || !service.stockDebited) return;
    if (!Array.isArray(service.items) || service.items.length === 0) return;

    const inventory = window.appDataRaw?.inventory || [];
    if (inventory.length === 0) return;

    service.items.forEach(sItem => {
        if (!sItem.type) return;
        const sType = sItem.type.trim().toLowerCase();

        const match = inventory.find(inv => {
            const fullName = `${inv.name}${inv.specs ? ' (' + inv.specs + ')' : ''}`.toLowerCase();
            return inv.name.toLowerCase() === sType || fullName === sType;
        });

        if (match) {
            const consumo = calcularConsumoItemEstoque(sItem, match);
            match.qty = parseFloat(((match.qty || 0) + consumo).toFixed(4));
            match.updatedAt = new Date().toISOString();
            dbSave('inventory', match);
        }
    });

    service.stockDebited = false;
    dbSave('services', service);
}

