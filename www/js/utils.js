// ==========================================
// UTILITÁRIOS E FORMATAÇÃO
// ==========================================

/**
 * Formata um valor numérico para a moeda brasileira (ex: 1500 -> R$ 1.500,00).
 * @param {number} v Valor numérico.
 */
const money = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numVal(v));

/**
 * Retorna a data no formato 'YYYY-MM-DD' respeitando o fuso horário local do smartphone.
 * @param {Date} d Instância de Date (padrão: data atual).
 */
function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const today = getLocalDateString();

/**
 * Formata datas de 'YYYY-MM-DD' para 'DD/MM/YYYY' para exibição amigável na interface.
 * @param {string} dateStr Data em string.
 */
function formatDateToBR(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// ==========================================
// 4. VALIDAÇÃO VISUAL DE FORMULÁRIOS
// ==========================================

/**
 * Destaca visualmente um campo obrigatório não preenchido com borda vermelha e mensagem.
 * @param {HTMLElement} inputElement Elemento do formulário.
 * @param {string} message Mensagem de alerta a ser exibida.
 */
function destacarCampoErro(inputElement, message) {
    if (!inputElement) return;

    inputElement.classList.add('input-error');
    removerMensagemErro(inputElement);

    const msgSpan = document.createElement('span');
    msgSpan.className = 'error-msg';
    msgSpan.textContent = message;
    inputElement.insertAdjacentElement('afterend', msgSpan);

    const limparErro = () => {
        inputElement.classList.remove('input-error');
        removerMensagemErro(inputElement);
        inputElement.removeEventListener('input', limparErro);
        inputElement.removeEventListener('change', limparErro);
    };

    inputElement.addEventListener('input', limparErro);
    inputElement.addEventListener('change', limparErro);
}

/**
 * Remove a mensagem de erro contextual anexada a um input.
 * @param {HTMLElement} inputElement Elemento de referência.
 */
function removerMensagemErro(inputElement) {
    if (!inputElement || !inputElement.parentNode) return;
    const nextEl = inputElement.nextElementSibling;
    if (nextEl && nextEl.classList.contains('error-msg')) {
        nextEl.remove();
    }
}

/**
 * Limpa todos os destaques e mensagens de erro de uma seção de formulário.
 * @param {string} formId ID da tag do formulário.
 */
function limparTodosErrosFormulario(formId) {
    const formSection = document.getElementById(formId);
    if (!formSection) return;

    formSection.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    formSection.querySelectorAll('.error-msg').forEach(el => el.remove());
}

// ==========================================
// 5. MODO PRIVACIDADE (MASCARAR VALORES)
// ==========================================

let maskValuesEnabled = localStorage.getItem('app_mask_values') === 'true';

/**
 * Inicializa o estado visual do modo de privacidade ao abrir o aplicativo.
 */
function initMaskValues() {
    if (maskValuesEnabled) {
        document.body.classList.add('blur-values');
        const btn = document.getElementById('btnMask');
        if (btn) btn.textContent = '🙈';
    }
}

/**
 * Alterna entre exibir e mascarar os valores financeiros na tela.
 */
function toggleMaskValues() {
    maskValuesEnabled = !maskValuesEnabled;
    localStorage.setItem('app_mask_values', maskValuesEnabled);
    const btn = document.getElementById('btnMask');
    if (maskValuesEnabled) {
        document.body.classList.add('blur-values');
        if (btn) btn.textContent = '🙈';
    } else {
        document.body.classList.remove('blur-values');
        if (btn) btn.textContent = '👁️';
    }
}

// ==========================================
// 6. NORMALIZAÇÃO DE VALORES MONETÁRIOS (RETROCOMPATIBILIDADE)
// ==========================================
// Backups antigos ou dados legados podem conter 'val' em string (ex: "150.00",
// "1.234,56") ou ausente. Se esses valores entrarem nas somas sem conversão,
// o cálculo quebra (concatenação de strings ou NaN). Estas funções garantem
// números seguros SEM modificar registros já numéricos nem remover dados.

/**
 * Converte um valor monetário (número ou string no formato pt-BR/en-US) para
 * um número seguro. Nunca retorna NaN.
 * @param {*} v Valor bruto (number, string ou vazio).
 * @returns {number}
 */
function numVal(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v).replace(/[R$\s]/g, '');
    if (s.includes(',') && s.includes('.')) {
        // Formato pt-BR completo "1.234,56": ponto é milhar, vírgula é decimal.
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        // "150,10" → "150.10"
        s = s.replace(',', '.');
    }
    // "150.10" (ponto decimal en-US) permanece como está.
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

/**
 * Normaliza um serviço: garante 'val' e 'labor' como números. Retorna o mesmo
 * objeto se nada mudou (sem cópia desnecessária) ou uma cópia corrigida.
 * @param {Object} s Registro de serviço.
 */
function normalizarServico(s) {
    if (!s || typeof s !== 'object') return null;
    let novo = s;
    let mudou = false;
    if (s.val !== undefined) {
        const n = numVal(s.val);
        if (n !== s.val) { if (!mudou) { novo = Object.assign({}, s); mudou = true; } novo.val = n; }
    }
    if (s.labor !== undefined) {
        const n = numVal(s.labor);
        if (n !== s.labor) { if (!mudou) { novo = Object.assign({}, s); mudou = true; } novo.labor = n; }
    }
    return novo;
}

/**
 * Normaliza uma despesa / lançamento rápido: garante 'val' como número.
 * @param {Object} e Registro de despesa ou lançamento.
 */
function normalizarDespesa(e) {
    if (!e || typeof e !== 'object') return null;
    const n = numVal(e.val);
    return n === e.val ? e : Object.assign({}, e, { val: n });
}

/**
 * Normaliza um lançamento rápido (quickEntries): garante 'val' como número.
 * @param {Object} q Registro de lançamento rápido.
 */
function normalizarLancamento(q) {
    return normalizarDespesa(q);
}

/**
 * Normaliza um item de estoque: garante 'qty', 'minQty', 'costPrice' e
 * 'salePrice' como números.
 * @param {Object} it Item de estoque.
 */
function normalizarEstoque(it) {
    if (!it || typeof it !== 'object') return null;
    let novo = it;
    let mudou = false;
    ['qty', 'minQty', 'costPrice', 'salePrice'].forEach(campo => {
        if (it[campo] !== undefined) {
            const n = numVal(it[campo]);
            if (n !== it[campo]) {
                if (!mudou) { novo = Object.assign({}, it); mudou = true; }
                novo[campo] = n;
            }
        }
    });
    return novo;
}

/**
 * Normaliza uma lista de registros. Retorna { list, changed }.
 * Registros inválidos/null são removidos (nunca ocorre em dados normais).
 * @param {Array} lista Lista de registros.
 * @param {Function} normalizador Função de normalização individual.
 * @returns {{list: Array, changed: boolean}}
 */
function normalizarRegistros(lista, normalizador) {
    if (!Array.isArray(lista) || lista.length === 0) {
        return { list: Array.isArray(lista) ? lista : [], changed: false };
    }
    let changed = false;
    const list = lista.map(r => {
        const nr = normalizador(r);
        if (nr !== r) changed = true;
        return nr;
    }).filter(r => r !== null && r !== undefined);
    return { list, changed };
}

// ==========================================
// 6.1 ENTRADA MONETÁRIA RESTRITA (fields de texto)
// ==========================================
// Campos de dinheiro/dimensão usam type="text" + inputmode="decimal" para que o
// teclado numérico apareça (com vírgula) e o navegador NUNCA descarte caracteres
// silenciosamente (era o problema do type="number" no Chrome). Estas funções
// restringem a digitação a números/vírgula/ponto e mostram erro se algo inválido
// for inserido (ex.: colar uma string).

/**
 * Filtra a digitação de um campo monetário: remove qualquer caractere que não seja
 * dígito, vírgula ou ponto (mantendo um único de cada), e mostra um aviso quando
 * algo inválido é inserido. Uso: oninput="filtrarEntradaMonetaria(this)".
 * @param {HTMLInputElement} input Campo de valor.
 */
function filtrarEntradaMonetaria(input) {
    if (!input) return;
    const raw = input.value;
    let cleaned = raw.replace(/[^\d.,]/g, '');

    // Mantém apenas o primeiro ponto e a primeira vírgula digitados.
    let seenDot = false, seenComma = false, out = '';
    for (const ch of cleaned) {
        if (ch === '.') { if (seenDot) continue; seenDot = true; }
        if (ch === ',') { if (seenComma) continue; seenComma = true; }
        out += ch;
    }

    if (out !== raw) {
        input.value = out;
        destacarCampoErro(input, 'Somente números, vírgula ou ponto (ex: 150,10).');
        setTimeout(() => { removerMensagemErro(input); input.classList.remove('input-error'); }, 3000);
    }
}

/**
 * Valida um campo monetário no save: vazio é permitido (valor não informado).
 * Se houver conteúdo não numérico, destaca o erro e retorna false.
 * @param {HTMLInputElement} input Campo de valor.
 * @returns {boolean} true se o campo está válido (ou vazio).
 */
function validarCampoValorMonetario(input) {
    if (!input) return true;
    const v = input.value.trim();
    if (v === '') return true;
    if (!/^[\d.,]+$/.test(v) || !/\d/.test(v)) {
        destacarCampoErro(input, 'Valor inválido. Use apenas números (ex: 150,10).');
        return false;
    }
    return true;
}


