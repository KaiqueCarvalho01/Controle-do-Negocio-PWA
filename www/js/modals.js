// ==========================================
// MODAIS SECUNDÁRIOS
// ==========================================

/**
 * Abre o modal para avançar o status do serviço e registrar a data correspondente.
 * @param {number} id ID do serviço.
 * @param {string} currentStatus Status atual.
 */
function openStatusModal(id, currentStatus) {
    const modal = document.getElementById('modalStatus');
    const title = document.getElementById('modalStatusTitle');
    const dateLabel = document.getElementById('modalStatusDateLabel');
    const payGroup = document.getElementById('modalStatusPayGroup');
    const dateInput = document.getElementById('modalStatusDate');

    document.getElementById('modalStatusServiceId').value = id;
    dateInput.value = getLocalDateString();

    let nextStatus = '';
    if (currentStatus === 'Orçamento') {
        nextStatus = 'Agendado';
        title.textContent = 'Agendar Serviço';
        dateLabel.textContent = 'Data do Agendamento:';
        payGroup.classList.add('hidden');
    } else if (currentStatus === 'Agendado') {
        nextStatus = 'Realizado';
        title.textContent = 'Confirmar Realização';
        dateLabel.textContent = 'Data de Conclusão:';
        payGroup.classList.add('hidden');
    } else if (currentStatus === 'Realizado') {
        nextStatus = 'Pago';
        title.textContent = 'Registrar Pagamento';
        dateLabel.textContent = 'Data do Pagamento:';
        payGroup.classList.remove('hidden');
        document.getElementById('modalStatusPay').value = 'Pix';
    }

    document.getElementById('modalStatusNext').value = nextStatus;
    modal.classList.remove('hidden');
}

/**
 * Fecha o modal de transição de status.
 */
function closeStatusModal() {
    document.getElementById('modalStatus').classList.add('hidden');
}

/**
 * Confirma a alteração de status e salva a respectiva data de log no IndexedDB.
 */
function confirmStatusChange() {
    const id = parseInt(document.getElementById('modalStatusServiceId').value);
    const nextStatus = document.getElementById('modalStatusNext').value;
    const selectedDate = document.getElementById('modalStatusDate').value || today;
    const selectedPay = document.getElementById('modalStatusPay').value;

    const service = window.appDataRaw.services.find(s => s.id === id);
    if (!service) return closeStatusModal();

    service.status = nextStatus;
    service.date = selectedDate;

    if (nextStatus === 'Agendado') {
        service.scheduledDate = selectedDate;
        if (typeof estornarEstoqueDoServico === 'function') {
            estornarEstoqueDoServico(service);
        }
    } else if (nextStatus === 'Realizado') {
        service.doneDate = selectedDate;
        if (typeof debitarEstoqueDoServico === 'function') {
            debitarEstoqueDoServico(service);
        }
    } else if (nextStatus === 'Pago') {
        service.paidDate = selectedDate;
        service.pay = selectedPay;
        if (typeof debitarEstoqueDoServico === 'function') {
            debitarEstoqueDoServico(service);
        }
    }

    dbSave('services', service, () => {
        if (typeof agendarNotificacaoServico === 'function') {
            agendarNotificacaoServico(service);
        }
        closeStatusModal();
        carregarDados();
    });
}
// ==========================================
// 9. CONTROLE DE FUNDO DE CAIXA E CAPITAL DE GIRO
// ==========================================

/**
 * Retorna todas as configurações mensais de caixa.
 */
function getAllCaixaConfigs() {
    try {
        const raw = localStorage.getItem('app_caixa_config');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        // Retrocompatibilidade: se o objeto não tiver chaves de mês (ex: 2026-08), converte
        if (parsed.fundoCaixa !== undefined || parsed.capitalGiro !== undefined) {
            // Era o formato antigo global
            const migrated = {
                'default': { fundoCaixa: parsed.fundoCaixa || 0, capitalGiro: parsed.capitalGiro || 0 }
            };
            localStorage.setItem('app_caixa_config', JSON.stringify(migrated));
            return migrated;
        }
        return parsed;
    } catch (e) {
        return {};
    }
}

/**
 * Retorna as configurações salvas de metas de caixa e giro para um mês específico.
 */
function getCaixaConfig(monthStr) {
    if (!monthStr) {
        monthStr = (document.getElementById('filterMonth') ? document.getElementById('filterMonth').value : null) || new Date().toISOString().substring(0, 7);
        if (monthStr === 'all') monthStr = new Date().toISOString().substring(0, 7);
    }
    const allConfigs = getAllCaixaConfigs();
    const monthConfig = allConfigs[monthStr] || {};
    
    const fundoCaixa = monthConfig.fundoCaixa !== undefined ? monthConfig.fundoCaixa : (allConfigs['default'] ? allConfigs['default'].fundoCaixa : 0);
    const capitalGiro = monthConfig.capitalGiro !== undefined ? monthConfig.capitalGiro : (allConfigs.targetCapitalGiro !== undefined ? allConfigs.targetCapitalGiro : (allConfigs['default'] ? allConfigs['default'].capitalGiro : 0));

    return { fundoCaixa: fundoCaixa || 0, capitalGiro: capitalGiro || 0 };
}

