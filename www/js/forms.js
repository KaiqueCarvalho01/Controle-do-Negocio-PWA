// ==========================================
// GERENCIAMENTO DE FORMULÁRIOS E CÁLCULOS
// ==========================================

/**
 * Fecha todos os formulários e limpa quaisquer erros visuais ativos.
 */
function closeAllForms() {
    limparTodosErrosFormulario('formService');
    limparTodosErrosFormulario('formExpense');
    document.getElementById('formService').classList.add('hidden');
    document.getElementById('formExpense').classList.add('hidden');
}

/**
 * Abre o formulário de serviço/orçamento (para criação ou edição).
 * @param {Object|null} editItem Objeto de dados para edição ou null para novo.
 */
function openServiceForm(editItem = null) {
    closeAllForms();
    document.getElementById('formService').classList.remove('hidden');
    document.getElementById('serviceItemsList').innerHTML = '';

    if (editItem) {
        document.getElementById('serviceFormTitle').textContent = '✏️ Editar Serviço / Orçamento';
        document.getElementById('sEditId').value = editItem.id;
        document.getElementById('sClient').value = editItem.client || '';
        document.getElementById('sPhone').value = editItem.phone || '';
        document.getElementById('sDesc').value = editItem.desc || '';
        document.getElementById('sNotes').value = editItem.notes || '';
        document.getElementById('sDate').value = editItem.date || today;
        document.getElementById('sTime').value = editItem.time || '';
        document.getElementById('sLabor').value = (editItem.labor !== undefined && editItem.labor !== null && editItem.labor !== '') ? editItem.labor : '';
        document.getElementById('sValue').value = editItem.val || '';
        document.getElementById('sStatus').value = editItem.status || 'Orçamento';
        document.getElementById('sPay').value = editItem.pay || 'Pix';

        if (Array.isArray(editItem.items) && editItem.items.length > 0) {
            editItem.items.forEach(it => addServiceItem(it));
        } else {
            addServiceItem({
                type: 'Serviço/Produto',
                width: '',
                height: '',
                unitPrice: editItem.val || 0,
                qty: editItem.qty || 1,
                subtotal: editItem.val || 0
            });
        }
    } else {
        document.getElementById('serviceFormTitle').textContent = '🛠️ Novo Serviço / Orçamento';
        document.getElementById('sEditId').value = '';
        document.getElementById('sClient').value = '';
        document.getElementById('sPhone').value = '';
        document.getElementById('sDesc').value = '';
        document.getElementById('sNotes').value = '';
        document.getElementById('sDate').value = today;
        document.getElementById('sTime').value = '';
        document.getElementById('sLabor').value = '';
        document.getElementById('sValue').value = '';
        document.getElementById('sStatus').value = 'Orçamento';
        document.getElementById('sPay').value = 'Pix';
        addServiceItem();
    }
    togglePayField();
}

/**
 * Abre o formulário de despesa (para criação ou edição).
 * @param {Object|null} editItem Objeto de dados para edição ou null para nova.
 */
function openExpenseForm(editItem = null, prefillData = null) {
    closeAllForms();
    document.getElementById('formExpense').classList.remove('hidden');

    if (editItem) {
        document.getElementById('expenseFormTitle').textContent = '✏️ Editar Despesa';
        document.getElementById('gEditId').value = editItem.id;
        document.getElementById('gDesc').value = editItem.desc;
        document.getElementById('gDate').value = editItem.date;
        document.getElementById('gValue').value = editItem.val;
        document.getElementById('gCat').value = editItem.cat;
    } else {
        document.getElementById('expenseFormTitle').textContent = '💸 Novo Gasto / Despesa';
        document.getElementById('gEditId').value = '';
        document.getElementById('gDesc').value = prefillData?.desc || '';
        document.getElementById('gDate').value = prefillData?.date || today;
        document.getElementById('gValue').value = prefillData?.val || '';
        if (prefillData?.cat) {
            document.getElementById('gCat').value = prefillData.cat;
        }
    }
}

/**
 * Exibe ou oculta o select da forma de pagamento conforme o status 'Pago'.
 */
function togglePayField() {
    const status = document.getElementById('sStatus').value;
    document.getElementById('sPay').classList.toggle('hidden', status !== 'Pago');
}

/**
 * Salva um serviço/orçamento no IndexedDB.
 * O único campo estritamente obrigatório é o cliente (valores/itens são opcionais).
 */
