// ==========================================
// 1. VARIÁVEIS GLOBAIS E UTILITÁRIOS
// ==========================================

let activeTab = 'services';          // Aba principal ativa ('services', 'quotes', 'expenses', 'all')
let serviceSubFilter = 'pending';   // Sub-filtro de Serviços ('pending' = Pendentes, 'paid' = Concluídos)
let allSubFilter = 'list';          // Sub-filtro de Extrato ('list' = Movimentações, 'charts' = Gráficos)
let deferredPwaPrompt = null;       // Evento de instalação do PWA

// ==========================================
// 2. INICIALIZAÇÃO DA APLICAÇÃO & PWA
// ==========================================

// Captura evento nativo do Chrome para instalação do PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const btn = document.getElementById('drawerInstallPwa');
    if (btn) btn.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
    const btn = document.getElementById('drawerInstallPwa');
    if (btn) btn.classList.add('hidden');
    console.log('[PWA] Aplicativo instalado com sucesso na tela inicial!');
});

/**
 * Dispara o prompt de instalação do PWA ou exibe instruções para iOS/Android.
 */
function instalarPwaApp() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        deferredPwaPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
                console.log('[PWA] Usuário aceitou a instalação.');
            }
            deferredPwaPrompt = null;
        });
    } else {
        alert('📲 Para instalar no celular:\n\n• No Android (Chrome): Toque nos 3 pontinhos no topo e clique em "Instalar Aplicativo" ou "Adicionar à tela inicial".\n\n• No iPhone (Safari): Toque no botão Compartilhar (quadrado com seta) e escolha "Adicionar à Tela de Início".');
    }
}

/**
 * Mostra um aviso fixo pedindo ao usuário para atualizar quando uma nova versão
 * é publicada (evita recarregar a página sozinho no meio de uma digitação).
 */
function notificarNovaVersao() {
    let el = document.getElementById('appUpdateBanner');
    if (!el) {
        el = document.createElement('div');
        el.id = 'appUpdateBanner';
        el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1976d2;color:#fff;padding:12px 14px;text-align:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 -2px 8px rgba(0,0,0,.35);';
        el.innerHTML = '🔄 Nova versão disponível — toque para atualizar';
        el.onclick = () => window.location.reload();
        document.body.appendChild(el);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Registra o Service Worker para funcionamento 100% offline
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
            .then(reg => {
                console.log('[Service Worker] Ativo no escopo:', reg.scope);
                // Verifica atualizações imediatamente
                reg.update();
                // Quando um novo SW for instalado, avisa o usuário (sem recarregar sozinho)
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'activated') {
                                console.log('[Service Worker] Nova versão ativada. Aguardando o usuário atualizar...');
                                notificarNovaVersao();
                            }
                        });
                    }
                });
            })
            .catch(err => console.warn('[Service Worker] Registro ignorado:', err));
    }

    // Inicializa o modo de privacidade (se estava ativo na última sessão)
    if (typeof initMaskValues === 'function') {
        initMaskValues();
    }

    // Verifica bloqueio por PIN de acesso
    if (typeof checkAppLockStatus === 'function') {
        checkAppLockStatus();
    }

    // Define a data de hoje por padrão em todos os inputs do tipo date
    document.querySelectorAll('input[type=date]').forEach(x => x.value = today);

    // Popula o select de meses (ano atual e anterior)
    popularMeses();

    // Inicializa o IndexedDB e carrega os registros
    initDB(() => {
        carregarDados();
        // Purga da lixeira: remove itens que já passaram dos 3 dias de retenção
        if (typeof limparLixeiraVencida === 'function') {
            limparLixeiraVencida();
        }
        // Notificações WEB (navegador/PWA) - fallback do plugin nativo do Cordova.
        // SÓ após o banco estar pronto: reagendarServicosFuturos() lê o IndexedDB,
        // e chamar antes fazia o boot abortar (db indefinido) sem nunca abrir o banco.
        // No APK o fluxo nativo (initNotifications/deviceready) é quem assume.
        try {
            if (typeof initWebNotifications === 'function') {
                initWebNotifications();
            }
        } catch (notifErr) {
            console.warn('[Notificações] Falha ao inicializar (ignorado):', notifErr);
        }
        if (window.cordova) {
            document.addEventListener('deviceready', initNotifications, false);
        }
    });
});

/**
 * Popula dinamicamente a barra de filtro por meses no cabeçalho do app.
 */
