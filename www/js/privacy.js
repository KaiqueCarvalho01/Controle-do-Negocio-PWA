// ==========================================
// MÓDULO DE PRIVACIDADE, LGPD & SEGURANÇA (PIN)
// ==========================================

const PIN_STORAGE_KEY = 'app_pin_security_data';
let currentPinInput = '';

/**
 * Retorna os dados de segurança do PIN armazenados no localStorage.
 */
function getPinSecurityData() {
    try {
        const raw = localStorage.getItem(PIN_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error('Erro ao ler dados do PIN:', e);
        return null;
    }
}

/**
 * Verifica na inicialização se o bloqueio por PIN está ativo e abre a Lock Screen.
 */
function checkAppLockStatus() {
    const secData = getPinSecurityData();
    const lockScreen = document.getElementById('appLockScreen');
    if (!lockScreen) return;

    if (secData && secData.enabled && secData.pinHash) {
        // Bloqueia a tela
        currentPinInput = '';
        updatePinDots();
        lockScreen.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        lockScreen.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

/**
 * Atualiza os círculos de visualização do PIN na Lock Screen.
 */
function updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
        if (index < currentPinInput.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
}

/**
 * Processa o toque em um dígito do teclado na Lock Screen.
 */
function handlePinDigit(digit) {
    if (currentPinInput.length < 4) {
        currentPinInput += digit.toString();
        updatePinDots();

        if (currentPinInput.length === 4) {
            setTimeout(async () => {
                await submitUnlockPin();
            }, 100);
        }
    }
}

/**
 * Remove o último dígito inserido na Lock Screen.
 */
function handlePinBackspace() {
    if (currentPinInput.length > 0) {
        currentPinInput = currentPinInput.slice(0, -1);
        updatePinDots();
    }
}

/**
 * Limpa o PIN digitado.
 */
function clearPinInput() {
    currentPinInput = '';
    updatePinDots();
}

/**
 * Valida o PIN inserido e desbloqueia o app se correto.
 */
async function submitUnlockPin() {
    const secData = getPinSecurityData();
    if (!secData || !secData.pinHash) {
        unlockApp();
        return;
    }

    const isValid = await verifyHashedValue(currentPinInput, secData.pinSalt, secData.pinHash);
    if (isValid) {
        unlockApp();
    } else {
        const errorMsg = document.getElementById('lockScreenError');
        if (errorMsg) {
            errorMsg.textContent = '❌ PIN incorreto. Tente novamente.';
            errorMsg.classList.remove('hidden');
            setTimeout(() => {
                errorMsg.classList.add('hidden');
            }, 3000);
        }
        clearPinInput();
    }
}

/**
 * Desbloqueia o aplicativo e esconde a tela de bloqueio.
 */
function unlockApp() {
    const lockScreen = document.getElementById('appLockScreen');
    if (lockScreen) lockScreen.classList.add('hidden');
    document.body.style.overflow = '';
    clearPinInput();
}

// ==========================================
// CONFIGURAÇÃO & GERENCIAMENTO DE PIN
// ==========================================

/**
 * Abre o modal de configuração de segurança/PIN.
 */
function openSecurityModal() {
    const secData = getPinSecurityData();
    const isEnabled = secData && secData.enabled;

    const toggle = document.getElementById('togglePinLock');
    const pinFormArea = document.getElementById('pinSetupFormArea');
    const pinActiveArea = document.getElementById('pinActiveStatusArea');

    if (toggle) toggle.checked = !!isEnabled;

    if (isEnabled) {
        if (pinFormArea) pinFormArea.classList.add('hidden');
        if (pinActiveArea) pinActiveArea.classList.remove('hidden');
    } else {
        if (pinFormArea) pinFormArea.classList.add('hidden');
        if (pinActiveArea) pinActiveArea.classList.add('hidden');
    }

    document.getElementById('modalSecurityPin').classList.remove('hidden');
}

/**
 * Fecha o modal de configuração de segurança.
 */
function closeSecurityModal() {
    document.getElementById('modalSecurityPin').classList.add('hidden');
}

/**
 * Trata a alternância da chave de PIN (ligar/desligar).
 */
function onTogglePinSwitch(checked) {
    const pinFormArea = document.getElementById('pinSetupFormArea');
    const pinActiveArea = document.getElementById('pinActiveStatusArea');
    const secData = getPinSecurityData();

    if (checked) {
        if (secData && secData.pinHash) {
            // Já tinha PIN, apenas reativa
            secData.enabled = true;
            localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(secData));
            if (pinFormArea) pinFormArea.classList.add('hidden');
            if (pinActiveArea) pinActiveArea.classList.remove('hidden');
            alert('🔒 Bloqueio por PIN ativado!');
        } else {
            // Precisa cadastrar pela primeira vez
            if (pinFormArea) pinFormArea.classList.remove('hidden');
            if (pinActiveArea) pinActiveArea.classList.add('hidden');
        }
    } else {
        if (secData) {
            secData.enabled = false;
            localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(secData));
        }
        if (pinFormArea) pinFormArea.classList.add('hidden');
        if (pinActiveArea) pinActiveArea.classList.add('hidden');
        alert('🔓 Bloqueio por PIN desativado.');
    }
}

/**
 * Exibe o formulário para alterar o PIN ou cadastrar um novo.
 */
function showPinSetupForm() {
    document.getElementById('pinSetupFormArea').classList.remove('hidden');
    document.getElementById('pinActiveStatusArea').classList.add('hidden');
    document.getElementById('inputNewPin').value = '';
    document.getElementById('inputConfirmPin').value = '';
    document.getElementById('inputSecurityAnswer').value = '';
}

/**
 * Trata a mudança no select de pergunta de segurança para exibir campo de pergunta personalizada se escolhido.
 */
function onChangeSecurityQuestionSelect(val) {
    const customInput = document.getElementById('inputCustomSecurityQuestion');
    if (!customInput) return;
    if (val === 'custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
    }
}

/**
 * Salva novo PIN com pergunta e resposta secreta hasheadas.
 */
async function saveNewPinConfiguration() {
    const pin = document.getElementById('inputNewPin').value.trim();
    const pinConfirm = document.getElementById('inputConfirmPin').value.trim();
    const questionSelect = document.getElementById('selectSecurityQuestion').value;
    const customQuestion = document.getElementById('inputCustomSecurityQuestion') ? document.getElementById('inputCustomSecurityQuestion').value.trim() : '';
    const answer = document.getElementById('inputSecurityAnswer').value.trim();

    let finalQuestion = questionSelect;
    if (questionSelect === 'custom') {
        if (!customQuestion) {
            alert('Por favor, digite a sua pergunta de segurança personalizada.');
            return;
        }
        finalQuestion = customQuestion;
    }

    if (!pin || pin.length < 4) {
        alert('O PIN deve conter exatamente 4 dígitos numéricos.');
        return;
    }

    if (pin !== pinConfirm) {
        alert('A confirmação do PIN não confere. Digite novamente.');
        return;
    }

    if (!answer) {
        alert('Por favor, informe a resposta para a pergunta de segurança. Ela será sua chave de recuperação caso esqueça o PIN.');
        return;
    }

    try {
        const pinHashed = await hashValueWithSalt(pin);
        const answerHashed = await hashValueWithSalt(answer);

        const secData = {
            enabled: true,
            pinHash: pinHashed.hash,
            pinSalt: pinHashed.salt,
            question: finalQuestion,
            answerHash: answerHashed.hash,
            answerSalt: answerHashed.salt,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(secData));
        alert('✅ PIN e Pergunta de Segurança salvos com sucesso!');
        closeSecurityModal();
    } catch (e) {
        console.error('Erro ao salvar PIN:', e);
        alert('Erro ao processar segurança: ' + e.message);
    }
}

// ==========================================
// RECUPERAÇÃO E REDEFINIÇÃO DE PIN (ESQUECI MEU PIN)
// ==========================================

/**
 * Abre o modal de recuperação de PIN via pergunta de segurança.
 */
function openForgotPinModal() {
    const secData = getPinSecurityData();
    if (!secData || !secData.question) {
        alert('Nenhuma pergunta de segurança configurada. Caso tenha perdido o acesso, restaure seu arquivo de backup.');
        return;
    }

    document.getElementById('forgotPinQuestionText').textContent = secData.question;
    document.getElementById('inputForgotAnswer').value = '';
    document.getElementById('inputForgotNewPin').value = '';
    document.getElementById('modalForgotPin').classList.remove('hidden');
}

/**
 * Fecha o modal de recuperação de PIN.
 */
function closeForgotPinModal() {
    document.getElementById('modalForgotPin').classList.add('hidden');
}

/**
 * Valida a resposta da pergunta de segurança e define um novo PIN.
 */
async function submitResetPinWithAnswer() {
    const secData = getPinSecurityData();
    if (!secData) return;

    const answer = document.getElementById('inputForgotAnswer').value.trim();
    const newPin = document.getElementById('inputForgotNewPin').value.trim();

    if (!answer) {
        alert('Digite a resposta da pergunta secreta.');
        return;
    }

    if (!newPin || newPin.length < 4) {
        alert('Digite um novo PIN de 4 dígitos.');
        return;
    }

    const isAnswerCorrect = await verifyHashedValue(answer, secData.answerSalt, secData.answerHash);
    if (!isAnswerCorrect) {
        alert('❌ Resposta incorreta. Verifique se digitou conforme cadastrado.');
        return;
    }

    // Resposta correta: atualiza PIN
    const newPinHashed = await hashValueWithSalt(newPin);
    secData.pinHash = newPinHashed.hash;
    secData.pinSalt = newPinHashed.salt;
    secData.enabled = true;
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(secData));

    alert('🎉 PIN redefinido com sucesso! O aplicativo foi desbloqueado.');
    closeForgotPinModal();
    unlockApp();
}

