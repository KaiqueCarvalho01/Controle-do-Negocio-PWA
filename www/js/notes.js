// ==========================================
// BLOCO DE NOTAS & LEMBRETES COM NOTIFICAÇÕES
// ==========================================

const NOTES_STORAGE_KEY = 'app_notes_data';

/**
 * Retorna a lista de notas salvas no localStorage.
 * @returns {Array} Lista de objetos de anotações.
 */
function getNotes() {
    try {
        const raw = localStorage.getItem(NOTES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Erro ao ler notas do localStorage:', e);
        return [];
    }
}

/**
 * Salva a lista de notas no localStorage.
 * @param {Array} notes Lista de notas.
 */
function setNotes(notes) {
    try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
        console.error('Erro ao salvar notas no localStorage:', e);
    }
}

/**
 * Abre o modal do Bloco de Notas e renderiza a lista atualizada.
 */
function openNotesModal() {
    const modal = document.getElementById('modalNotes');
    if (modal) {
        modal.classList.remove('hidden');
        renderNotesList();
    }
}

/**
 * Fecha o modal do Bloco de Notas e limpa os campos de inserção.
 */
function closeNotesModal() {
    const modal = document.getElementById('modalNotes');
    if (modal) {
        modal.classList.add('hidden');
        limparFormNota();
    }
}

/**
 * Limpa os campos do formulário de nova nota.
 */
function limparFormNota() {
    const textInput = document.getElementById('noteTextInput');
    const dateInput = document.getElementById('noteDateInput');
    const timeInput = document.getElementById('noteTimeInput');
    if (textInput) textInput.value = '';
    if (dateInput) dateInput.value = '';
    if (timeInput) timeInput.value = '';
}

/**
 * Adiciona uma nova nota/tarefa com data/hora opcionais para lembrete.
 */
function salvarNovaNota() {
    const textInput = document.getElementById('noteTextInput');
    const dateInput = document.getElementById('noteDateInput');
    const timeInput = document.getElementById('noteTimeInput');

    const text = textInput ? textInput.value.trim() : '';
    const date = dateInput ? dateInput.value : '';
    const time = timeInput ? timeInput.value : '';

    if (!text) {
        if (typeof destacarCampoErro === 'function' && textInput) {
            destacarCampoErro(textInput, 'Digite o texto da nota ou tarefa.');
        } else {
            alert('Por favor, digite o conteúdo da nota.');
        }
        return;
    }

    const novaNota = {
        id: Date.now(),
        text,
        date,
        time,
        done: false,
        createdAt: new Date().toISOString()
    };

    const notes = getNotes();
    notes.unshift(novaNota);
    setNotes(notes);

    if (date) {
        agendarLembreteNota(novaNota);
    }

    limparFormNota();
    renderNotesList();
}

/**
 * Alterna o status de concluída/pendente de uma nota.
 * Se concluída, cancela o alarme. Se desmarcada e futura, reagenda.
 * @param {number} id ID da nota.
 */
function toggleNotaConcluida(id) {
    const notes = getNotes();
    const nota = notes.find(n => n.id === id);
    if (!nota) return;

    nota.done = !nota.done;
    setNotes(notes);

    if (nota.done) {
        cancelarLembreteNota(id);
    } else if (nota.date) {
        agendarLembreteNota(nota);
    }

    renderNotesList();
}

/**
 * Exclui uma nota da lista e cancela sua notificação se houver.
 * Vai para a lixeira (retenção de 3 dias) e pode ser restaurada.
 * @param {number} id ID da nota.
 */
function excluirNota(id) {
    let notes = getNotes();
    const nota = notes.find(n => n.id === id);
    if (nota && typeof moverParaLixeira === 'function') {
        moverParaLixeira('notes', nota);
    }
    notes = notes.filter(n => n.id !== id);
    setNotes(notes);
    cancelarLembreteNota(id);
    renderNotesList();
}

/**
 * Agenda uma notificação local no Android para o dia e horário especificados na nota.
 * @param {Object} nota Dados da nota.
 */
function agendarLembreteNota(nota) {
    if (!nota || !nota.date || nota.done) return;
    if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;

    try {
        const notifId = Math.abs(Number(String(nota.id).slice(-8)));
        const [ano, mes, dia] = nota.date.split('-').map(Number);
        let hora = 9;
        let minuto = 0;

        if (nota.time) {
            const [h, m] = nota.time.split(':').map(Number);
            if (!isNaN(h)) hora = h;
            if (!isNaN(m)) minuto = m;
        }

        const dataAlvo = new Date(ano, mes - 1, dia, hora, minuto, 0);

        if (dataAlvo > new Date()) {
            cordova.plugins.notification.local.schedule({
                id: notifId,
                title: '📝 Lembrete de Tarefa!',
                text: nota.text,
                trigger: { at: dataAlvo },
                channel: 'servicos_lembretes',
                foreground: true
            });
            console.log('Notificação de nota agendada com sucesso para:', dataAlvo);
        }
    } catch (e) {
        console.error('Erro ao agendar notificação da nota:', e);
    }
}

/**
 * Cancela a notificação de uma nota específica.
 * @param {number} id ID da nota.
 */
function cancelarLembreteNota(id) {
    if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;
    try {
        const notifId = Math.abs(Number(String(id).slice(-8)));
        cordova.plugins.notification.local.cancel(notifId);
    } catch (e) {
        console.error('Erro ao cancelar notificação de nota:', e);
    }
}

/**
 * Reagenda todas as notas com lembretes pendentes ao inicializar o app.
 */
function reagendarTodasNotas() {
    if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;
    const notes = getNotes();
    notes.filter(n => !n.done && n.date).forEach(n => agendarLembreteNota(n));
}

/**
 * Renderiza os cards de notas no container do modal.
 */
function renderNotesList() {
    const container = document.getElementById('notesListContainer');
    if (!container) return;

    const notes = getNotes();

    if (notes.length === 0) {
        container.innerHTML = '<div style="padding: 24px 12px; text-align: center; color: #777; font-size: 13px;">Nenhuma anotação no momento. Adicione tarefas ou lembretes acima!</div>';
        return;
    }

    container.innerHTML = notes.map(n => {
        let lembreteBadge = '';
        if (n.date) {
            const dataFmt = typeof formatDateToBR === 'function' ? formatDateToBR(n.date) : n.date;
            const horaFmt = n.time ? ` às ${n.time}` : '';
            lembreteBadge = `<span class="note-reminder-badge">⏰ ${dataFmt}${horaFmt}</span>`;
        }

        return `
            <div class="note-item ${n.done ? 'note-done' : ''}">
                <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1;">
                    <input type="checkbox" class="note-checkbox" ${n.done ? 'checked' : ''} onchange="toggleNotaConcluida(${n.id})">
                    <div style="flex: 1;">
                        <div class="note-text">${n.text}</div>
                        ${lembreteBadge ? `<div style="margin-top: 4px;">${lembreteBadge}</div>` : ''}
                    </div>
                </div>
                <button type="button" class="btn-remove-note" onclick="excluirNota(${n.id})" title="Excluir anotação">🗑️</button>
            </div>
        `;
    }).join('');
}
