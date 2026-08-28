// ==========================================
// PAINEL ANUAL & TERMOMETRO DO MEI
// ==========================================

const LIMITE_MEI_ANUAL = 81000; // R$ 81.000,00 anuais da Receita Federal

/**
 * Abre o modal de Fechamento Anual e Termometro do MEI.
 */
function openAnnualModal() {
    const rawServices = window.appDataRaw?.services || [];
    const rawExpenses = window.appDataRaw?.expenses || [];
    
    // Coleta todos os anos presentes nas datas
    const yearSet = new Set();
    const currentYear = new Date().getFullYear().toString();
    yearSet.add(currentYear);

    rawServices.forEach(s => {
        if (s.date && s.date.length >= 4) {
            yearSet.add(s.date.substring(0, 4));
        }
    });

    rawExpenses.forEach(e => {
        if (e.date && e.date.length >= 4) {
            yearSet.add(e.date.substring(0, 4));
        }
    });

    const years = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
    const yearSelect = document.getElementById('annualYearSelect');
    
    if (yearSelect) {
        yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        // Seleciona o ano corrente ou do filtro
        const filterVal = document.getElementById('filterMonth')?.value;
        if (filterVal && filterVal.includes('-')) {
            const fYear = filterVal.split('-')[0];
            if (years.includes(fYear)) {
                yearSelect.value = fYear;
            }
        }
    }

    renderAnnualReport(yearSelect ? yearSelect.value : currentYear);
    document.getElementById('modalAnnual').classList.remove('hidden');
}

/**
 * Fecha o modal anual.
 */
function closeAnnualModal() {
    document.getElementById('modalAnnual').classList.add('hidden');
}

/**
 * Renderiza o relatorio anual completo com termometro do MEI e fechamento mes a mes.
 */
function renderAnnualReport(year) {
    if (!year) year = new Date().getFullYear().toString();

    const rawServices = window.appDataRaw?.services || [];
    const rawExpenses = window.appDataRaw?.expenses || [];

    // Filtra registros do ano selecionado
    const servicesYear = rawServices.filter(s => s.status === 'Pago' && s.date && s.date.startsWith(year));
    const expensesYear = rawExpenses.filter(e => e.date && e.date.startsWith(year));

    const totalInYear = servicesYear.reduce((acc, s) => acc + numVal(s.val), 0);
    const totalOutYear = expensesYear.reduce((acc, e) => acc + numVal(e.val), 0);
    const lucroYear = totalInYear - totalOutYear;

    // Termometro do MEI
    const percMei = Math.min(100, (totalInYear / LIMITE_MEI_ANUAL) * 100).toFixed(1);
    const faltaMei = Math.max(0, LIMITE_MEI_ANUAL - totalInYear);
    const excedeuMei = totalInYear > LIMITE_MEI_ANUAL;

    // Determina a cor do termometro do MEI
    let corMei = '#2e7d32'; // Verde
    let msgMei = `✅ Dentro do limite do MEI. Restam <b>${money(faltaMei)}</b> para o teto anual.`;
    if (totalInYear >= LIMITE_MEI_ANUAL * 0.8 && !excedeuMei) {
        corMei = '#f57f17'; // Laranja/Amarelo de atencao (80%+)
        msgMei = `⚠️ Atenção! Você já atingiu <b>${percMei}%</b> do limite do MEI. Restam <b>${money(faltaMei)}</b>.`;
    } else if (excedeuMei) {
        corMei = '#d32f2f'; // Vermelho (Excedeu)
        msgMei = `🚨 Atenção: O faturamento ultrapassou o teto anual do MEI em <b>+${money(totalInYear - LIMITE_MEI_ANUAL)}</b>!`;
    }

    // Meses do Ano
    const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let mesesComFaturamento = 0;
    let tabelaMesesHtml = '';

    nomesMeses.forEach((nomeMes, index) => {
        const mesPad = String(index + 1).padStart(2, '0');
        const mesStr = `${year}-${mesPad}`;

        const inMes = servicesYear.filter(s => s.date && s.date.startsWith(mesStr)).reduce((acc, s) => acc + numVal(s.val), 0);
        const outMes = expensesYear.filter(e => e.date && e.date.startsWith(mesStr)).reduce((acc, e) => acc + numVal(e.val), 0);
        const lucroMes = inMes - outMes;

        if (inMes > 0 || outMes > 0) {
            mesesComFaturamento++;
        }

        const barInPerc = totalInYear > 0 ? Math.min(100, (inMes / (totalInYear / 4 || 1)) * 100) : 0;

        tabelaMesesHtml += `
            <div class="annual-month-row">
                <div class="annual-month-header">
                    <span class="annual-month-name">${nomeMes}</span>
                    <span class="annual-month-lucro ${lucroMes >= 0 ? 'lucro-pos' : 'lucro-neg'} value-maskable">
                        ${lucroMes >= 0 ? '+' : ''}${money(lucroMes)}
                    </span>
                </div>
                <div class="annual-month-details">
                    <span>Entradas: <b class="value-maskable" style="color: #2e7d32;">${money(inMes)}</b></span>
                    <span>Saídas: <b class="value-maskable" style="color: #d32f2f;">${money(outMes)}</b></span>
                </div>
                <div class="annual-mini-progress">
                    <div class="annual-mini-fill" style="width: ${barInPerc}%;"></div>
                </div>
            </div>
        `;
    });

    const mediaMensal = mesesComFaturamento > 0 ? (totalInYear / mesesComFaturamento) : 0;

    const container = document.getElementById('annualReportContent');
    if (!container) return;

    container.innerHTML = `
        <!-- Termometro do MEI -->
        <div class="mei-thermometer-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <b style="font-size: 13px; color: #333;">📊 Limite Anual MEI (${year})</b>
                <span style="font-weight: bold; color: ${corMei}; font-size: 13px;">${percMei}%</span>
            </div>

            <div class="mei-progress-bg">
                <div class="mei-progress-fill" style="width: ${percMei}%; background: ${corMei};"></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666; margin-top: 4px;">
                <span>Faturado: <b class="value-maskable">${money(totalInYear)}</b></span>
                <span>Teto: <b>${money(LIMITE_MEI_ANUAL)}</b></span>
            </div>

            <div class="mei-status-msg" style="border-left: 3px solid ${corMei};">
                ${msgMei}
            </div>
        </div>

        <!-- Cards de Resumo Anual -->
        <div class="annual-summary-grid">
            <div class="annual-stat-card card-green">
                <small>Faturamento Anual</small>
                <b class="value-maskable">${money(totalInYear)}</b>
                <span>Média: <b class="value-maskable">${money(mediaMensal)}/mês</b></span>
            </div>
            <div class="annual-stat-card card-red">
                <small>Total de Despesas</small>
                <b class="value-maskable">${money(totalOutYear)}</b>
                <span>${servicesYear.length} serviços pagos</span>
            </div>
            <div class="annual-stat-card card-blue" style="grid-column: span 2;">
                <small>Lucro Líquido Real do Ano</small>
                <b style="font-size: 18px;" class="value-maskable">${money(lucroYear)}</b>
            </div>
        </div>

        <!-- Fechamento Mês a Mês -->
        <div style="margin-top: 14px;">
            <b style="font-size: 13px; color: #222; display: block; margin-bottom: 8px;">📅 Desempenho Mês a Mês</b>
            <div class="annual-months-list">
                ${tabelaMesesHtml}
            </div>
        </div>
    `;
}
