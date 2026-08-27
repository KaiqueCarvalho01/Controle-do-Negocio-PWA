/**
 * ============================================================================
 * MÓDULO DE GERAÇÃO E COMPARTILHAMENTO DE PDF (NATIVO / OFFLINE)
 * ============================================================================
 */

/**
 * Salva ou compartilha o PDF gerado de acordo com o ambiente de execução.
 *
 * - Aparelho Android (Cordova): mantém o fluxo nativo de escrita no cache e
 *   compartilhamento via social sharing (WhatsApp, Drive, e-mail).
 * - Navegador desktop / PC (testes, testes no computador): baixa o arquivo
 *   diretamente (download), sem abrir o seletor de compartilhamento do sistema.
 * - Navegador mobile / PWA no celular: tenta o Web Share API (permite salvar
 *   arquivos, mandar por WhatsApp etc.) com fallback automático para download.
 *
 * @param {Blob} pdfBlob Blob do PDF gerado.
 * @param {string} nomeArquivo Nome do arquivo em disco (ex: 'Documento.pdf').
 * @param {string} titulo Título usado no compartilhamento.
 * @param {string} mensagem Texto de corpo usado no compartilhamento.
 */
function salvarOuCompartilharPdf(pdfBlob, nomeArquivo, titulo, mensagem) {
    // 1) APK Android / Cordova: grava no cache nativo e abre o compartilhamento do sistema.
    if (window.cordova && window.plugins && window.plugins.socialsharing && cordova.file) {
        window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, function (dirEntry) {
            dirEntry.getFile(nomeArquivo, { create: true, exclusive: false }, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function () {
                        window.plugins.socialsharing.shareWithOptions({
                            message: mensagem,
                            subject: titulo,
                            files: [fileEntry.nativeURL],
                            chooserTitle: 'Compartilhar Documento PDF'
                        });
                    };
                    fileWriter.write(pdfBlob);
                });
            });
        }, function (err) {
            alert('Erro ao salvar PDF: ' + JSON.stringify(err));
        });
        return;
    }

    // 2) Navegador desktop (PC) → download direto, sem pedir compartilhamento.
    const ehDispositivoTatil = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (!ehDispositivoTatil) {
        baixarArquivo(pdfBlob, nomeArquivo);
        return;
    }

    // 3) Navegador mobile / PWA → tenta Web Share; se indisponível/cancelado, baixa.
    let compartilhou = false;
    if (navigator.share && navigator.canShare) {
        try {
            const pdfFile = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });
            if (navigator.canShare({ files: [pdfFile] })) {
                navigator.share({ files: [pdfFile], title: titulo, text: mensagem });
                compartilhou = true;
            }
        } catch (sErr) {
            if (sErr.name === 'AbortError') compartilhou = true;
        }
    }
    if (!compartilhou) baixarArquivo(pdfBlob, nomeArquivo);
}

/**
 * Dispara o download de um Blob no navegador via link temporário <a download>.
 * @param {Blob} blob Conteúdo do arquivo a ser baixado.
 * @param {string} nomeArquivo Nome sugerido para o arquivo.
 */