function popularMeses() {
    const select = document.getElementById('filterMonth');
    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
    const anoAtual = now.getFullYear();
    const mesAtual = now.getMonth();
    const valorMesAtual = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;

    select.innerHTML = '<option value="all">📅 Todo o Histórico</option>';
    const anos = [anoAtual, anoAtual - 1];

    anos.forEach(ano => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `Ano ${ano}`;
        for (let m = 0; m < 12; m++) {
            const val = `${ano}-${String(m + 1).padStart(2, '0')}`;
            const label = `${mesesNomes[m]} / ${ano}`;
            
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            if (val === valorMesAtual) {
                opt.selected = true;
            }
            optgroup.appendChild(opt);
        }
        select.appendChild(optgroup);
    });
}

// ==========================================
// 3. CONTROLE DE ABAS E NAVEGAÇÃO
// ==========================================

/**
 * Alterna a aba principal visível na interface.
 * @param {string} tab Identificador da aba ('services', 'quotes', 'expenses', 'all').
 */
function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    renderView();
}

/**
 * Alterna entre sub-filtros de Serviços ('pending' para Pendentes, 'paid' para Pagos).
 * @param {string} filter Sub-filtro escolhido.
 */
function switchServiceSubFilter(filter) {
    serviceSubFilter = filter;
    renderView();
}

/**
 * Alterna entre sub-filtros de Extrato ('list' para Movimentações, 'charts' para Gráficos).
 * @param {string} filter Sub-filtro escolhido.
 */
function switchAllSubFilter(filter) {
    allSubFilter = filter;
    renderView();
}
// ==========================================
// 10. RENDERIZAÇÃO E PROCESSAMENTO DE DADOS
// ==========================================

/**
 * Carrega dados do IndexedDB, aplica os filtros mensais e atualiza os cards de resumo.
 * @param {Function} [callback] Callback opcional executado após o carregamento completo dos dados.
 */
function carregarDados(callback) {
    dbGetAll(data => {
        const monthFilter = document.getElementById('filterMonth').value;
        let services = data.services;
        let expenses = data.expenses;
        let quick = data.quickEntries;

        // Sanatização retrocompatível: converte 'val' em string/ausente de backups
        // antigos ou dados legados para número, e persiste a correção automaticamente.
        if (typeof normalizarRegistros === 'function') {
            const rS = normalizarRegistros(services, normalizarServico);
            const rE = normalizarRegistros(expenses, normalizarDespesa);
            const rQ = normalizarRegistros(quick, normalizarLancamento);
            const rI = normalizarRegistros(data.inventory, normalizarEstoque);
            data.services = rS.list; data.expenses = rE.list;
            data.quickEntries = rQ.list; data.inventory = rI.list;
            services = data.services; expenses = data.expenses; quick = data.quickEntries;

            if (rS.changed || rE.changed || rQ.changed || rI.changed) {
                if (typeof dbSaveAll === 'function') {
                    dbSaveAll({ services: data.services, expenses: data.expenses, quickEntries: data.quickEntries, inventory: data.inventory });
                }
            }
        }

        // Identifica serviços agendados para a data de hoje que ainda não foram concluídos
        const servicosHoje = services.filter(x => x.date === today && x.status !== 'Pago');
        const banner = document.getElementById('todayBanner');
        if (servicosHoje.length > 0) {
            banner.innerHTML = `⚠️ <b>Atenção:</b> Você tem <b>${servicosHoje.length} serviço(s)</b> pendente(s) para hoje!`;
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }

        // Filtro do mês selecionado
        if (monthFilter !== 'all') {
            services = services.filter(x => x.date && x.date.startsWith(monthFilter));
            expenses = expenses.filter(x => x.date && x.date.startsWith(monthFilter));
            quick = quick.filter(x => x.date && x.date.startsWith(monthFilter));
        }

        window.appDataFiltered = { services, expenses, quickEntries: quick };
        window.appDataRaw = data;

        // Alerta se faz mais de 3 dias sem exportar backup externo
        const backupBanner = document.getElementById('backupAlertBanner');
        if (backupBanner) {
            const totalRegistros = (data.services || []).length + (data.expenses || []).length;
            const lastManualExport = parseInt(localStorage.getItem('last_manual_export') || '0', 10);
            const agora = Date.now();
            const tresDiasMs = 3 * 24 * 60 * 60 * 1000;

            if (totalRegistros > 0 && (!lastManualExport || (agora - lastManualExport > tresDiasMs))) {
                const diasSemBackup = lastManualExport ? Math.floor((agora - lastManualExport) / (24 * 60 * 60 * 1000)) : 3;
                backupBanner.innerHTML = `<span>⚠️ <b>Atenção:</b> Faz <b>${diasSemBackup} dias</b> sem exportar backup!</span> <a href="javascript:void(0)" onclick="exportarBackup()">Exportar Agora</a>`;
                backupBanner.classList.remove('hidden');
            } else {
                backupBanner.classList.add('hidden');
            }
        }

        // Dispara backup silencioso se já se passaram mais de 24h do último
        const lastAutoBackup = parseInt(localStorage.getItem('last_auto_backup') || '0', 10);
        if (Date.now() - lastAutoBackup > 24 * 60 * 60 * 1000) {
            if (typeof realizarBackupSilencioso === 'function') {
                realizarBackupSilencioso();
            }
        }

        // Atualiza a lista de clientes e estoque para autocompletar
        if (typeof popularDatalistClientes === 'function') {
            popularDatalistClientes();
        }
        if (typeof popularDatalistEstoque === 'function') {
            popularDatalistEstoque();
        }

        // Atualiza a visualização do modal de estoque se estiver aberto
        const modalInventory = document.getElementById('modalInventory');
        if (modalInventory && !modalInventory.classList.contains('hidden') && typeof renderInventoryList === 'function') {
            renderInventoryList();
        }

        calcularTotais();
        renderView();

        if (typeof callback === 'function') {
            callback(data);
        }
    });
}

