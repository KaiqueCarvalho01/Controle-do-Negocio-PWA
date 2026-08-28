// ==========================================
// 13º SALÁRIO & RESERVA DE FIM DE ANO DO AUTÔNOMO
// ==========================================

/**
 * Retorna as configurações completas do 13º Salário.
 */
function getDecimoConfig() {
    try {
        const allConfigs = getAllCaixaConfigs();
        return {
            metaAnual: numVal(allConfigs.metaDecimoTerceiro) || 0,
            modo: allConfigs.modoDecimo || 'aporte_gastos', // 'aporte_gastos', 'aporte_mensal' ou 'excedente_giro'
            aporteMensal: numVal(allConfigs.aporteMensalDecimo) || 0
        };
    } catch (e) {
        return { metaAnual: 0, modo: 'aporte_gastos', aporteMensal: 0 };
    }
}

/**
 * Salva as configurações do 13º Salário no armazenamento.
 */
function saveDecimoConfig() {
    if (!validarCampoValorMonetario(document.getElementById('inputMetaDecimo')) ||
        !validarCampoValorMonetario(document.getElementById('inputAporteMensalDecimo'))) {
        return;
    }
    const modo = document.querySelector('input[name="modoDecimoRadio"]:checked')?.value || 'aporte_gastos';
    let metaAnual = numVal(document.getElementById('inputMetaDecimo').value);
    let aporteMensal = numVal(document.getElementById('inputAporteMensalDecimo')?.value);

    if (modo !== 'excedente_giro') {
        if (aporteMensal > 0 && metaAnual <= 0) {
            metaAnual = aporteMensal * 12;
        } else if (metaAnual > 0 && aporteMensal <= 0) {
            aporteMensal = metaAnual / 12;
        }
    }

    const allConfigs = getAllCaixaConfigs();
    allConfigs.metaDecimoTerceiro = metaAnual;
    allConfigs.modoDecimo = modo;
    allConfigs.aporteMensalDecimo = aporteMensal;
    
    localStorage.setItem('app_caixa_config', JSON.stringify(allConfigs));
    renderDecimoInfo();
    if (typeof renderView === 'function') renderView();
    alert('Configurações do 13º Salário salvas com sucesso!');
}

/**
 * Alterna a visualização dos campos conforme o modo escolhido.
 */
function toggleModoDecimoInputs(modo) {
    const boxAporte = document.getElementById('boxAporteMensalField');
    if (boxAporte) {
        if (modo === 'excedente_giro') {
            boxAporte.style.display = 'none';
        } else {
            boxAporte.style.display = 'block';
        }
    }
}

/**
 * Abre o modal exclusivo do 13º Salário.
 */
