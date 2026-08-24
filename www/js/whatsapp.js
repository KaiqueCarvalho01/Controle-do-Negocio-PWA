// ==========================================
// INTEGRAÇÃO COM WHATSAPP
// ==========================================

/**
 * Gera mensagem estruturada e abre a conversa do cliente no WhatsApp.
 * @param {Object} serviceItem Objeto de dados do serviço.
 */
function openWhatsApp(serviceItem) {
    let cleanPhone = (serviceItem.phone || '').replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
        cleanPhone = '55' + cleanPhone;
    }

    const profile = (typeof getCompanyProfile === 'function') ? getCompanyProfile() : { name: '', owner: '', phone: '', pix: '', city: '' };

    let dateFormatted = formatDateToBR(serviceItem.date);
    let texto = `Olá, *${serviceItem.client}*! Tudo bem?\n\n`;

    let itensTexto = '';
    if (Array.isArray(serviceItem.items) && serviceItem.items.length > 0) {
        serviceItem.items.forEach((it, idx) => {
            const num = idx + 1;
            const titulo = it.type ? `*${it.type}*` : 'Item';
            const unit = it.mUnit || 'm';
            
            let dimStr = '';
            if (it.width && it.height) {
                dimStr = ` (${it.width}${unit} x ${it.height}${unit})`;
            } else if (it.width) {
                dimStr = ` (${it.width}${unit})`;
            }

            const qtdStr = it.qty > 1 ? `${it.qty}x ` : '';
            itensTexto += `${num}. ${titulo}${dimStr}\n   ${qtdStr}${money(it.unitPrice)} = *${money(it.subtotal)}*\n`;
        });
    }

    const valorMaoDeObra = parseFloat(serviceItem.labor) || 0;
    if (valorMaoDeObra > 0) {
        itensTexto += `🛠️ *Mão de Obra / Serviço:* ${money(valorMaoDeObra)}\n`;
    }

    const detalhesTexto = serviceItem.desc ? `\n📝 *Detalhes:* ${serviceItem.desc}\n` : '';
    const pixTexto = (profile.pix && serviceItem.status !== 'Pago') ? `\n💳 *Chave Pix:* ${profile.pix}\n` : '';
    const assinatura = (profile.name || profile.owner) ? `\n\nAtenciosamente,\n*${profile.name || profile.owner}*` : '';

    if (serviceItem.status === 'Orçamento') {
        texto += `Segue a proposta de orçamento:\n\n${itensTexto}${detalhesTexto}${pixTexto}`;
        texto += `\n💰 *Valor Total:* ${money(serviceItem.val)}\n\n`;
        texto += `Fico à disposição para dúvidas ou agendamento!${assinatura}`;
    } else if (serviceItem.status === 'Agendado') {
        texto += `Confirmando nosso agendamento:\n\n${itensTexto}${detalhesTexto}`;
        texto += `\n📅 *Data:* ${dateFormatted}\n`;
        texto += `💰 *Valor Total:* ${money(serviceItem.val)}\n\n`;
        texto += `Nos vemos na data combinada!${assinatura}`;
    } else if (serviceItem.status === 'Realizado') {
        texto += `O seu serviço foi concluído com sucesso!\n\n${itensTexto}${detalhesTexto}${pixTexto}`;
        texto += `\n💰 *Valor Total:* ${money(serviceItem.val)}\n\n`;
        texto += `Qualquer dúvida estou à disposição!${assinatura}`;
    } else if (serviceItem.status === 'Pago') {
        texto += `Segue o comprovante do seu serviço:\n\n${itensTexto}${detalhesTexto}`;
        texto += `\n💰 *Valor Pago:* ${money(serviceItem.val)}${serviceItem.pay ? ' (via ' + serviceItem.pay + ')' : ''}\n`;
        texto += `📅 *Data:* ${dateFormatted}\n\n`;
        texto += `Muito obrigado pela preferência e confiança!${assinatura}`;
    }

    const msgEncoded = encodeURIComponent(texto);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msgEncoded}`, '_system');
}