// ==========================================
// MODAL POLÍTICA DE PRIVACIDADE & LGPD
// ==========================================

/**
 * Abre o modal de Política de Privacidade e LGPD.
 */
function openPrivacyModal() {
    const modal = document.getElementById('modalPrivacy');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Fecha o modal de Política de Privacidade.
 */
function closePrivacyModal() {
    const modal = document.getElementById('modalPrivacy');
    if (modal) modal.classList.add('hidden');
}

// ==========================================
// ANONIMIZAÇÃO & DIREITOS DO TITULAR (LGPD)
// ==========================================

/**
 * Anonimiza os dados de um cliente preservando lançamentos financeiros.
 * @param {string} clientName Nome atual do cliente.
 */
function anonimizarDadosCliente(clientName) {
    if (!confirm(`🛡️ Anonimizar dados de "${clientName}"?\n\nDe acordo com a LGPD, o Nome e Telefone serão substituídos por "[Cliente Anonimizado]".\nOs valores financeiros serão mantidos para integridade do seu caixa.\n\nDeseja continuar?`)) {
        return;
    }

    const allServices = window.appDataRaw?.services || [];
    let alterados = 0;

    allServices.forEach(s => {
        if (s.client && s.client.trim().toLowerCase() === clientName.trim().toLowerCase()) {
            s.client = 'Cliente Anonimizado';
            s.phone = '';
            alterados++;
            dbSave('services', s);
        }
    });

    setTimeout(() => {
        alert(`✅ ${alterados} registro(s) do cliente foram anonimizados.`);
        if (typeof carregarDados === 'function') carregarDados();
        if (typeof renderClientsList === 'function') renderClientsList();
    }, 200);
}

/**
 * Exporta a ficha do titular em arquivo de texto/JSON (Direito à Portabilidade).
 * @param {string} clientName Nome do cliente.
 */
function exportarDadosDoTitular(clientName) {
    const allServices = window.appDataRaw?.services || [];
    const clientServices = allServices.filter(s => s.client && s.client.trim().toLowerCase() === clientName.trim().toLowerCase());

    if (clientServices.length === 0) {
        alert('Nenhum dado encontrado para este cliente.');
        return;
    }

    const payload = {
        tipo: 'Relatório de Dados do Titular (LGPD Art. 18)',
        cliente: clientName,
        telefone: clientServices[0].phone || '',
        dataExtracao: new Date().toISOString(),
        atendimentos: clientServices.map(s => ({
            id: s.id,
            descricao: s.desc,
            valor: s.val,
            status: s.status,
            data: s.date,
            observacoes: s.notes || ''
        }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados-titular-${clientName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