function saveService() {
    limparTodosErrosFormulario('formService');

    const clientInput = document.getElementById('sClient');
    const valueInput = document.getElementById('sValue');
    const descInput = document.getElementById('sDesc');

    const editId = document.getElementById('sEditId').value;
    const client = clientInput.value.trim();
    const phone = document.getElementById('sPhone').value.trim();
    const desc = descInput.value.trim();
    const notes = document.getElementById('sNotes').value.trim();
    const val = parseFloat(valueInput.value) || 0;
    const status = document.getElementById('sStatus').value;
    const pay = status === 'Pago' ? document.getElementById('sPay').value : '';
    const selectedDate = document.getElementById('sDate').value || today;
    const selectedTime = document.getElementById('sTime').value || '';

    // Coleta itens dinâmicos da lista
    let items = [];
    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const type = row.querySelector('.item-type').value.trim();
        const width = row.querySelector('.item-width').value;
        const height = row.querySelector('.item-height').value;
        const mUnit = row.querySelector('.item-munit').value;
        const unitPrice = parseFloat(row.querySelector('.item-price').value) || 0;
        const qty = parseFloat(row.querySelector('.item-qty').value) || 1;
        const subtotal = parseFloat(row.querySelector('.item-subtotal').value) || (unitPrice * qty);

        if (type || subtotal > 0) {
            items.push({ type, width, height, mUnit, unitPrice, qty, subtotal });
        }
    });

    // Validação: Somente o cliente é obrigatório
    if (!client) {
        destacarCampoErro(clientInput, 'Informe o nome do cliente.');
        clientInput.focus();
        return;
    }

    const laborInput = document.getElementById('sLabor');
    const labor = parseFloat(laborInput ? laborInput.value : 0) || 0;

    let existing = editId ? window.appDataRaw.services.find(s => s.id === parseInt(editId)) : null;
    let item = {
        id: editId ? parseInt(editId) : Date.now(),
        client,
        phone,
        desc,
        notes,
        items,
        labor,
        date: selectedDate,
        time: selectedTime,
        val,
        status,
        pay,
        quoteDate: existing?.quoteDate || (status === 'Orçamento' ? selectedDate : ''),
        scheduledDate: existing?.scheduledDate || (status === 'Agendado' ? selectedDate : ''),
        doneDate: existing?.doneDate || (status === 'Realizado' ? selectedDate : ''),
        paidDate: existing?.paidDate || (status === 'Pago' ? selectedDate : '')
    };

    dbSave('services', item, () => {
        if (typeof agendarNotificacaoServico === 'function') {
            agendarNotificacaoServico(item);
        }

        // Se o serviço estiver agendado (ou tiver data/hora definidas) e o plugin estiver disponível, oferece sincronização com a agenda
        if (status === 'Agendado' && typeof adicionarServicoNaAgenda === 'function' && window.plugins && window.plugins.calendar) {
            if (confirm('Deseja abrir a agenda do celular para salvar este agendamento?')) {
                adicionarServicoNaAgenda(item);
            }
        }

        // Debita ou estorna estoque conforme o status
        if (status === 'Realizado' || status === 'Pago') {
            if (typeof debitarEstoqueDoServico === 'function') {
                if (existing && existing.stockDebited && typeof estornarEstoqueDoServico === 'function') {
                    estornarEstoqueDoServico(existing);
                }
                debitarEstoqueDoServico(item);
            }
        } else if (existing && existing.stockDebited && (status === 'Orçamento' || status === 'Agendado')) {
            if (typeof estornarEstoqueDoServico === 'function') {
                estornarEstoqueDoServico(existing);
            }
        }

        closeAllForms();
        carregarDados();
    });
}

/**
 * Salva uma despesa no IndexedDB com validação visual de descrição e valor.
 */
function saveExpense() {
    limparTodosErrosFormulario('formExpense');

    const descInput = document.getElementById('gDesc');
    const valInput = document.getElementById('gValue');

    const editId = document.getElementById('gEditId').value;
    const desc = descInput.value.trim();
    const val = parseFloat(valInput.value);
    const date = document.getElementById('gDate').value || today;
    const cat = document.getElementById('gCat').value;

    let temErro = false;

    if (!desc) {
        destacarCampoErro(descInput, 'Informe a descrição do gasto.');
        descInput.focus();
        temErro = true;
    }

    if (isNaN(val) || val <= 0) {
        destacarCampoErro(valInput, 'Informe um valor válido maior que zero.');
        if (!temErro) {
            valInput.focus();
            temErro = true;
        }
    }

    if (temErro) return;

    const item = {
        id: editId ? parseInt(editId) : Date.now(),
        desc,
        date,
        val,
        cat
    };

    dbSave('expenses', item, () => {
        closeAllForms();
        carregarDados();
    });
}
// ==========================================
// 6. ITENS DINÂMICOS E CÁLCULO DE MEDIDAS
// ==========================================

/**
 * Adiciona uma linha de item/medida no formulário de serviços.
 * @param {Object|null} data Dados preenchidos ou null para nova linha.
 */
