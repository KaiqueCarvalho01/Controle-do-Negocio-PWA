// ==========================================
// NOTIFICAÇÕES LOCAIS
// ==========================================
// Duas camadas:
// 1) APK/Cordova -> plugin nativo (alarme exato, funciona mesmo com o app fechado).
// 2) Navegador/PWA -> API Web Notification. O browser NÃO permite agendar alarmes
//    em segundo plano, então as notificações web valem enquanto a sessão estiver
//    aberta (timers em memória) e são re-verificadas ao focar a aba.

// ==========================================
// 0. CAMADA WEB (Navegador / PWA)
// ==========================================

const __webNotifTimers = {};      // chave -> timeoutId (para cancelamento)
const __webNotifDisparados = {};  // chave -> true (disparo único por sessão, evita repetição)

/**
 * indica se o plugin nativo de notificações do Cordova está presente.
 */
function notifCordovaDisponivel() {
    return !!(window.cordova && cordova.plugins && cordova.plugins.notification);
}

/**
 * indica se a API Web Notification está disponível e permitida no navegador/PWA.
 */
function webNotifPermitida() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

/**
 * Solicita (uma única vez) permissão para notificações no navegador/PWA.
 * @param {Function} [callback] Função chamada com true/false (concedida ou não).
 */
function pedirPermissaoNotificacao(callback) {
    const cb = typeof callback === 'function' ? callback : function () {};
    if (notifCordovaDisponivel()) { cb(true); return; }
    if (typeof Notification === 'undefined') { cb(false); return; }
    if (Notification.permission === 'granted') { cb(true); return; }
    if (Notification.permission === 'denied') { cb(false); return; }
    Notification.requestPermission().then(p => cb(p === 'granted')).catch(() => cb(false));
}

/**
 * Exibe uma notificação web imediatamente (se a permissão estiver concedida).
 * @returns {boolean} true se foi possível exibir.
 */
function mostrarNotifWeb(titulo, texto) {
    if (!webNotifPermitida()) return false;
    try {
        const n = new Notification(titulo, {
            body: texto,
            icon: './img/logo.png',
            badge: './img/logo.png'
        });
        setTimeout(() => n.close(), 30000);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Cancela um disparo web agendado (timer da sessão) pela chave.
 * @param {string} chave Identificador único do agendamento.
 */
function cancelarNotifWeb(chave) {
    if (__webNotifTimers[chave]) {
        clearTimeout(__webNotifTimers[chave]);
        delete __webNotifTimers[chave];
    }
}

/**
 * Agenda uma notificação web para uma data futura (apenas enquanto a sessão estiver aberta).
 * - Se a hora já passou nesta sessão, exibe uma única vez (evita repetição ao focar a aba).
 * - Se for no futuro, re-arma o timer da sessão.
 * @param {string} chave Identificador único (permite cancelar/reagendar).
 * @param {Date} dataAlvo Momento do disparo.
 * @param {string} titulo Título da notificação.
 * @param {string} texto Corpo da notificação.
 */
function agendarNotifWeb(chave, dataAlvo, titulo, texto) {
    if (!webNotifPermitida()) return;

    const delay = dataAlvo.getTime() - Date.now();

    // Hora já passou: notifica apenas UMA vez por sessão
    if (delay <= 0) {
        if (!__webNotifDisparados[chave]) {
            __webNotifDisparados[chave] = true;
            mostrarNotifWeb(titulo, texto);
        }
        return;
    }

    // Ainda no futuro: (re)arma o timer da sessão
    delete __webNotifDisparados[chave];
    cancelarNotifWeb(chave);
    __webNotifTimers[chave] = setTimeout(() => {
        __webNotifDisparados[chave] = true;
        mostrarNotifWeb(titulo, texto);
    }, Math.min(delay, 2147483647));
}

/**
 * Inicializa o subsistema de notificações WEB (navegador/PWA).
 * Pede permissão ao usuário e arma os lembretes pendentes para a sessão atual.
 * O APK (Cordova) continua usando o fluxo nativo via initNotifications()/deviceready.
 */
function initWebNotifications() {
    // APK usa o fluxo nativo abaixo
    if (notifCordovaDisponivel()) return;

    pedirPermissaoNotificacao(granted => {
        if (!granted) return;

        reagendarServicosFuturos();
        agendarLembreteBackup();
        verificarNotificacoesAoIniciar();
        if (typeof reagendarTodasNotas === 'function') {
            reagendarTodasNotas();
        }

        // Re-verifica pendências quando a aba volta a ficar visível
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                reagendarServicosFuturos();
            }
        });
    });
}