/**
 * Calcula os cartões superiores de resumo financeiro (Recebido, Pendente, Gastos e Lucro Real).
 */
function calcularTotais() {
    let services = window.appDataFiltered.services;
    let expenses = window.appDataFiltered.expenses;

    let totalIn = services.filter(x => x.status === 'Pago').reduce((s, x) => s + numVal(x.val), 0);
    let totalPending = services.filter(x => x.status === 'Agendado' || x.status === 'Realizado').reduce((s, x) => s + numVal(x.val), 0);
    let totalOut = expenses.reduce((s, x) => s + numVal(x.val), 0);

    document.getElementById('totalIn').textContent = money(totalIn);
    document.getElementById('totalPending').textContent = money(totalPending);
    document.getElementById('totalOut').textContent = money(totalOut);
    document.getElementById('profit').textContent = money(totalIn - totalOut);
}

// ==========================================
// 11. SISTEMA DE EXCLUSÃO COM DESFAZER
// ==========================================

let ultimoItemExcluido = null;
let toastTimeout = null;

/**
 * Exibe o toast flutuante com a opção de desfazer a exclusão recente.
 * @param {string} desc Descrição do item excluído.
 */
function exibirToastDesfazer(desc) {
    const toast = document.getElementById('undoToast');
    const msg = document.getElementById('undoToastMsg');
    if (!toast || !msg) return;

    msg.textContent = `"${desc}" foi excluído.`;
    toast.classList.remove('hidden');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
        ultimoItemExcluido = null;
    }, 6000);
}

/**
 * Restaura o último item excluído de volta ao IndexedDB.
 */
function executarDesfazerExclusao() {
    if (!ultimoItemExcluido) return;

    const { storeName, item } = ultimoItemExcluido;
    // O item também foi para a lixeira (retenção de 3 dias). Ao desfazer,
    // remove o envelope da lixeira para não deixar cópia duplicada lá.
    if (typeof removerItemLixeira === 'function') {
        removerItemLixeira(storeName + ':' + item.id);
    }

    dbSave(storeName, item, () => {
        const toast = document.getElementById('undoToast');
        if (toast) toast.classList.add('hidden');
        if (toastTimeout) clearTimeout(toastTimeout);
        ultimoItemExcluido = null;
        carregarDados();
    });
}

/**
 * Remove um registro do IndexedDB com confirmação, botão de desfazer e lixeira de 3 dias.
 * @param {string} storeName Nome da store ('services' ou 'expenses').
 * @param {number} id ID do registro.
 * @param {string} itemDesc Descrição para confirmação no alerta.
 */
function confirmDelete(storeName, id, itemDesc) {
    if (confirm(`Tem certeza que deseja excluir "${itemDesc}"?`)) {
        // Guarda uma cópia do item na memória antes de excluir para poder desfazer
        const list = storeName === 'services' ? window.appDataRaw?.services : window.appDataRaw?.expenses;
        const itemOriginal = list?.find(x => x.id === id);

        if (storeName === 'services' && itemOriginal?.stockDebited && typeof estornarEstoqueDoServico === 'function') {
            estornarEstoqueDoServico(itemOriginal);
        }

        // Envia para a lixeira (retenção de 3 dias) ANTES de apagar do banco.
        // A cópia guarda o estado pós-estorno, então restaurar = re-save equivalente ao desfazer.
        if (itemOriginal && typeof moverParaLixeira === 'function') {
            moverParaLixeira(storeName, itemOriginal);
        }

        dbDelete(storeName, id, () => {
            carregarDados();
            if (itemOriginal) {
                ultimoItemExcluido = { storeName, item: { ...itemOriginal } };
                exibirToastDesfazer(itemDesc);
            }
        });
    }
}