function addServiceItem(data = null) {
    const container = document.getElementById('serviceItemsList');
    const itemId = Date.now() + Math.floor(Math.random() * 1000);

    const typeVal = data ? (data.type || '') : '';
    const widthVal = data ? (data.width !== undefined ? data.width : '') : '';
    const heightVal = data ? (data.height !== undefined ? data.height : '') : '';
    const mUnitVal = data ? (data.mUnit || 'm') : 'm';
    const unitPriceVal = data ? (data.unitPrice !== undefined ? data.unitPrice : '') : '';
    const qtyVal = data ? (data.qty !== undefined ? data.qty : 1) : 1;
    const subtotalVal = data ? (data.subtotal !== undefined ? data.subtotal : 0) : 0;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.id = `item-row-${itemId}`;
    row.innerHTML = `
        <div class="item-row-top">
            <input class="item-type" list="inventoryDatalist" placeholder="Item / Produto ou Material (ex: Varal de Teto)" value="${typeVal}" oninput="sugerirPrecoItemEstoque(this)">
        </div>
        <div class="item-row-calc">
            <div class="field-group">
                <label>Largura</label>
                <input type="number" step="0.01" class="item-width" placeholder="0.00" value="${widthVal}" oninput="recalcularTotaisServico(false)">
            </div>
            <div class="field-group">
                <label>Comp / Alt</label>
                <input type="number" step="0.01" class="item-height" placeholder="0.00" value="${heightVal}" oninput="recalcularTotaisServico(false)">
            </div>
            <div class="field-group">
                <label>Unidade</label>
                <select class="item-munit" onchange="recalcularTotaisServico(false)">
                    <option value="m" ${mUnitVal === 'm' ? 'selected' : ''}>m</option>
                    <option value="mm" ${mUnitVal === 'mm' ? 'selected' : ''}>mm</option>
                    <option value="cm" ${mUnitVal === 'cm' ? 'selected' : ''}>cm</option>
                </select>
            </div>
            <div class="field-group">
                <label>Preço Un. (R$)</label>
                <input type="number" step="0.01" class="item-price" placeholder="0.00" value="${unitPriceVal}" oninput="recalcularTotaisServico(false)">
            </div>
            <div class="field-group">
                <label>Qtd</label>
                <input type="number" step="0.01" min="0.01" class="item-qty" placeholder="1" value="${qtyVal}" oninput="recalcularTotaisServico(false)">
            </div>
            <div class="field-group">
                <label>Subtotal (R$)</label>
                <input type="number" step="0.01" class="item-subtotal" placeholder="0.00" value="${subtotalVal ? subtotalVal.toFixed(2) : ''}" oninput="recalcularTotaisServico(true)">
            </div>
            <div class="field-group btn-container">
                <button type="button" class="btn-remove-item" onclick="removeServiceItem('${itemId}')">🗑️</button>
            </div>
        </div>
    `;

    container.appendChild(row);
    recalcularTotaisServico(false);
}

/**
 * Remove uma linha de item dinâmico do formulário.
 * @param {string} itemId ID da linha a ser removida.
 */
function removeServiceItem(itemId) {
    const row = document.getElementById(`item-row-${itemId}`);
    if (row) {
        row.remove();
        recalcularTotaisServico();
    }
}

/**
 * Recalcula o valor total do formulário de serviço com base nos itens cadastrados.
 * @param {boolean} isSubtotalManual Indica se o usuário digitou diretamente no subtotal.
 */