function openDecimoModal() {
    renderDecimoInfo();
    const modal = document.getElementById('modalDecimo');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Fecha o modal do 13º Salário.
 */
function closeDecimoModal() {
    const modal = document.getElementById('modalDecimo');
    if (modal) modal.classList.add('hidden');
}

/**
 * Abre o formulário de despesas já pré-configurado para lançar o aporte do 13º salário deste mês.
 */
function lancarAporteDecimoNosGastos() {
    const config = getDecimoConfig();
    const valorSugerido = config.aporteMensal > 0 ? config.aporteMensal : (config.metaAnual > 0 ? (config.metaAnual / 12).toFixed(2) : '');
    
    closeDecimoModal();
    if (typeof switchTab === 'function') {
        switchTab('expenses');
    }
    if (typeof openExpenseForm === 'function') {
        openExpenseForm(null, {
            desc: 'Aporte 13º Salário / Férias',
            cat: '13º Salário / Férias',
            val: valorSugerido,
            date: today
        });
    }
}

/**
 * Renderiza todos os cálculos e barras de progresso do 13º Salário.
 */
function renderDecimoInfo() {
    const config = getDecimoConfig();
    
    const inputMeta = document.getElementById('inputMetaDecimo');
    if (inputMeta && document.activeElement !== inputMeta) {
        inputMeta.value = config.metaAnual > 0 ? config.metaAnual : '';
    }

    const inputAporte = document.getElementById('inputAporteMensalDecimo');
    if (inputAporte && document.activeElement !== inputAporte) {
        inputAporte.value = config.aporteMensal > 0 ? config.aporteMensal : (config.metaAnual > 0 ? (config.metaAnual / 12).toFixed(2) : '');
    }

    const radioGastos = document.getElementById('radioModoGastos');
    const radioAporte = document.getElementById('radioModoAporte');
    const radioGiro = document.getElementById('radioModoGiro');

    if (config.modo === 'excedente_giro') {
        if (radioGiro) radioGiro.checked = true;
    } else if (config.modo === 'aporte_mensal') {
        if (radioAporte) radioAporte.checked = true;
    } else {
        if (radioGastos) radioGastos.checked = true;
    }
    toggleModoDecimoInputs(config.modo);

    const allConfigs = getAllCaixaConfigs();
    const metaGiroGlobal = numVal(allConfigs.targetCapitalGiro) || 0;

    const allServices = window.appDataRaw?.services || [];
    const allExpenses = window.appDataRaw?.expenses || [];

    const currentYear = new Date().getFullYear().toString();
    const currentMonthNum = new Date().getMonth() + 1; // 1 a 12

    let atingidoDecimo = 0;
    let percDecimo = 0;
    let faltaDecimo = 0;
    let bonusExtra = 0;
    let detalhamentoHtml = '';

    if (config.modo === 'aporte_gastos') {
        // MODO 1: Aportes Reais Lançados na Aba de Gastos
        const aportesDoAno = allExpenses.filter(e => {
            const isAnoAtual = e.date && e.date.startsWith(currentYear);
            const isCatDecimo = e.cat === '13º Salário / Férias';
            const isDescDecimo = (e.desc || '').toLowerCase().includes('13º') || (e.desc || '').toLowerCase().includes('decimo');
            return isAnoAtual && (isCatDecimo || isDescDecimo);
        });

        atingidoDecimo = aportesDoAno.reduce((acc, e) => acc + numVal(e.val), 0);
        if (config.metaAnual > 0) {
            percDecimo = Math.min(100, (atingidoDecimo / config.metaAnual) * 100).toFixed(1);
            faltaDecimo = Math.max(0, config.metaAnual - atingidoDecimo);
            bonusExtra = Math.max(0, atingidoDecimo - config.metaAnual);
        } else {
            percDecimo = atingidoDecimo > 0 ? 100 : 0;
            faltaDecimo = 0;
        }

        let listaAportesHtml = '';
        if (aportesDoAno.length > 0) {
            listaAportesHtml = `
                <div style="margin-top: 8px; border-top: 1px dashed #ddd; padding-top: 6px;">
                    <small style="color: #666; font-weight: bold; display: block; margin-bottom: 4px;">📅 Lançamentos de 13º no Ano (${currentYear}):</small>
                    ${aportesDoAno.map(ap => `
                        <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 3px; color: #444;">
                            <span>• ${ap.date ? ap.date.split('-').reverse().join('/') : ''} - ${ap.desc || 'Aporte'}</span>
                            <b class="value-maskable" style="color: #2e7d32;">${money(ap.val)}</b>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            listaAportesHtml = `
                <div style="margin-top: 8px; font-size: 11.5px; color: #777; font-style: italic;">
                    Nenhum aporte de 13º lançado nos gastos em ${currentYear} ainda.
                </div>
            `;
        }

        detalhamentoHtml = `
            <div class="decimo-flow-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <b style="font-size: 13px; color: #333;">📋 Aportes Reais nos Gastos:</b>
                    <button type="button" class="primary" style="font-size: 11.5px; padding: 4px 10px; border-radius: 6px;" onclick="lancarAporteDecimoNosGastos()">＋ Lançar Aporte</button>
                </div>
                <div class="decimo-flow-item">
                    <span>• Total Guardado no Ano (${currentYear}):</span>
                    <b class="value-maskable" style="color: #2e7d32;">${money(atingidoDecimo)}</b>
                </div>
                <div class="decimo-flow-item">
                    <span>• Meta Anual Definida:</span>
                    <b class="value-maskable">${money(config.metaAnual)}</b>
                </div>
                <div class="decimo-flow-item" style="border-top: 1px dashed #ddd; padding-top: 6px; margin-top: 4px;">
                    <span>• Falta para a Meta:</span>
                    <b class="value-maskable" style="color: #e65100;">${money(faltaDecimo)}</b>
                </div>
                ${listaAportesHtml}
            </div>
        `;

    } else if (config.modo === 'aporte_mensal') {
        // MODO 2: Aporte Automático Fixo
        const aporteMensal = config.aporteMensal > 0 ? config.aporteMensal : (config.metaAnual / 12);
        const mesesDecorridos = Math.min(12, currentMonthNum);
        
        atingidoDecimo = aporteMensal * mesesDecorridos;
        if (config.metaAnual > 0) {
            percDecimo = Math.min(100, (atingidoDecimo / config.metaAnual) * 100).toFixed(1);
            faltaDecimo = Math.max(0, config.metaAnual - atingidoDecimo);
        } else {
            percDecimo = 100;
            faltaDecimo = 0;
        }

        const mesesRestantes = Math.max(0, 12 - mesesDecorridos);

        detalhamentoHtml = `
            <div class="decimo-flow-card">
                <b style="font-size: 13px; color: #333; display: block; margin-bottom: 8px;">📋 Como o seu 13º é calculado (Automático):</b>
                <div class="decimo-flow-item">
                    <span>• Aporte Planejado por Mês:</span>
                    <b class="value-maskable" style="color: #1976d2;">${money(aporteMensal)}/mês</b>
                </div>
                <div class="decimo-flow-item">
                    <span>• Meses Acumulados no Ano (${currentYear}):</span>
                    <b>${mesesDecorridos} de 12 meses (${money(atingidoDecimo)})</b>
                </div>
                <div class="decimo-flow-item" style="border-top: 1px dashed #ddd; padding-top: 6px; margin-top: 4px;">
                    <span>• Meses Faltantes até Dezembro:</span>
                    <b style="color: #e65100;">${mesesRestantes} meses (${money(faltaDecimo)})</b>
                </div>
            </div>
        `;
    } else {
        // MODO 3: Excedente do Capital de Giro
        const monthlyData = {};
        allServices.forEach(s => {
            if (s.status === 'Pago' && s.date) {
                const m = s.date.substring(0, 7);
                if (!monthlyData[m]) monthlyData[m] = { in: 0, out: 0 };
monthlyData[m].in += numVal(s.val);
                }
        });

        allExpenses.forEach(e => {
            if (e.date) {
                const m = e.date.substring(0, 7);
                if (!monthlyData[m]) monthlyData[m] = { in: 0, out: 0 };
monthlyData[m].out += numVal(e.val);
                }
        });

        let totalGiroAcumuladoEmpresa = 0;
        for (const m in monthlyData) {
            const mConfig = getCaixaConfig(m);
            const mLucro = monthlyData[m].in - monthlyData[m].out;
            const mSalario = mConfig.fundoCaixa || 0;

            if (mLucro > 0) {
                totalGiroAcumuladoEmpresa += Math.max(0, mLucro - mSalario);
            } else {
                totalGiroAcumuladoEmpresa += mLucro;
            }
        }
        totalGiroAcumuladoEmpresa = Math.max(0, totalGiroAcumuladoEmpresa);

        let excedenteParaDecimo = 0;
        if (metaGiroGlobal > 0) {
            excedenteParaDecimo = Math.max(0, totalGiroAcumuladoEmpresa - metaGiroGlobal);
        } else {
            excedenteParaDecimo = totalGiroAcumuladoEmpresa;
        }

        atingidoDecimo = config.metaAnual > 0 ? Math.min(config.metaAnual, excedenteParaDecimo) : excedenteParaDecimo;
        percDecimo = config.metaAnual > 0 ? Math.min(100, (excedenteParaDecimo / config.metaAnual) * 100).toFixed(1) : (excedenteParaDecimo > 0 ? 100 : 0);
        faltaDecimo = Math.max(0, config.metaAnual - excedenteParaDecimo);
        bonusExtra = config.metaAnual > 0 ? Math.max(0, excedenteParaDecimo - config.metaAnual) : 0;

        detalhamentoHtml = `
            <div class="decimo-flow-card">
                <b style="font-size: 13px; color: #333; display: block; margin-bottom: 8px;">🔍 Como o seu 13º é acumulado (Excedente):</b>
                <div class="decimo-flow-item">
                    <span>1. Reserva de Segurança da Empresa (Giro):</span>
                    <b class="value-maskable">${money(metaGiroGlobal)}</b>
                </div>
                <div class="decimo-flow-item">
                    <span>2. Caixa Total Acumulado no Negócio:</span>
                    <b class="value-maskable" style="color: #1976d2;">${money(totalGiroAcumuladoEmpresa)}</b>
                </div>
                <div class="decimo-flow-item" style="border-top: 1px dashed #ddd; padding-top: 6px; margin-top: 4px;">
                    <span>3. Lucro Excedente que foi pro 13º:</span>
                    <b class="value-maskable" style="color: #2e7d32;">${money(excedenteParaDecimo)}</b>
                </div>
            </div>
        `;
    }

    const container = document.getElementById('decimoReportContainer');
    if (!container) return;

    let statusHtml = '';
    if (config.metaAnual <= 0) {
        statusHtml = `<div class="decimo-badge decimo-badge-info">💡 Defina um valor para sua meta anual de 13º acima.</div>`;
    } else if (atingidoDecimo >= config.metaAnual) {
        statusHtml = `<div class="decimo-badge decimo-badge-success">🎉 Parabéns! Sua meta de 13º Salário de <b>${money(config.metaAnual)}</b> está 100% garantida para retirada em Dezembro!</div>`;
    } else {
        statusHtml = `<div class="decimo-badge decimo-badge-pending">⏳ Acumulado: <b>${money(atingidoDecimo)}</b>. Falta <b>${money(faltaDecimo)}</b> para completar.</div>`;
    }

    const bonusHtml = bonusExtra > 0 ? `
        <div style="background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 10px 12px; margin-top: 10px;">
            <b style="color: #f57f17; font-size: 13px;">🎁 Bônus Extra / Lucro Livre: +${money(bonusExtra)}</b>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">
                Você bateu a meta de 13º Salário e o valor excedente está totalmente livre!
            </div>
        </div>
    ` : '';

    container.innerHTML = `
        <!-- Barra de Progresso do 13º -->
        <div class="decimo-progress-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <b style="font-size: 14px; color: #2e7d32;">🎄 Progresso do 13º Salário (${currentYear})</b>
                <b style="font-size: 14px; color: #2e7d32;">${percDecimo}%</b>
            </div>

            <div class="decimo-bar-bg">
                <div class="decimo-bar-fill ${atingidoDecimo >= config.metaAnual && config.metaAnual > 0 ? 'decimo-ok' : ''}" style="width: ${percDecimo}%;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #555; margin-top: 6px;">
                <span>Acumulado: <b class="value-maskable" style="color: #2e7d32;">${money(atingidoDecimo)}</b></span>
                <span>Meta Anual: <b class="value-maskable">${money(config.metaAnual)}</b></span>
            </div>

            ${statusHtml}
        </div>

        ${bonusHtml}

        ${detalhamentoHtml}

        <!-- Dica de Finanças -->
        <div class="decimo-tip-box">
            💡 <b>Dica:</b> No modo de <i>Aporte Real nos Gastos</i>, você lança as saídas reais para sua reserva na aba de Gastos. No modo <i>Automático</i>, o app calcula por estimativa. E no modo <i>Excedente</i>, o 13º só acumula quando a empresa já tem toda a reserva do Capital de Giro preenchida.
        </div>
    `;
}
