// ==========================================
// RENDERIZAÇÃO VISUAL (VIEWS E CARDS)
// ==========================================

// Registro seguro de objetos para os onclick das views.
// Evita interpolar JSON.stringify() em atributos HTML (quebra com aspas,
// emojis e caracteres especiais em nomes/dados). A chave usa o id estável
// do registro (prefixo por tipo), então re-renders apenas sobrescrevem a
// referência — sem afetar armazenamento, formatos importados ou handlers.
const __secureViewData = new Map();
let __secureViewDataSeq = 0;

function __storeViewData(type, obj) {
    const key = (obj && obj.id != null) ? type + ':' + obj.id : type + ':auto:' + (++__secureViewDataSeq);
    __secureViewData.set(key, obj);
    return key;
}

function __getViewData(key) {
    return __secureViewData.get(key);
}

function toggleCardDetails(id) {
    const body = document.getElementById(`card-body-${id}`);
    const icon = document.getElementById(`card-icon-${id}`);
    if (body) {
        const isHidden = body.classList.contains('hidden');
        body.classList.toggle('hidden');
        if (icon) icon.textContent = isHidden ? '▲' : '▼';
    }
}

/**
 * Renderiza o card individual de um serviço ou orçamento com todas as ações.
 * @param {Object} x Objeto contendo os dados do serviço.
 */