function recalcularTotaisServico(isSubtotalManual = false) {
    const rows = document.querySelectorAll('.item-row');
    let totalGeral = 0;
    let teveSubtotalCalculado = false;

    rows.forEach(row => {
        const widthInput = row.querySelector('.item-width');
        const heightInput = row.querySelector('.item-height');
        const unitSelect = row.querySelector('.item-munit');
        const priceInput = row.querySelector('.item-price');
        const qtyInput = row.querySelector('.item-qty');
        const subtotalInput = row.querySelector('.item-subtotal');

        const width = parseFloat(widthInput?.value) || 0;
        const height = parseFloat(heightInput?.value) || 0;
        const mUnit = unitSelect?.value || 'm';
        const price = parseFloat(priceInput?.value) || 0;
        const qty = parseFloat(qtyInput?.value) || 1;

        if (!isSubtotalManual && price > 0) {
            let fatorMedida = 1;
            if (width > 0 && height > 0) {
                let wM = width;
                let hM = height;
                if (mUnit === 'cm') { wM /= 100; hM /= 100; }
                else if (mUnit === 'mm') { wM /= 1000; hM /= 1000; }

                // Verifica se o item no estoque é cadastrado em m²
                let isArea = false;
                const typeInput = row.querySelector('.item-type');
                const itemName = typeInput ? typeInput.value.trim().toLowerCase() : '';
                if (itemName) {
                    const inventory = window.appDataRaw?.inventory || [];
                    const match = inventory.find(inv => {
                        const fullName = `${inv.name}${inv.specs ? ' (' + inv.specs + ')' : ''}`.toLowerCase();
                        return inv.name.toLowerCase() === itemName || fullName === itemName;
                    });
                    if (match && match.unit === 'm²') isArea = true;
                }

                fatorMedida = isArea ? (wM * hM) : (wM + hM);
            } else if (width > 0 || height > 0) {
                // Cálculo linear (m)
                let dim = width > 0 ? width : height;
                if (mUnit === 'cm') dim /= 100;
                else if (mUnit === 'mm') dim /= 1000;
                fatorMedida = dim;
            }

            const subtotal = price * qty * fatorMedida;
            subtotalInput.value = subtotal.toFixed(2);
            totalGeral += subtotal;
            teveSubtotalCalculado = true;
        } else {
            const subtotalManual = parseFloat(subtotalInput?.value) || 0;
            if (subtotalManual > 0) {
                totalGeral += subtotalManual;
                teveSubtotalCalculado = true;
            }
        }
    });

    const laborInput = document.getElementById('sLabor');
    const labor = parseFloat(laborInput ? laborInput.value : 0) || 0;
    if (labor > 0) {
        totalGeral += labor;
        teveSubtotalCalculado = true;
    }

    if (teveSubtotalCalculado) {
        document.getElementById('sValue').value = totalGeral.toFixed(2);
    }
}

// ==========================================
// 7. SUGESTÃO E AUTOCOMPLETAR DE CLIENTES
// ==========================================

/**
 * Popula a tag <datalist id="clientList"> com os nomes únicos de clientes existentes no banco.
 */
function popularDatalistClientes() {
    const datalist = document.getElementById('clientList');
    if (!datalist || !window.appDataRaw || !Array.isArray(window.appDataRaw.services)) return;

    const nomesUnicos = [...new Set(
        window.appDataRaw.services
            .map(s => s.client ? s.client.trim() : '')
            .filter(nome => nome.length > 0)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    datalist.innerHTML = nomesUnicos.map(nome => `<option value="${nome}">`).join('');
}

/**
 * Ao digitar no campo de cliente, se encontrar um cliente correspondente e o campo de telefone estiver vazio, preenche o telefone automaticamente.
 */
function sugerirTelefoneCliente() {
    const clientInput = document.getElementById('sClient');
    const phoneInput = document.getElementById('sPhone');
    if (!clientInput || !phoneInput || phoneInput.value.trim() !== '') return;

    const typedName = clientInput.value.trim().toLowerCase();
    if (!typedName || !window.appDataRaw || !Array.isArray(window.appDataRaw.services)) return;

    const match = window.appDataRaw.services.find(s => s.client && s.client.trim().toLowerCase() === typedName && s.phone);
    if (match && match.phone) {
        phoneInput.value = match.phone;
    }
}

// ==========================================
// 8. INTEGRAÇÃO COM ESTOQUE DE MATERIAIS
// ==========================================

/**
 * Popula a tag <datalist id="inventoryDatalist"> com os itens do estoque.
 */
function popularDatalistEstoque() {
    const datalist = document.getElementById('inventoryDatalist');
    if (!datalist || !window.appDataRaw || !Array.isArray(window.appDataRaw.inventory)) return;

    datalist.innerHTML = window.appDataRaw.inventory.map(item => {
        const extra = item.specs ? ` (${item.specs})` : '';
        return `<option value="${item.name}${extra}">`;
    }).join('');
}

/**
 * Ao selecionar ou digitar um item de estoque na linha de serviço, preenche o preço de venda se disponível.
 */
function sugerirPrecoItemEstoque(inputElement) {
    if (!inputElement || !window.appDataRaw || !Array.isArray(window.appDataRaw.inventory)) return;
    const typed = inputElement.value.trim().toLowerCase();
    if (!typed) return;

    const match = window.appDataRaw.inventory.find(it => {
        const fullName = `${it.name}${it.specs ? ' (' + it.specs + ')' : ''}`.toLowerCase();
        return it.name.toLowerCase() === typed || fullName === typed;
    });

    if (match) {
        const row = inputElement.closest('.item-row');
        if (row) {
            const priceInput = row.querySelector('.item-price');
            const unitSelect = row.querySelector('.item-munit');
            if (priceInput && (!priceInput.value || parseFloat(priceInput.value) === 0)) {
                if (match.salePrice > 0) {
                    priceInput.value = match.salePrice;
                } else if (match.costPrice > 0) {
                    priceInput.value = match.costPrice;
                }
                recalcularTotaisServico(false);
            }
        }
    }
}