// ==========================================
// 1. CAMADA NATIVA (APK / Cordova)
// ==========================================
/**
 * Inicializa o subsistema de notificações locais do aplicativo.
 * - Verifica a presença do plugin nativo do Cordova.
 * - Solicita permissão explícita do usuário em dispositivos Android 13+ (API 33+).
 * - Cria os canais de notificação exigidos a partir do Android 8 (API 26+).
 * - Dispara as rotinas de agendamento inicial (backup, cobranças e reagendamento de serviços).
 */
function initNotifications() {
    // Guarda de segurança: se estiver rodando no navegador do PC ou sem o plugin, encerra sem erros
    if (!notifCordovaDisponivel()) return;

    // Solicita permissão explícita no Android 13+
    cordova.plugins.notification.local.requestPermission(function (granted) {
        if (granted) {
            configurarCanais();
            agendarLembreteBackup();
            verificarNotificacoesAoIniciar();
            reagendarServicosFuturos(); // Re-agenda alarmes pendentes ao inicializar
            if (typeof reagendarTodasNotas === 'function') {
                reagendarTodasNotas(); // Re-agenda lembretes do bloco de notas
            }
        }
    });
}


/**
 * Registra os canais de notificação no sistema operacional Android.
 * Necessário para classificar a prioridade, som e vibração de cada tipo de alerta.
 */
function configurarCanais() {
    // Cria canais de notificação exigidos pelo Android 8+
    // Canal 1: Alta importância (gera som e vibração para a agenda de serviços)
    cordova.plugins.notification.local.createChannel({
        id: 'servicos_lembretes',
        name: 'Lembretes de Serviços e Agenda',
        importance: 4,
        vibration: true
    });

    // Canal 2: Importança média (alerta de cobranças pendentes ao abrir o app)
    cordova.plugins.notification.local.createChannel({
        id: 'alertas_financeiros',
        name: 'Cobranças e Pendências',
        importance: 3,
        vibration: true
    });

    // Canal 3: Silencioso / Baixa intrusão (lembrete de rotina para exportar backup)
    cordova.plugins.notification.local.createChannel({
        id: 'sistema_backup',
        name: 'Segurança e Backup',
        importance: 3,
        vibration: false
    });
}

/**
 * Agenda o disparo de um alerta no horário agendado do serviço.
 * - Usa o campo `time` (HH:MM) informado no serviço; se vazio, mantém o
 *   padrão de 08:00 da manhã no dia marcado.
 * - Se o status for alterado para diferente de 'Agendado', cancela a notificação existente.
 * - Gera um ID numérico único baseado no ID do registro no IndexedDB.
 * - APK: alarme nativo exato. Navegador/PWA: timer apenas da sessão aberta.
 *
 * @param {Object} servico Objeto com os dados do serviço (id, client, scheduledDate, time, val, status, etc.)
 */