function renderServiceCard(x) {
    const svcKey = __storeViewData('service', x);
    let itensDetalhados = '';
    if (Array.isArray(x.items) && x.items.length > 0) {
        itensDetalhados = x.items.map(it => {
            const unit = it.mUnit || 'm';
            const dim = (it.width || it.height) ? ` (${it.width || 0}${unit} x ${it.height || 0}${unit})` : '';
            return `<div style="margin-bottom: 4px;">• <b>${it.type || 'Item'}</b>${dim} — ${it.qty}x ${money(it.unitPrice)} = <b>${money(it.subtotal)}</b></div>`;
        }).join('');
    }

    let btnNextStep = '';
    if (x.status === 'Orçamento') {
        btnNextStep = `<button class="btn-action-lg primary" style="width: 100%; background: #0288d1;" onclick="openStatusModal(${x.id}, '${x.status}')">Avançar para Agendado</button>`;
    } else if (x.status === 'Agendado') {
        btnNextStep = `<button class="btn-action-lg primary" style="width: 100%; background: #7b1fa2;" onclick="openStatusModal(${x.id}, '${x.status}')">Marcar como Realizado</button>`;
    } else if (x.status === 'Realizado') {
        btnNextStep = `<button class="btn-action-lg primary" style="width: 100%; background: #2e7d32;" onclick="openStatusModal(${x.id}, '${x.status}')">Marcar como Pago</button>`;
    }

    let historicoDatas = [];
    if (x.quoteDate) historicoDatas.push(`<div>📅 <b>Orçamento:</b> ${formatDateToBR(x.quoteDate)}</div>`);
    if (x.scheduledDate) {
        const timeInfo = x.time ? ` às ${x.time}` : '';
        historicoDatas.push(`<div>📅 <b>Agendado para:</b> ${formatDateToBR(x.scheduledDate)}${timeInfo}</div>`);
    }
    if (x.doneDate) historicoDatas.push(`<div>📅 <b>Realizado em:</b> ${formatDateToBR(x.doneDate)}</div>`);
    if (x.paidDate) historicoDatas.push(`<div>📅 <b>Pago em:</b> ${formatDateToBR(x.paidDate)} ${x.pay ? '(' + x.pay + ')' : ''}</div>`);
    if (historicoDatas.length === 0 && x.date) {
        const timeInfo = x.time ? ` às ${x.time}` : '';
        historicoDatas.push(`<div>📅 <b>Data:</b> ${formatDateToBR(x.date)}${timeInfo} ${x.pay ? '• Pago via ' + x.pay : ''}</div>`);
    }

    return `
    <div class="item-card">
        <div class="item-card-header" onclick="toggleCardDetails(${x.id})">
            <div>
                <span class="tag tag-${x.status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}">${x.status}</span>
                <div class="item-card-title">${x.client}</div>
                <div style="font-size: 1.1em; color: #1976d2; font-weight: bold; margin-top: 2px;" class="value-maskable">${money(x.val)}</div>
            </div>
            <span id="card-icon-${x.id}" style="font-size: 18px; color: #666;">▼</span>
        </div>
        <div id="card-body-${x.id}" class="item-card-body hidden">
            ${itensDetalhados ? `<div style="margin-bottom: 8px;">${itensDetalhados}</div>` : ''}
            ${x.desc ? `<div style="margin-bottom: 6px;"><b>Detalhes:</b> ${x.desc}</div>` : ''}
            ${x.notes ? `<div style="margin-bottom: 6px; color: #555;">📍 <b>Endereço:</b> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.notes)}" target="_system" style="color: #1976d2; text-decoration: underline;">${x.notes}</a></div>` : ''}
            
            <div class="service-history-log">
                ${historicoDatas.join('')}
            </div>

            ${btnNextStep ? `<div style="margin-bottom: 8px;">${btnNextStep}</div>` : ''}
            ${x.status === 'Agendado' ? `<button class="btn-action-lg secondary" style="width: 100%; border-color: #f57c00; color: #e65100; margin-bottom: 8px;" onclick='adicionarServicoNaAgenda(__getViewData("${svcKey}"))'>📅 Abrir na Agenda do Celular</button>` : ''}

            <!-- Botões de Comunicação e Documento (WhatsApp e PDF) -->
            <div style="display: flex; gap: 8px; margin-top: 6px;">
                ${x.phone ? `<button class="btn-action-lg btn-whatsapp-lg" style="flex: 1;" onclick='openWhatsApp(__getViewData("${svcKey}"))'>WhatsApp</button>` : ''}
                <button class="btn-action-lg secondary" style="flex: 1; border-color: #1976d2;" onclick='gerarPdfServico(__getViewData("${svcKey}"))'>📄 Gerar PDF</button>
            </div>

            <!-- Botões de Gerenciamento (Editar e Excluir) -->
            <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button type="button" class="secondary" style="flex: 1; padding: 10px; border-radius: 8px; font-size: 13px;" onclick='openServiceForm(__getViewData("${svcKey}"))'>✏️ Editar</button>
                <button type="button" class="danger" style="flex: 1; padding: 10px; border-radius: 8px; font-size: 13px;" onclick="confirmDelete('services', ${x.id}, __getViewData(&quot;${svcKey}&quot;).client)">🗑️ Excluir</button>
            </div>
        </div>
    </div>`;
}

/**
 * Gera o fragmento HTML dos indicadores visuais e gráficos para a sub-aba de Extrato.
 * @returns {string} HTML com as barras comparativas e distribuição de categorias.
 */
function gerarHtmlGraficos() {
    const services = window.appDataFiltered.services || [];
    const expenses = window.appDataFiltered.expenses || [];

    const totalIn = services.filter(x => x.status === 'Pago').reduce((s, x) => s + x.val, 0);
    const totalOut = expenses.reduce((s, x) => s + x.val, 0);
    const totalVolume = totalIn + totalOut;

    const percIn = totalVolume > 0 ? ((totalIn / totalVolume) * 100).toFixed(1) : 0;
    const percOut = totalVolume > 0 ? ((totalOut / totalVolume) * 100).toFixed(1) : 0;

    const categorias = ['Material', 'Combustível', 'Ferramentas', 'Publicidade', 'Alimentação', 'Outros'];
    const rankingCategorias = categorias.map(cat => {
        const totalCat = expenses.filter(x => x.cat === cat).reduce((s, x) => s + x.val, 0);
        const percentual = totalOut > 0 ? ((totalCat / totalOut) * 100).toFixed(1) : 0;
        return { cat, total: totalCat, percentual: Number(percentual) };
    }).filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    let htmlCategorias = '';
    if (rankingCategorias.length > 0) {
        htmlCategorias = rankingCategorias.map(c => `
            <div class="cat-item-row">
                <div class="cat-item-info">
                    <span>${c.cat} (${c.percentual}%)</span>
                    <span class="value-maskable">${money(c.total)}</span>
                </div>
                <div class="cat-bar-bg">
                    <div class="cat-bar-fill" style="width: ${c.percentual}%;"></div>
                </div>
            </div>
        `).join('');
    } else {
        htmlCategorias = '<div class="small" style="text-align: center; padding: 6px;">Nenhum gasto registrado neste período.</div>';
    }

    return `
        <div class="chart-section">
            <div class="chart-card">
                <div class="chart-card-title">⚖️ Proporção Financeira (Entradas x Saídas)</div>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill-in" style="width: ${percIn}%;"></div>
                    <div class="chart-bar-fill-out" style="width: ${percOut}%;"></div>
                </div>
                <div class="chart-legend">
                    <span style="color: #2e7d32; font-weight: bold;">● Entradas: ${percIn}% (<span class="value-maskable">${money(totalIn)}</span>)</span>
                    <span style="color: #c62828; font-weight: bold;">● Saídas: ${percOut}% (<span class="value-maskable">${money(totalOut)}</span>)</span>
                </div>
            </div>

            <div class="chart-card">
                <div class="chart-card-title">🏷️ Gastos por Categoria</div>
                ${htmlCategorias}
            </div>
        </div>
    `;
}

/**
 * Renderiza o conteúdo da aba selecionada no DOM (Serviços, Orçamentos, Gastos ou Extrato).
 */
function renderView() {
    const container = document.getElementById('tabContent');
    const search = document.getElementById('searchInput').value.toLowerCase().trim();

    if (activeTab === 'services') {
        const subFilterHtml = `
            <div class="sub-filter-pills">
                <button class="btn-pill ${serviceSubFilter === 'pending' ? 'active' : ''}" onclick="switchServiceSubFilter('pending')">Pendentes</button>
                <button class="btn-pill ${serviceSubFilter === 'paid' ? 'active' : ''}" onclick="switchServiceSubFilter('paid')">Concluídos (Pagos)</button>
            </div>
        `;

        let list = window.appDataFiltered.services;

        if (serviceSubFilter === 'pending') {
            list = list.filter(x => x.status === 'Agendado' || x.status === 'Realizado');
        } else {
            list = list.filter(x => x.status === 'Pago');
        }

        list = list.slice().reverse();

        if (search) {
            list = list.filter(x => (x.client && x.client.toLowerCase().includes(search)) ||
                                     (x.desc && x.desc.toLowerCase().includes(search)) ||
                                     (x.notes && x.notes.toLowerCase().includes(search)));
        }

        const cardsHtml = list.length ? list.map(renderServiceCard).join('') : '<div style="padding: 16px; text-align: center; color: #666;">Nenhum serviço encontrado nesta seção.</div>';
        container.innerHTML = subFilterHtml + cardsHtml;

    } else if (activeTab === 'quotes') {
        let list = window.appDataFiltered.services.filter(x => x.status === 'Orçamento').slice().reverse();

        if (search) {
            list = list.filter(x => (x.client && x.client.toLowerCase().includes(search)) ||
                                     (x.desc && x.desc.toLowerCase().includes(search)) ||
                                     (x.notes && x.notes.toLowerCase().includes(search)));
        }

        container.innerHTML = list.length ? list.map(renderServiceCard).join('') : '<div style="padding: 16px; text-align: center; color: #666;">Nenhum orçamento pendente encontrado.</div>';

    } else if (activeTab === 'expenses') {
        let list = window.appDataFiltered.expenses.slice().reverse();

        if (search) {
            list = list.filter(x => (x.desc && x.desc.toLowerCase().includes(search)) || (x.cat && x.cat.toLowerCase().includes(search)));
        }

        container.innerHTML = list.length ? list.map(x => {
            const expKey = __storeViewData('expense', x);
            return `
            <div class="item">
                <div class="item-actions">
                    <button class="btn-mini btn-edit" onclick='openExpenseForm(__getViewData("${expKey}"))'>Editar</button>
                    <button class="btn-mini btn-delete" onclick="confirmDelete('expenses', ${x.id}, __getViewData(&quot;${expKey}&quot;).desc)">Excluir</button>
                </div>
                <b>${x.desc}</b>
                <div class="small">${formatDateToBR(x.date)} • Categoria: ${x.cat}</div>
                <div class="value out value-maskable">- ${money(x.val)}</div>
            </div>
        `;
        }).join('') : '<div class="small">Nenhum gasto encontrado no período.</div>';

        } else if (activeTab === 'all') {
                const monthFilter = document.getElementById('filterMonth').value;
                const caixaConfig = getCaixaConfig(monthFilter === 'all' ? null : monthFilter);
                
                const allServices = window.appDataRaw.services || [];
                const allExpenses = window.appDataRaw.expenses || [];

                const currentServices = window.appDataFiltered.services || [];
                const currentExpenses = window.appDataFiltered.expenses || [];

                const totalIn = currentServices.filter(x => x.status === 'Pago').reduce((s, x) => s + x.val, 0);
                const totalOut = currentExpenses.reduce((s, x) => s + x.val, 0);
                const lucroMes = totalIn - totalOut;

                const metaFundo = caixaConfig.fundoCaixa || 0;
                const metaGiro = caixaConfig.capitalGiro || 0;

                // --- Lógica de Capital de Giro Acumulado da Empresa ---
                let giroAcumuladoPassado = 0;
                
                if (monthFilter !== 'all' && monthFilter.includes('-')) {
                    const monthlyData = {}; // agrupa dados por YYYY-MM
                    
                    allServices.forEach(s => {
                        if (s.status === 'Pago' && s.date) {
                            const m = s.date.substring(0, 7);
                            if (m < monthFilter) {
                                if (!monthlyData[m]) monthlyData[m] = { in: 0, out: 0 };
                                monthlyData[m].in += s.val;
                            }
                        }
                    });
                    
                    allExpenses.forEach(e => {
                        if (e.date) {
                            const m = e.date.substring(0, 7);
                            if (m < monthFilter) {
                                if (!monthlyData[m]) monthlyData[m] = { in: 0, out: 0 };
                                monthlyData[m].out += e.val;
                            }
                        }
                    });
                    
                    for (const m in monthlyData) {
                        const mConfig = getCaixaConfig(m);
                        const mLucro = monthlyData[m].in - monthlyData[m].out;
                        const mSalario = mConfig.fundoCaixa || 0;
                        
                        if (mLucro > 0) {
                            // Tudo o que excedeu o salário retirado no passado ficou como reserva da empresa
                            const retencaoEmpresa = Math.max(0, mLucro - mSalario);
                            giroAcumuladoPassado += retencaoEmpresa;
                        } else {
                            giroAcumuladoPassado += mLucro; // Prejuízo real corrói o caixa da empresa
                        }
                    }
                }

                // As metas são preenchidas exclusivamente pelo lucro do mês atual
                const lucroTotalDisponivel = Math.max(0, lucroMes); 

                // Progresso da Meta 1: Fundo de Caixa (Salário / Pró-labore do Dono)
                const atingidoFundo = metaFundo > 0 ? Math.min(metaFundo, lucroTotalDisponivel) : 0;
                const percFundo = metaFundo > 0 ? Math.min(100, (atingidoFundo / metaFundo) * 100).toFixed(1) : 0;
                const faltaFundo = Math.max(0, metaFundo - atingidoFundo);

                // Valor que entra como Capital de Giro / Caixa da empresa deste mês
                let giroAdicionadoMesAtual = 0;
                if (lucroMes > 0) {
                    giroAdicionadoMesAtual = Math.max(0, lucroMes - atingidoFundo);
                } else {
                    giroAdicionadoMesAtual = lucroMes; // Prejuízo do mês
                }

                // Total de Capital de Giro acumulado da empresa (Passado + Deste Mês)
                const giroTotalAcumuladoEmpresa = Math.max(0, giroAcumuladoPassado + giroAdicionadoMesAtual);
                const percGiroTotal = metaGiro > 0 ? Math.min(100, (giroTotalAcumuladoEmpresa / metaGiro) * 100).toFixed(1) : 0;
                const faltaGiroTotal = Math.max(0, metaGiro - giroTotalAcumuladoEmpresa);
                const excedenteLucroLivre = metaGiro > 0 ? Math.max(0, giroTotalAcumuladoEmpresa - metaGiro) : 0;

                // Card de Lucro Livre Excedente (quando a meta de giro foi superada)
                const lucroLivreHtml = excedenteLucroLivre > 0 ? `
                    <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 10px 12px; border-radius: 8px; margin-top: 10px; font-size: 13px;">
                        <div style="color: #f57f17; font-weight: bold; margin-bottom: 2px;">
                            💰 Lucro Livre Excedente: <span class="value-maskable">+${money(excedenteLucroLivre)}</span>
                        </div>
                        <div style="color: #666; font-size: 11px;">
                            Acima da meta de reserva da empresa. Disponível para divisão de lucros ou investimento!
                        </div>
                    </div>
                ` : '';

                const subFilterHtml = `
                    <div style="margin-bottom: 10px;">
                        <button class="btn-action-lg secondary" style="width: 100%; border-color: #1976d2;" onclick="gerarPdfExtrato()">📄 Exportar Extrato em PDF</button>
                    </div>
                    <div class="sub-filter-pills">
                        <button class="btn-pill ${allSubFilter === 'list' ? 'active' : ''}" onclick="switchAllSubFilter('list')">Movimentações</button>
                        <button class="btn-pill ${allSubFilter === 'charts' ? 'active' : ''}" onclick="switchAllSubFilter('charts')">Gráficos</button>
                    </div>

                    <!-- Painel de Metas de Caixa e Giro -->
                    <div class="caixa-summary-card">
                        <!-- Meta 1: Salário do Mês (Pró-labore) -->
                        <div class="caixa-meta-box">
                            <div class="caixa-meta-header">
                                <span>💼 Salário deste Mês (Pró-labore): <span class="value-maskable">${money(atingidoFundo)}</span> / <span class="value-maskable">${money(metaFundo)}</span></span>
                                <span>${percFundo}%</span>
                            </div>
                            <div class="caixa-progress-bg">
                                <div class="caixa-progress-fill ${atingidoFundo >= metaFundo && metaFundo > 0 ? 'meta-ok' : ''}" style="width: ${percFundo}%;"></div>
                            </div>
                            <span class="caixa-meta-status ${atingidoFundo >= metaFundo && metaFundo > 0 ? 'ok' : 'pending'}">
                                ${atingidoFundo >= metaFundo && metaFundo > 0 ? '🎉 Salário do Mês Garantido!' : `Falta: <span class="value-maskable">${money(faltaFundo)}</span>`}
                            </span>
                        </div>

                        <!-- Meta 2: Capital de Giro Total da Empresa (Acumulado) -->
                        <div class="caixa-meta-box">
                            <div class="caixa-meta-header">
                                <span>🛡️ Capital de Giro Total da Empresa: <span class="value-maskable">${money(giroTotalAcumuladoEmpresa)}</span> / <span class="value-maskable">${money(metaGiro)}</span></span>
                                <span>${percGiroTotal}%</span>
                            </div>
                            <div class="caixa-progress-bg">
                                <div class="caixa-progress-fill ${giroTotalAcumuladoEmpresa >= metaGiro && metaGiro > 0 ? 'meta-ok' : ''}" style="width: ${percGiroTotal}%;"></div>
                            </div>
                            
                            <!-- Detalhamento de Composição do Giro -->
                            <div style="background: #fdfdfd; border: 1px dashed #e0e0e0; border-radius: 6px; padding: 6px 10px; margin: 8px 0 4px 0; font-size: 11px; color: #555;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span>• Guardado de Meses Anteriores:</span>
                                    <b class="value-maskable">${money(giroAcumuladoPassado)}</b>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                                    <span>• Adicionado com Lucro Deste Mês:</span>
                                    <b style="color: ${giroAdicionadoMesAtual >= 0 ? '#1976d2' : '#d32f2f'};" class="value-maskable">${money(giroAdicionadoMesAtual)}</b>
                                </div>
                            </div>

                            <span class="caixa-meta-status ${giroTotalAcumuladoEmpresa >= metaGiro && metaGiro > 0 ? 'ok' : 'pending'}">
                                ${giroTotalAcumuladoEmpresa >= metaGiro && metaGiro > 0 ? '🛡️ Reserva da Empresa 100% Preenchida!' : `Falta: <span class="value-maskable">${money(faltaGiroTotal)}</span> para completar o colchão`}
                            </span>
                        </div>

                        ${lucroLivreHtml}

                        <button type="button" class="secondary" style="width: 100%; padding: 8px; font-size: 12px; border-radius: 6px; margin-top: 8px;" onclick="openCaixaModal()">✏️ Ajustar Metas Financeiras</button>
                    </div>
                `;

                if (allSubFilter === 'charts') {
                    container.innerHTML = subFilterHtml + gerarHtmlGraficos();
                    return;
                }

                let servicesPagos = currentServices
                    .filter(x => x.status === 'Pago')
                    .map(x => ({ ...x, origin: 'services', type: 'in', label: 'Serviço: ' + x.client + (x.desc ? ' (' + x.desc + ')' : ''), extra: x.pay }));
                
                let expensesList = currentExpenses
                    .map(x => ({ ...x, origin: 'expenses', type: 'out', label: 'Gasto: ' + x.desc, extra: x.cat }));
                
                let all = [...servicesPagos, ...expensesList].sort((a, b) => b.date.localeCompare(a.date));

                if (search) {
                    all = all.filter(x => x.label.toLowerCase().includes(search));
                }

                const itemsHtml = all.length ? all.map(x => `
                    <div class="item">
                        <div class="item-actions">
                            <button class="btn-mini btn-delete" onclick="confirmDelete('${x.origin}', ${x.id}, '${x.label}')">Excluir</button>
                        </div>
                        <b>${x.label}</b>
                        <div class="small">${formatDateToBR(x.date)} • ${x.extra || ''}</div>
                        <div class="value ${x.type === 'in' ? 'in' : 'out'} value-maskable">${x.type === 'in' ? '+' : '-'} ${money(x.val)}</div>
                    </div>
                `).join('') : '<div class="small">Nenhuma movimentação encontrada no período.</div>';

                container.innerHTML = subFilterHtml + itemsHtml;
            }
}

// ==========================================
// MODAL E HISTÓRICO DE CLIENTES
// ==========================================

let clientSortFilter = 'spent';

/**
 * Abre o modal de histórico e listagem de clientes.
 */
function openClientsModal() {
    const modal = document.getElementById('modalClients');
    if (modal) {
        modal.classList.remove('hidden');
        const inputSearch = document.getElementById('clientSearchInput');
        if (inputSearch) inputSearch.value = '';
        renderClientsList();
    }
}

/**
 * Fecha o modal de histórico de clientes.
 */
function closeClientsModal() {
    const modal = document.getElementById('modalClients');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Alterna a ordenação dos clientes no modal.
 * @param {string} val Critério ('spent', 'alpha', 'recent', 'oldest').
 */
function switchClientSort(val) {
    clientSortFilter = val;
    renderClientsList();
}

/**
 * Renderiza a lista de clientes dentro do modal de histórico.
 */
function renderClientsList() {
    const container = document.getElementById('modalClientsContent');
    if (!container) return;

    const searchInput = document.getElementById('clientSearchInput');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const allServices = window.appDataRaw?.services || [];

    // Agrupa todos os serviços por cliente
    const clientMap = {};
    allServices.forEach(s => {
        const rawName = s.client ? s.client.trim() : 'Cliente Sem Nome';
        const key = rawName.toLowerCase();
        if (!clientMap[key]) {
            clientMap[key] = {
                name: rawName,
                phone: s.phone || '',
                services: [],
                totalPaid: 0,
                totalPending: 0,
                totalAll: 0,
                latestDate: s.date || '',
                oldestDate: s.date || ''
            };
        }
        if (s.phone && !clientMap[key].phone) {
            clientMap[key].phone = s.phone;
        }
        clientMap[key].services.push(s);
        if (s.status === 'Pago') {
            clientMap[key].totalPaid += (s.val || 0);
        } else if (s.status === 'Agendado' || s.status === 'Realizado') {
            clientMap[key].totalPending += (s.val || 0);
        }
        clientMap[key].totalAll += (s.val || 0);

        if (s.date) {
            if (!clientMap[key].latestDate || s.date > clientMap[key].latestDate) {
                clientMap[key].latestDate = s.date;
            }
            if (!clientMap[key].oldestDate || s.date < clientMap[key].oldestDate) {
                clientMap[key].oldestDate = s.date;
            }
        }
    });

    let clientList = Object.values(clientMap);

    if (search) {
        clientList = clientList.filter(c =>
            c.name.toLowerCase().includes(search) ||
            (c.phone && c.phone.toLowerCase().includes(search))
        );
    }

    // Ordenação
    if (clientSortFilter === 'spent') {
        clientList.sort((a, b) => (b.totalPaid || 0) - (a.totalPaid || 0) || (b.totalAll || 0) - (a.totalAll || 0));
    } else if (clientSortFilter === 'alpha') {
        clientList.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    } else if (clientSortFilter === 'recent') {
        clientList.sort((a, b) => (b.latestDate || '').localeCompare(a.latestDate || ''));
    } else if (clientSortFilter === 'oldest') {
        clientList.sort((a, b) => (a.oldestDate || '').localeCompare(b.oldestDate || ''));
    }

    if (clientList.length === 0) {
        container.innerHTML = '<div style="padding: 24px 16px; text-align: center; color: #666; font-size: 13px;">Nenhum cliente encontrado.</div>';
        return;
    }

    const clientsHtml = clientList.map((c, idx) => {
        const clientId = `client-${idx}`;
        const historicoServicos = c.services.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const servicosListHtml = historicoServicos.map(s => `
            <div class="client-service-item">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span class="tag tag-${s.status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}" style="font-size: 10px; padding: 2px 6px;">${s.status}</span>
                        <b style="font-size: 13px; color: #333; margin-left: 4px;">${s.desc || 'Serviço'}</b>
                    </div>
                    <span class="value-maskable" style="font-weight: bold; font-size: 13px; color: ${s.status === 'Pago' ? '#2e7d32' : '#e65100'};">
                        ${money(s.val)}
                    </span>
                </div>
                <div class="small" style="margin-top: 4px; color: #666;">
                    📅 ${formatDateToBR(s.date)} ${s.pay ? '• Pago via ' + s.pay : ''} ${s.time ? '• ' + s.time : ''}
                </div>
                ${s.notes ? `<div style="font-size: 11px; color: #777; margin-top: 2px;">📍 ${s.notes}</div>` : ''}
            </div>
        `).join('');

        const safeClientName = c.name.replace(/'/g, "\\'");
        const safePhone = (c.phone || '').replace(/'/g, "\\'");
        const cliSvcKey = (c.phone && c.services[0]) ? __storeViewData('service', c.services[0]) : null;

        return `
            <div class="client-card">
                <div class="client-card-header" onclick="toggleClientDetails('${clientId}')">
                    <div style="flex: 1;">
                        <div class="client-card-title">👤 ${c.name}</div>
                        <div class="client-card-meta">
                            ${c.phone ? `<span style="color: #2e7d32;">📞 ${c.phone}</span> • ` : ''}
                            <span><b>${c.services.length}</b> serviço(s)</span>
                        </div>
                    </div>
                    <div style="text-align: right; margin-left: 10px;">
                        <div class="client-card-total value-maskable">${money(c.totalPaid)}</div>
                        <span class="small" style="display: block; color: #666; font-size: 10px;">Total pago</span>
                        <span id="client-icon-${clientId}" style="font-size: 16px; color: #888;">▼</span>
                    </div>
                </div>
                <div id="client-body-${clientId}" class="client-card-body hidden">
                    <div class="client-summary-box">
                        <div>Total Pago: <b class="value-maskable" style="color: #2e7d32;">${money(c.totalPaid)}</b></div>
                        ${c.totalPending > 0 ? `<div>Pendente: <b class="value-maskable" style="color: #e65100;">${money(c.totalPending)}</b></div>` : ''}
                        <div>Último atendimento: <b>${formatDateToBR(c.latestDate)}</b></div>
                    </div>

                    <div style="display: flex; gap: 8px; margin: 10px 0;">
                        ${c.phone ? `<button class="btn-action-lg btn-whatsapp-lg" style="flex: 1; min-height: 38px; padding: 6px 10px; font-size: 13px;" onclick='openWhatsApp(__getViewData("${cliSvcKey}"))'>WhatsApp</button>` : ''}
                        <button class="btn-action-lg primary" style="flex: 1; min-height: 38px; padding: 6px 10px; font-size: 13px;" onclick="novoServicoParaCliente('${safeClientName}', '${safePhone}')">＋ Novo Serviço</button>
                    </div>

                    <!-- Ações de Privacidade & LGPD -->
                    <div style="display: flex; gap: 6px; margin: 6px 0 10px 0; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px dashed #cbd5e1; align-items: center; justify-content: space-between;">
                        <span style="font-size: 11px; color: #64748b; font-weight: bold;">Direitos LGPD:</span>
                        <div style="display: flex; gap: 6px;">
                            <button type="button" class="btn-mini" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 3px 6px; font-size: 10px; border-radius: 4px;" title="Exportar dados do titular em JSON" onclick="exportarDadosDoTitular('${safeClientName}')">📥 Exportar Dados</button>
                            <button type="button" class="btn-mini" style="background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 3px 6px; font-size: 10px; border-radius: 4px;" title="Anonimizar nome e telefone do cliente" onclick="anonimizarDadosCliente('${safeClientName}')">🛡️ Anonimizar</button>
                        </div>
                    </div>

                    <h4 style="font-size: 13px; margin: 10px 0 6px 0; color: #444; border-bottom: 1px solid #eee; padding-bottom: 4px;">Histórico de Atendimentos:</h4>
                    <div class="client-services-list">
                        ${servicosListHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = clientsHtml;
}

/**
 * Abre o formulário de novo serviço já com o nome e telefone do cliente preenchidos fechando o modal.
 * @param {string} clientName Nome do cliente.
 * @param {string} phone Telefone do cliente.
 */
function novoServicoParaCliente(clientName, phone) {
    closeClientsModal();
    openServiceForm();
    document.getElementById('sClient').value = clientName;
    document.getElementById('sPhone').value = phone || '';
}

/**
 * Expande ou recolhe o histórico de atendimentos de um cliente específico.
 * @param {string} clientId Identificador do card do cliente.
 */
function toggleClientDetails(clientId) {
    const body = document.getElementById(`client-body-${clientId}`);
    const icon = document.getElementById(`client-icon-${clientId}`);
    if (body) {
        const isHidden = body.classList.contains('hidden');
        body.classList.toggle('hidden');
        if (icon) icon.textContent = isHidden ? '▲' : '▼';
    }
}