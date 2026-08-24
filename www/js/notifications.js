/**
 * Inicializa o subsistema de notificações locais do aplicativo.
 * - Verifica a presença do plugin nativo do Cordova.
 * - Solicita permissão explícita do usuário em dispositivos Android 13+ (API 33+).
 * - Cria os canais de notificação exigidos a partir do Android 8 (API 26+).
 * - Dispara as rotinas de agendamento inicial (backup, cobranças e reagendamento de serviços).
 */
function initNotifications() {
    // Guarda de segurança: se estiver rodando no navegador do PC ou sem o plugin, encerra sem erros
    if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;

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
 * Agenda o disparo de um alerta às 08:00 da manhã no dia agendado do serviço.
 * - Se o status for alterado para diferente de 'Agendado', cancela a notificação existente.
 * - Gera um ID numérico único baseado no ID do registro no IndexedDB.
 * 
 * @param {Object} servico Objeto com os dados do serviço (id, client, scheduledDate, val, status, etc.)
 */
function agendarNotificacaoServico(servico) {
    if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;

    // Extrai os últimos 8 dígitos do timestamp para criar um ID numérico de 32-bit seguro para o plugin
    const notifId = Number(String(servico.id).slice(-8));

    // Se o serviço não for mais um agendamento futuro (ex: virou 'Realizado' ou 'Cancelado'), cancela o alarme
    if (servico.status !== 'Agendado') {
        cordova.plugins.notification.local.cancel(notifId);
        return;
    }

    // Prioriza o campo scheduledDate; fallback para date
    const dataAlvoStr = servico.scheduledDate || servico.date;
    if (!dataAlvoStr) return;

    // Fixa o horário de notificação exatamente para as 08:00:00 da manhã do dia marcado
    const dataAlvo = new Date(dataAlvoStr + 'T08:00:00');

    // Só agenda se a data/hora for posterior ao momento atual
    if (dataAlvo > new Date()) {
        cordova.plugins.notification.local.schedule({
            id: notifId,
            title: '🛠️ Serviço Agendado para Hoje!',
            text: `${servico.client}: ${servico.desc || 'Serviço'} (${money(servico.val)})`,
            trigger: { at: dataAlvo },
            channel: 'servicos_lembretes',
            foreground: true
        });
    }
}

/**
 * Varre o banco de dados IndexedDB e reagenda todos os serviços pendentes.
 * Evita a perda de alarmes caso o smartphone seja reiniciado, descarregue
 * ou tenha a memória RAM limpa pelo Android.
 */
function reagendarServicosFuturos() {
    if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;

    if (typeof dbGetAll === 'function') {
        dbGetAll(data => {
            const services = data.services || [];
            const agendados = services.filter(s => s.status === 'Agendado');
            agendados.forEach(s => agendarNotificacaoServico(s));
        });
    }
}

/**
 * Programa uma notificação recorrente para todos os dias às 12:00 (meio-dia),
 * incentivando a exportação diária do arquivo de backup JSON.
 */
function agendarLembreteBackup() {
    if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;

    const BACKUP_NOTIF_ID = 999901;

    cordova.plugins.notification.local.cancel(BACKUP_NOTIF_ID, function () {
        let proximaData = new Date();
        proximaData.setHours(12, 0, 0, 0);

        // Se já passou das 12:00 de hoje, programa para o meio-dia de amanhã
        if (proximaData <= new Date()) {
            proximaData.setDate(proximaData.getDate() + 1);
        }

        cordova.plugins.notification.local.schedule({
            id: BACKUP_NOTIF_ID,
            title: '💾 Hora de fazer o Backup!',
            text: 'Mantenha os dados do seu negócio seguros. Exporte o backup diário.',
            trigger: { at: proximaData, every: 'day' },
            channel: 'sistema_backup',
            foreground: true
        });
    });
}

/**
 * Executa uma verificação 2,5 segundos após a inicialização do app.
 * Caso existam trabalhos concluídos ('Realizado') sem registro de pagamento ('Pago'),
 * emite um alerta com o valor acumulado a receber.
 */
function verificarNotificacoesAoIniciar() {
    if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;

    setTimeout(() => {
        if (!window.appDataRaw || !window.appDataRaw.services) return;

        // Filtra serviços já realizados mas ainda não pagos
        const pendentes = window.appDataRaw.services.filter(x => x.status === 'Realizado');
        if (pendentes.length > 0) {
            const total = pendentes.reduce((s, x) => s + x.val, 0);
            
            cordova.plugins.notification.local.schedule({
                id: 999902,
                title: '💰 Serviços Prontos a Cobrar!',
                text: `Você tem ${pendentes.length} serviço(s) realizado(s) aguardando pagamento (${money(total)}).`,
                channel: 'alertas_financeiros',
                foreground: false
            });
        }
    }, 2500);
}