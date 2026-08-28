// ==========================================
// INTEGRAÇÃO COM A AGENDA DO ANDROID
// ==========================================

/**
 * Abre a tela nativa do Android para salvar o agendamento na agenda do aparelho.
 * @param {Object} service Dados do serviço/orçamento a ser agendado.
 */
function adicionarServicoNaAgenda(service) {
    if (!service || !service.date) return;

    try {
        const title = '🛠️ ' + service.client + ' - ' + (service.desc || 'Serviço');
        const location = service.notes || '';
        let notes = 'Cliente: ' + service.client;
        if (service.phone) notes += '\nWhatsApp / Tel: ' + service.phone;
        if (service.desc) notes += '\nDetalhes: ' + service.desc;
        if (service.val) notes += '\nValor: R$ ' + numVal(service.val).toFixed(2);

        // Processa ano, mês, dia
        const [ano, mes, dia] = service.date.split('-').map(Number);
        let hora = 9;
        let minuto = 0;

        if (service.time) {
            const [h, m] = service.time.split(':').map(Number);
            if (!isNaN(h)) hora = h;
            if (!isNaN(m)) minuto = m;
        }

        const startDate = new Date(ano, mes - 1, dia, hora, minuto, 0);
        // Duração padrão estimada de 1 hora
        const endDate = new Date(startDate.getTime() + (60 * 60 * 1000));

        // 1. Se estiver no Cordova com o plugin nativo instalado
        if (window.plugins && window.plugins.calendar && typeof window.plugins.calendar.createEventInteractively === 'function') {
            window.plugins.calendar.createEventInteractively(
                title,
                location,
                notes,
                startDate,
                endDate,
                () => console.log('Agendamento aberto no calendário nativo.'),
                (err) => console.error('Erro no calendário nativo:', err)
            );
            return;
        }

        // 2. Fallback PWA / Web: Google Agenda Web Template (abre diretamente no app do Google Agenda no Android ou no navegador no PC)
        const formatISO = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatISO(startDate)}/${formatISO(endDate)}&details=${encodeURIComponent(notes)}&location=${encodeURIComponent(location)}`;
        window.open(gcalUrl, '_blank');

    } catch (e) {
        console.error('Falha ao processar evento para a agenda:', e);
    }
}