function agendarNotificacaoServico(servico) {
    // Extrai os últimos 8 dígitos do timestamp para criar um ID numérico de 32-bit seguro para o plugin
    const notifId = Number(String(servico.id).slice(-8));

    // Se o serviço não for mais um agendamento futuro (ex: virou 'Realizado' ou 'Cancelado'), cancela o alarme
    if (servico.status !== 'Agendado') {
        if (notifCordovaDisponivel()) {
            cordova.plugins.notification.local.cancel(notifId);
        } else if (webNotifPermitida()) {
            cancelarNotifWeb('svc' + servico.id);
        }
        return;
    }

    // Prioriza o campo scheduledDate; fallback para date
    const dataAlvoStr = servico.scheduledDate || servico.date;
    if (!dataAlvoStr) return;

    // Usa o horário (HH:MM) definido no serviço; sem horário, mantém o padrão das 08:00 da manhã
    const horarioServico = String(servico.time || '').trim();
    const horaAlvo = /^\d{1,2}:\d{2}/.test(horarioServico) ? horarioServico : '08:00';
    const dataAlvo = new Date(dataAlvoStr + 'T' + horaAlvo + ':00');

    // Só agenda se a data/hora for posterior ao momento atual
    if (dataAlvo <= new Date()) return;

    const titulo = '🛠️ Serviço Agendado para Hoje!';
    const texto = `${servico.client}: ${servico.desc || 'Serviço'} (${money(servico.val)})`;

    if (notifCordovaDisponivel()) {
        cordova.plugins.notification.local.schedule({
            id: notifId,
            title: titulo,
            text: texto,
            trigger: { at: dataAlvo },
            channel: 'servicos_lembretes',
            foreground: true
        });
    } else {
        // Navegador/PWA: timer da sessão (app aberto)
        agendarNotifWeb('svc' + servico.id, dataAlvo, titulo, texto);
    }
}

/**
 * Varre o banco de dados IndexedDB e reagenda todos os serviços pendentes.
 * Evita a perda de alarmes caso o smartphone seja reiniciado, descarregue
 * ou tenha a memória RAM limpa pelo Android.
 */
function reagendarServicosFuturos() {
    if (!notifCordovaDisponivel() && !webNotifPermitida()) return;

    if (typeof dbGetAll === 'function') {
        dbGetAll(data => {
            const services = data.services || [];
            const agendados = services.filter(s => s.status === 'Agendado');
            agendados.forEach(s => agendarNotificacaoServico(s));
        });
    }
}

/**
 * Programa uma notificação diária às 12:00 (meio-dia), incentivando a exportação
 * diária do arquivo de backup JSON.
 * - APK: alarme recorrente nativo.
 * - Navegador/PWA: lembrete do próximo meio-dia (uma vez por sessão).
 */
function agendarLembreteBackup() {
    const BACKUP_NOTIF_ID = 999901;
    const titulo = '💾 Hora de fazer o Backup!';
    const texto = 'Mantenha os dados do seu negócio seguros. Exporte o backup diário.';

    let proximaData = new Date();
    proximaData.setHours(12, 0, 0, 0);

    // Se já passou das 12:00 de hoje, programa para o meio-dia de amanhã
    if (proximaData <= new Date()) {
        proximaData.setDate(proximaData.getDate() + 1);
    }

    if (notifCordovaDisponivel()) {
        cordova.plugins.notification.local.cancel(BACKUP_NOTIF_ID, function () {
            cordova.plugins.notification.local.schedule({
                id: BACKUP_NOTIF_ID,
                title: titulo,
                text: texto,
                trigger: { at: proximaData, every: 'day' },
                channel: 'sistema_backup',
                foreground: true
            });
        });
        return;
    }

    // Navegador/PWA: agendamento da sessão
    agendarNotifWeb('backup-diario', proximaData, titulo, texto);
}

/**
 * Executa uma verificação 2,5 segundos após a inicialização do app.
 * Caso existam trabalhos concluídos ('Realizado') sem registro de pagamento ('Pago'),
 * emite um alerta com o valor acumulado a receber.
 */
function verificarNotificacoesAoIniciar() {
    const nativo = notifCordovaDisponivel();
    if (!nativo && !webNotifPermitida()) return;

    setTimeout(() => {
        if (!window.appDataRaw || !window.appDataRaw.services) return;

        // Filtra serviços já realizados mas ainda não pagos
        const pendentes = window.appDataRaw.services.filter(x => x.status === 'Realizado');
        if (pendentes.length > 0) {
            const total = pendentes.reduce((s, x) => s + x.val, 0);
            const titulo = '💰 Serviços Prontos a Cobrar!';
            const texto = `Você tem ${pendentes.length} serviço(s) realizado(s) aguardando pagamento (${money(total)}).`;

            if (nativo) {
                cordova.plugins.notification.local.schedule({
                    id: 999902,
                    title: titulo,
                    text: texto,
                    channel: 'alertas_financeiros',
                    foreground: false
                });
            } else {
                mostrarNotifWeb(titulo, texto);
            }
        }
    }, 2500);
}