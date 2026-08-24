// ==========================================
// UTILITÁRIOS E FORMATAÇÃO
// ==========================================

/**
 * Formata um valor numérico para a moeda brasileira (ex: 1500 -> R$ 1.500,00).
 * @param {number} v Valor numérico.
 */
const money = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

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