/**
 * Abre o modal para edição das metas de Fundo de Caixa e Capital de Giro.
 */
function openCaixaModal() {
    let currentMonth = (document.getElementById('filterMonth') ? document.getElementById('filterMonth').value : null) || new Date().toISOString().substring(0, 7);
    if (currentMonth === 'all') currentMonth = new Date().toISOString().substring(0, 7);
    const config = getCaixaConfig(currentMonth);
    
    document.getElementById('inputFundoCaixa').value = config.fundoCaixa || '';
    document.getElementById('inputCapitalGiro').value = config.capitalGiro || '';
    
    // Atualiza a label do mês
    const parts = currentMonth.split('-');
    const label = (parts.length === 2) ? `${parts[1]}/${parts[0]}` : currentMonth;
    document.getElementById('labelCaixaMonth').textContent = label;

    document.getElementById('modalCaixa').classList.remove('hidden');
}

/**
 * Fecha o modal de configuração de caixa.
 */
function closeCaixaModal() {
    document.getElementById('modalCaixa').classList.add('hidden');
}

/**
 * Salva as metas de caixa no localStorage (por mês) e atualiza a visualização.
 */
function saveCaixaConfig() {
    const fundoCaixa = parseFloat(document.getElementById('inputFundoCaixa').value) || 0;
    const capitalGiro = parseFloat(document.getElementById('inputCapitalGiro').value) || 0;
    
    let currentMonth = (document.getElementById('filterMonth') ? document.getElementById('filterMonth').value : null) || new Date().toISOString().substring(0, 7);
    if (currentMonth === 'all') currentMonth = new Date().toISOString().substring(0, 7);
    
    const allConfigs = getAllCaixaConfigs();
    allConfigs[currentMonth] = { fundoCaixa, capitalGiro };
    allConfigs.targetCapitalGiro = capitalGiro; // Salva como meta global do colchão da empresa

    localStorage.setItem('app_caixa_config', JSON.stringify(allConfigs));
    closeCaixaModal();
    renderView();
}

// ==========================================
// 10. MENU LATERAL (DRAWER)
// ==========================================

/**
 * Abre o menu lateral deslizante (Drawer).
 */
function openDrawer() {
    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('sideDrawer');
    if (overlay && drawer) {
        overlay.classList.remove('hidden');
        // Pequeno timeout para ativar a transição CSS suave
        setTimeout(() => drawer.classList.add('open'), 10);
    }
}

/**
 * Fecha o menu lateral deslizante (Drawer).
 */
function closeDrawer() {
    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('sideDrawer');
    if (drawer) {
        drawer.classList.remove('open');
    }
    if (overlay) {
        setTimeout(() => overlay.classList.add('hidden'), 250);
    }
}

// ==========================================
// 11. PERFIL DA EMPRESA & PROFISSIONAL
// ==========================================

/**
 * Retorna as informações configuradas do perfil da empresa/profissional.
 */
function getCompanyProfile() {
    try {
        const raw = localStorage.getItem('app_company_profile');
        if (!raw) return { name: '', owner: '', phone: '', pix: '', city: '' };
        return JSON.parse(raw);
    } catch (e) {
        return { name: '', owner: '', phone: '', pix: '', city: '' };
    }
}

/**
 * Abre o modal de configuração do perfil da empresa.
 */
function openProfileModal() {
    const profile = getCompanyProfile();
    document.getElementById('profileCompanyName').value = profile.name || '';
    document.getElementById('profileOwnerName').value = profile.owner || '';
    document.getElementById('profilePhone').value = profile.phone || '';
    document.getElementById('profilePix').value = profile.pix || '';
    document.getElementById('profileCity').value = profile.city || '';

    const modal = document.getElementById('modalCompanyProfile');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Fecha o modal de configuração do perfil.
 */
function closeProfileModal() {
    const modal = document.getElementById('modalCompanyProfile');
    if (modal) modal.classList.add('hidden');
}

/**
 * Salva as informações do perfil da empresa no localStorage.
 */
function saveCompanyProfile() {
    const profile = {
        name: document.getElementById('profileCompanyName').value.trim(),
        owner: document.getElementById('profileOwnerName').value.trim(),
        phone: document.getElementById('profilePhone').value.trim(),
        pix: document.getElementById('profilePix').value.trim(),
        city: document.getElementById('profileCity').value.trim()
    };

    localStorage.setItem('app_company_profile', JSON.stringify(profile));
    closeProfileModal();
    alert('Dados da empresa salvos com sucesso! Eles serão utilizados na emissão de orçamentos e comprovantes em PDF.');
}