function baixarArquivo(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Gera e compartilha o PDF de orçamento ou comprovante de serviço.
 * @param {Object} servico Objeto com os dados do serviço/orçamento.
 */
function gerarPdfServico(servico) {
    try {
        const isOrcamento = servico.status === 'Orçamento';
        const tituloDoc = isOrcamento ? 'PROPOSTA DE ORÇAMENTO' : 'COMPROVANTE DE SERVIÇO';
        const nomeCliente = servico.client || 'Cliente';
        const dataDoc = formatDateToBR(servico.date || getLocalDateString());
        const valorTotal = money(servico.val);

        const profile = (typeof getCompanyProfile === 'function') ? getCompanyProfile() : { name: '', owner: '', phone: '', pix: '', city: '' };
        const nomeCabecalho = profile.name || 'CONTROLE DO NEGÓCIO';

        const pdf = new MinimalPdfBuilder();

        // 1. Cabeçalho Principal
        pdf.setFillColor(25, 118, 210);
        pdf.rect(0, 775, 595, 67, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('Helvetica-Bold', 17);
        pdf.text(pdf.sanitize(nomeCabecalho.toUpperCase()), 30, 814);
        
        pdf.setFont('Helvetica', 9.5);
        let subtitulo = tituloDoc;
        let extrasEmpresa = [];
        if (profile.owner) extrasEmpresa.push(`Profissional: ${profile.owner}`);
        if (profile.phone) extrasEmpresa.push(`Tel: ${profile.phone}`);
        if (profile.city) extrasEmpresa.push(profile.city);
        if (extrasEmpresa.length > 0) subtitulo += '  •  ' + extrasEmpresa.join(' | ');
        pdf.text(pdf.sanitize(subtitulo), 30, 794);

        // 2. Quadro de Dados do Cliente
        pdf.setFillColor(245, 247, 250);
        pdf.rect(30, 685, 535, 78, 'F');
        pdf.setDrawColor(220, 224, 230);
        pdf.rect(30, 685, 535, 78, 'D');

        pdf.setTextColor(34, 34, 34);
        pdf.setFont('Helvetica-Bold', 11);
        pdf.text(`Cliente: ${nomeCliente}`, 42, 747);

        pdf.setFont('Helvetica', 10);
        pdf.text(`Data: ${dataDoc}`, 400, 747);
        
        let clientY = 729;
        if (servico.phone) {
            pdf.text(`Telefone: ${servico.phone}`, 42, clientY);
        }
        pdf.text(`Status Atual: ${servico.status}${servico.pay ? ' (' + servico.pay + ')' : ''}`, 400, clientY);

        if (servico.notes) {
            clientY -= 18;
            pdf.text(`Endereço/Obs: ${pdf.sanitize(servico.notes)}`, 42, clientY);
        }

        // 3. Tabela de Itens
        let currentY = 650;
        
        pdf.setFillColor(230, 235, 245);
        pdf.rect(30, currentY - 18, 535, 22, 'F');
        
        pdf.setTextColor(33, 33, 33);
        pdf.setFont('Helvetica-Bold', 9);
        pdf.text('ITEM / MATERIAIS / SERVIÇOS', 36, currentY - 4);
        pdf.text('MEDIDAS', 260, currentY - 4);
        pdf.text('QTD', 360, currentY - 4);
        pdf.text('PREÇO UN.', 415, currentY - 4);
        pdf.text('SUBTOTAL', 495, currentY - 4);

        currentY -= 26;

        pdf.setFont('Helvetica', 9);
        const items = Array.isArray(servico.items) && servico.items.length > 0 ? servico.items : [];
        let totalMateriais = 0;

        if (items.length > 0) {
            items.forEach((it, index) => {
                const isEven = index % 2 === 0;
                if (isEven) {
                    pdf.setFillColor(250, 250, 250);
                    pdf.rect(30, currentY - 14, 535, 18, 'F');
                }

                const descItem = it.type || 'Item';
                const unit = it.mUnit || 'm';
                let dimStr = '-';
                if (it.width && it.height) dimStr = `${it.width}x${it.height}${unit}`;
                else if (it.width) dimStr = `${it.width}${unit}`;

                const sub = (it.subtotal !== undefined) ? it.subtotal : ((it.unitPrice || 0) * (it.qty || 1));
                totalMateriais += sub;

                pdf.setTextColor(40, 40, 40);
                pdf.text(pdf.sanitize(descItem), 36, currentY - 2);
                pdf.text(dimStr, 260, currentY - 2);
                pdf.text(String(it.qty || 1), 365, currentY - 2);
                pdf.text(money(it.unitPrice || 0), 415, currentY - 2);
                pdf.text(money(sub), 495, currentY - 2);

                currentY -= 20;
            });
        } else if (servico.desc && (!servico.labor || servico.labor <= 0)) {
            pdf.text(pdf.sanitize(servico.desc), 36, currentY - 2);
            pdf.text('1', 365, currentY - 2);
            pdf.text(valorTotal, 415, currentY - 2);
            pdf.text(valorTotal, 495, currentY - 2);
            currentY -= 20;
        }

        // Linha destacada de Mão de Obra (se preenchida > 0)
        const valorMaoDeObra = parseFloat(servico.labor) || 0;
        if (valorMaoDeObra > 0) {
            pdf.setFillColor(243, 248, 243);
            pdf.rect(30, currentY - 14, 535, 19, 'F');
            pdf.setDrawColor(200, 230, 200);
            pdf.rect(30, currentY - 14, 535, 19, 'D');

            pdf.setTextColor(46, 125, 50);
            pdf.setFont('Helvetica-Bold', 9);
            pdf.text('🛠️ MÃO DE OBRA / SERVIÇO DE EXECUÇÃO', 36, currentY - 1);
            pdf.text('-', 260, currentY - 1);
            pdf.text('1', 365, currentY - 1);
            pdf.text(money(valorMaoDeObra), 415, currentY - 1);
            pdf.text(money(valorMaoDeObra), 495, currentY - 1);

            currentY -= 22;
        }

        // 4. Detalhes / Observações
        if (servico.desc && (items.length > 0 || valorMaoDeObra > 0)) {
            currentY -= 8;
            pdf.setFont('Helvetica-Bold', 9);
            pdf.setTextColor(50, 50, 50);
            pdf.text('Detalhes / Observações:', 36, currentY);
            currentY -= 14;
            pdf.setFont('Helvetica', 9);
            pdf.text(pdf.sanitize(servico.desc), 36, currentY);
            currentY -= 14;
        }

        // 5. Totalizador e Chave Pix
        currentY -= 10;
        const temDesdobramento = valorMaoDeObra > 0 && items.length > 0;
        const boxHeight = temDesdobramento ? 44 : 34;

        pdf.setFillColor(240, 244, 248);
        pdf.rect(310, currentY - boxHeight + 8, 255, boxHeight, 'F');
        pdf.setDrawColor(25, 118, 210);
        pdf.rect(310, currentY - boxHeight + 8, 255, boxHeight, 'D');

        if (temDesdobramento) {
            pdf.setTextColor(80, 80, 80);
            pdf.setFont('Helvetica', 8.5);
            pdf.text(`Materiais: ${money(totalMateriais)} | Mão de Obra: ${money(valorMaoDeObra)}`, 320, currentY - 4);

            pdf.setTextColor(25, 118, 210);
            pdf.setFont('Helvetica-Bold', 12);
            pdf.text('VALOR TOTAL:', 320, currentY - 20);
            pdf.text(valorTotal, 465, currentY - 20);
        } else {
            pdf.setTextColor(25, 118, 210);
            pdf.setFont('Helvetica-Bold', 12);
            pdf.text('VALOR TOTAL:', 320, currentY - 6);
            pdf.text(valorTotal, 465, currentY - 6);
        }

        // Se houver chave Pix cadastrada, exibe o quadro de pagamento Pix
        if (profile.pix) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(30, currentY - 26, 260, 34, 'F');
            pdf.setDrawColor(200, 220, 240);
            pdf.rect(30, currentY - 26, 260, 34, 'D');

            pdf.setTextColor(25, 118, 210);
            pdf.setFont('Helvetica-Bold', 8.5);
            pdf.text('💳 CHAVE PIX PARA PAGAMENTO:', 38, currentY - 8);

            pdf.setTextColor(34, 34, 34);
            pdf.setFont('Helvetica', 9);
            pdf.text(pdf.sanitize(profile.pix), 38, currentY - 20);
        }

        // 6. Rodapé
        pdf.setTextColor(140, 140, 140);
        pdf.setFont('Helvetica', 8);
        const emissorRodape = profile.name || profile.owner || 'Controle do Negócio';
        pdf.text(pdf.sanitize(`Documento emitido por ${emissorRodape}.`), 30, 40);

        // 7. Compilação e Download / Envio
        const pdfBlob = pdf.buildBlob();
        const nomeArquivoSanitizado = `Documento_${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

        salvarOuCompartilharPdf(
            pdfBlob,
            nomeArquivoSanitizado,
            tituloDoc,
            `Olá! Segue o documento de ${isOrcamento ? 'orçamento' : 'serviço'}.`
        );

    } catch (err) {
        alert('Erro ao gerar documento PDF: ' + err.message);
    }
}

/**
 * Gera o relatório financeiro consolidado (Extrato de Entradas e Saídas) em PDF.
 */
function gerarPdfExtrato() {
    try {
        const monthSelect = document.getElementById('filterMonth');
        const periodoTexto = monthSelect.options[monthSelect.selectedIndex].text;
        
        const services = window.appDataFiltered.services || [];
        const expenses = window.appDataFiltered.expenses || [];

        const totalIn = services.filter(x => x.status === 'Pago').reduce((s, x) => s + x.val, 0);
        const totalOut = expenses.reduce((s, x) => s + x.val, 0);
        const lucroReal = totalIn - totalOut;

        let servicesPagos = services.filter(x => x.status === 'Pago').map(x => ({
            date: x.date,
            desc: `Serviço: ${x.client}${x.desc ? ' - ' + x.desc : ''}`,
            detalhe: x.pay || 'Entrada',
            val: x.val,
            type: 'in'
        }));

        let expensesList = expenses.map(x => ({
            date: x.date,
            desc: `Gasto: ${x.desc}`,
            detalhe: x.cat || 'Despesa',
            val: x.val,
            type: 'out'
        }));

        const movimentacoes = [...servicesPagos, ...expensesList].sort((a, b) => b.date.localeCompare(a.date));

        const profile = (typeof getCompanyProfile === 'function') ? getCompanyProfile() : { name: '', owner: '', phone: '', pix: '', city: '' };
        const nomeCabecalho = profile.name || 'CONTROLE DO NEGÓCIO';

        const pdf = new MinimalPdfBuilder();

        // 1. Cabeçalho
        pdf.setFillColor(25, 118, 210);
        pdf.rect(0, 775, 595, 67, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('Helvetica-Bold', 17);
        pdf.text(pdf.sanitize(nomeCabecalho.toUpperCase()), 30, 814);
        
        pdf.setFont('Helvetica', 9.5);
        pdf.text(`RELATÓRIO FINANCEIRO MENSAL - ${pdf.sanitize(periodoTexto)}`, 30, 794);

        // 2. Quadro de Resumo
        pdf.setFillColor(245, 247, 250);
        pdf.rect(30, 695, 535, 65, 'F');
        pdf.setDrawColor(220, 224, 230);
        pdf.rect(30, 695, 535, 65, 'D');

        pdf.setTextColor(46, 125, 50);
        pdf.setFont('Helvetica-Bold', 11);
        pdf.text(`Total Recebido: ${money(totalIn)}`, 45, 733);

        pdf.setTextColor(198, 40, 40);
        pdf.text(`Total de Despesas: ${money(totalOut)}`, 225, 733);

        pdf.setTextColor(25, 118, 210);
        pdf.setFont('Helvetica-Bold', 12);
        pdf.text(`Lucro Líquido: ${money(lucroReal)}`, 405, 733);

        pdf.setTextColor(100, 100, 100);
        pdf.setFont('Helvetica', 9);
        pdf.text(`Total de movimentações: ${movimentacoes.length}`, 45, 710);

        // 3. Tabela de Movimentações
        let currentY = 665;

        pdf.setFillColor(230, 235, 245);
        pdf.rect(30, currentY - 18, 535, 22, 'F');
        
        pdf.setTextColor(33, 33, 33);
        pdf.setFont('Helvetica-Bold', 9);
        pdf.text('DATA', 36, currentY - 4);
        pdf.text('DESCRIÇÃO / CLIENTE', 115, currentY - 4);
        pdf.text('TIPO / CAT', 360, currentY - 4);
        pdf.text('VALOR', 485, currentY - 4);

        currentY -= 26;

        pdf.setFont('Helvetica', 9);

        if (movimentacoes.length > 0) {
            movimentacoes.forEach((m, index) => {
                const isEven = index % 2 === 0;
                if (isEven) {
                    pdf.setFillColor(250, 250, 250);
                    pdf.rect(30, currentY - 14, 535, 18, 'F');
                }

                pdf.setTextColor(40, 40, 40);
                pdf.text(formatDateToBR(m.date), 36, currentY - 2);
                pdf.text(pdf.sanitize(m.desc), 115, currentY - 2);
                pdf.text(pdf.sanitize(m.detalhe), 360, currentY - 2);

                if (m.type === 'in') {
                    pdf.setTextColor(46, 125, 50);
                    pdf.text(`+ ${money(m.val)}`, 485, currentY - 2);
                } else {
                    pdf.setTextColor(198, 40, 40);
                    pdf.text(`- ${money(m.val)}`, 485, currentY - 2);
                }

                currentY -= 20;
            });
        } else {
            pdf.setTextColor(100, 100, 100);
            pdf.text('Nenhuma movimentação registrada neste período.', 36, currentY - 2);
        }

        // 4. Rodapé
        pdf.setTextColor(140, 140, 140);
        pdf.setFont('Helvetica', 8);
        const emissorRodape = profile.name || profile.owner || 'Controle do Negócio';
        pdf.text(pdf.sanitize(`Relatório financeiro emitido por ${emissorRodape}.`), 30, 35);

        // 5. Salvar / Baixar
        const pdfBlob = pdf.buildBlob();
        const nomeArquivo = `Extrato_${periodoTexto.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

        salvarOuCompartilharPdf(
            pdfBlob,
            nomeArquivo,
            'Relatório Financeiro',
            `Relatório financeiro - ${periodoTexto}`
        );

    } catch (err) {
        alert('Erro ao gerar relatório do extrato: ' + err.message);
    }
}

/**
 * Construtor básico de fluxo PDF 1.4 em binário puro.
 */
class MinimalPdfBuilder {
    constructor() {
        this.stream = [];
        this.pageWidth = 595.28;
        this.pageHeight = 841.89;
    }

    sanitize(text) {
        if (!text) return '';
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
    }

    setFillColor(r, g, b) {
        this.stream.push(`${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`);
    }

    setDrawColor(r, g, b) {
        this.stream.push(`${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG`);
    }

    setTextColor(r, g, b) {
        this.setFillColor(r, g, b);
    }

    setFont(fontName, size) {
        const fontKey = fontName.includes('Bold') ? '/F2' : '/F1';
        this.stream.push(`${fontKey} ${size} Tf`);
    }

    text(str, x, y) {
        const clean = this.sanitize(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        this.stream.push(`BT ${x.toFixed(2)} ${y.toFixed(2)} Td (${clean}) Tj ET`);
    }

    rect(x, y, w, h, style = 'D') {
        const op = style === 'F' ? 'f' : (style === 'FD' || style === 'DF' ? 'B' : 'S');
        this.stream.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
    }

    buildBlob() {
        const contentStream = this.stream.join('\n');
        const objects = [];

        objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
        objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
        objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj');
        objects.push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`);
        objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj');
        objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj');

        let body = '%PDF-1.4\n';
        const xrefOffsets = [0];

        objects.forEach(obj => {
            xrefOffsets.push(body.length);
            body += obj + '\n';
        });

        const startXref = body.length;
        body += 'xref\n';
        body += `0 ${objects.length + 1}\n`;
        body += '0000000000 65535 f \n';

        for (let i = 1; i <= objects.length; i++) {
            body += String(xrefOffsets[i]).padStart(10, '0') + ' 00000 n \n';
        }

        body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
        body += `startxref\n${startXref}\n%%EOF`;

        return new Blob([body], { type: 'application/pdf' });
    }
}