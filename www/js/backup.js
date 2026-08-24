// ==========================================
// MÓDULO DE BACKUP, CRIPTOGRAFIA & RESTAURAÇÃO
// ==========================================

/**
 * Exporta o backup com criptografia AES-256 e teste de integridade em memória.
 */
async function exportarBackup() {
    try {
        const rawServices = window.appDataRaw?.services || [];
        const rawExpenses = window.appDataRaw?.expenses || [];
        const rawQuick = window.appDataRaw?.quickEntries || [];
        const rawInventory = window.appDataRaw?.inventory || [];

        const dataToExport = {
            version: 3,
            exportedAt: new Date().toISOString(),
            services: rawServices,
            expenses: rawExpenses,
            quickEntries: rawQuick,
            inventory: rawInventory,
            notes: JSON.parse(localStorage.getItem('app_notes_data') || '[]'),
            caixaConfig: JSON.parse(localStorage.getItem('app_caixa_config') || '{}'),
            companyProfile: JSON.parse(localStorage.getItem('app_company_profile') || '{}')
        };

        // 1. Teste de integridade em memória
        const dataStr = JSON.stringify(dataToExport);
        const parsedCheck = JSON.parse(dataStr);
        if (!parsedCheck || !Array.isArray(parsedCheck.services)) {
            throw new Error('Falha na validação de integridade dos dados na memória.');
        }

        // 2. Solicita senha opcional ao usuário para criptografia AES-256
        const userPassword = prompt('🔒 Deseja proteger seu backup com uma senha?\n\nDigite uma senha pessoal (ou deixe em branco para exportar sem senha):');
        if (userPassword === null) {
            return; // Usuário cancelou
        }

        let exportPayload = dataToExport;
        if (userPassword.trim().length > 0) {
            if (typeof encryptBackupData === 'function') {
                exportPayload = await encryptBackupData(dataToExport, userPassword.trim());
            }
        }

        const finalJsonStr = JSON.stringify(exportPayload, null, 2);
        const fileName = 'controle-negocio-backup.json';
        const blob = new Blob([finalJsonStr], { type: 'application/json' });

        if (blob.size === 0) {
            throw new Error('O arquivo de backup gerado está vazio.');
        }

        // 3. Exportação no Cordova ou Navegador / PWA
        if (window.plugins && window.plugins.socialsharing) {
            window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, function (dirEntry) {
                dirEntry.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {
                        fileWriter.onwriteend = function () {
                            localStorage.setItem('last_manual_export', Date.now().toString());
                            if (typeof agendarLembreteBackup === 'function') {
                                agendarLembreteBackup();
                            }
                            if (typeof carregarDados === 'function') {
                                carregarDados();
                            }
                            window.plugins.socialsharing.shareWithOptions({
                                message: 'Backup Protegido do Controle do Negócio',
                                subject: 'Backup Controle do Negócio',
                                files: [fileEntry.nativeURL],
                                chooserTitle: 'Salvar ou Compartilhar Backup Seguro'
                            });
                        };
                        fileWriter.write(blob);
                    });
                });
            }, function (err) {
                alert('Erro ao salvar arquivo de backup: ' + JSON.stringify(err));
            });
        } else {
            // Suporte a Web Share API no celular (PWA) com fallback para download
            let compartilhou = false;
            if (navigator.share && navigator.canShare) {
                try {
                    const fileObj = new File([blob], fileName, { type: 'application/json' });
                    if (navigator.canShare({ files: [fileObj] })) {
                        await navigator.share({
                            files: [fileObj],
                            title: 'Backup Controle do Negócio',
                            text: 'Arquivo de backup do Controle do Negócio.'
                        });
                        compartilhou = true;
                    }
                } catch (shareErr) {
                    if (shareErr.name === 'AbortError') compartilhou = true;
                }
            }

            if (!compartilhou) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            localStorage.setItem('last_manual_export', Date.now().toString());
            if (typeof agendarLembreteBackup === 'function') {
                agendarLembreteBackup();
            }
            if (typeof carregarDados === 'function') {
                carregarDados();
            }
        }
    } catch (err) {
        alert('Erro ao gerar backup: ' + err.message);
    }
}

/**
 * Importa o backup com detecção automática de criptografia e solicitação de senha.
 */
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            let rawParsed = JSON.parse(e.target.result);

            if (!rawParsed || typeof rawParsed !== 'object') {
                alert('Erro: Arquivo de backup corrompido ou formato inválido.');
                event.target.value = '';
                return;
            }

            let data = rawParsed;

            // 1. Se estiver criptografado, solicita a senha definida na exportação
            if (rawParsed.__encrypted) {
                const userPass = prompt('🔒 Este backup está protegido por senha.\n\nDigite a senha que você definiu ao exportar:');
                if (!userPass) {
                    event.target.value = '';
                    return;
                }
                if (typeof decryptBackupData === 'function') {
                    try {
                        data = await decryptBackupData(rawParsed, userPass.trim());
                    } catch (decErr) {
                        alert('❌ Senha incorreta! Não foi possível restaurar os dados.');
                        event.target.value = '';
                        return;
                    }
                }
            }

            // Normalizador de retrocompatibilidade (aceita v1, v2 e v3)
            let importedServices = Array.isArray(data.services) ? data.services : [];
            let importedExpenses = Array.isArray(data.expenses) ? data.expenses : [];
            let importedQuick = Array.isArray(data.quickEntries) ? data.quickEntries : [];
            let importedInventory = Array.isArray(data.inventory) ? data.inventory : [];

            if (Array.isArray(data.entries) && data.entries.length > 0) {
                importedQuick = [...importedQuick, ...data.entries];
            }

            if (importedServices.length === 0 && importedExpenses.length === 0 && importedQuick.length === 0 && importedInventory.length === 0) {
                alert('Atenção: O arquivo de backup selecionado não contém nenhum registro válido.');
                event.target.value = '';
                return;
            }

            const confirmMsg = `Arquivo validado com sucesso!\n\n` +
                               `• Serviços: ${importedServices.length}\n` +
                               `• Gastos: ${importedExpenses.length}\n` +
                               `• Itens no Estoque: ${importedInventory.length}\n\n` +
                               `Deseja restaurar este backup? Os dados atuais serão substituídos.`;

            if (!confirm(confirmMsg)) {
                event.target.value = '';
                return;
            }

            // 2. Snapshot de Emergência Completo no localStorage antes de limpar o banco
            dbGetAll(currentData => {
                try {
                    const fullSnapshot = {
                        timestamp: new Date().toISOString(),
                        services: currentData.services || [],
                        expenses: currentData.expenses || [],
                        quickEntries: currentData.quickEntries || [],
                        inventory: currentData.inventory || [],
                        notes: JSON.parse(localStorage.getItem('app_notes_data') || '[]'),
                        caixaConfig: JSON.parse(localStorage.getItem('app_caixa_config') || '{}'),
                        companyProfile: JSON.parse(localStorage.getItem('app_company_profile') || '{}')
                    };
                    localStorage.setItem('emergency_backup_snapshot', JSON.stringify(fullSnapshot));
                } catch (snapErr) {
                    console.warn('Não foi possível criar o snapshot temporário no localStorage:', snapErr);
                }

                // 3. Gravação no IndexedDB
                const tx = db.transaction(['services', 'expenses', 'quickEntries', 'inventory'], 'readwrite');
                const storeServices = tx.objectStore('services');
                const storeExpenses = tx.objectStore('expenses');
                const storeQuick = tx.objectStore('quickEntries');
                const storeInventory = tx.objectStore('inventory');

                storeServices.clear();
                storeExpenses.clear();
                storeQuick.clear();
                storeInventory.clear();

                importedServices.forEach(item => storeServices.put(item));
                importedExpenses.forEach(item => storeExpenses.put(item));
                importedQuick.forEach(item => storeQuick.put(item));
                importedInventory.forEach(item => storeInventory.put(item));

                // Restaura configurações de caixa se existirem no backup
                if (data.caixaConfig && typeof data.caixaConfig === 'object') {
                    localStorage.setItem('app_caixa_config', JSON.stringify(data.caixaConfig));
                }

                // Restaura perfil da empresa se existir no backup
                if (data.companyProfile && typeof data.companyProfile === 'object') {
                    localStorage.setItem('app_company_profile', JSON.stringify(data.companyProfile));
                }

                // Restaura anotações do bloco de notas se existirem no backup
                if (Array.isArray(data.notes)) {
                    localStorage.setItem('app_notes_data', JSON.stringify(data.notes));
                    if (typeof reagendarTodasNotas === 'function') {
                        reagendarTodasNotas();
                    }
                }

                tx.oncomplete = () => {
                    alert('Backup restaurado com sucesso!\n\nUm ponto de restauração foi salvo. Caso deseje desfazer, use a opção "Desfazer Importação" no menu lateral.');
                    event.target.value = '';
                    carregarDados();
                };

                tx.onerror = () => {
                    alert('Erro crítico ao gravar no banco. Restaurando dados anteriores...');
                    // Reversão de emergência
                    const snapshot = localStorage.getItem('emergency_backup_snapshot');
                    if (snapshot) {
                        try {
                            const oldData = JSON.parse(snapshot);
                            const rollbackTx = db.transaction(['services', 'expenses', 'quickEntries', 'inventory'], 'readwrite');
                            (oldData.services || []).forEach(it => rollbackTx.objectStore('services').put(it));
                            (oldData.expenses || []).forEach(it => rollbackTx.objectStore('expenses').put(it));
                            (oldData.quickEntries || []).forEach(it => rollbackTx.objectStore('quickEntries').put(it));
                            (oldData.inventory || []).forEach(it => rollbackTx.objectStore('inventory').put(it));
                            rollbackTx.oncomplete = () => carregarDados();
                        } catch (rErr) {
                            console.error('Falha no rollback:', rErr);
                        }
                    }
                    event.target.value = '';
                };
            });

        } catch (err) {
            alert('Erro: O arquivo de backup selecionado está corrompido ou possui erros de sintaxe.');
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

/**
 * Desfaz a última importação de backup, restaurando os dados para o estado do snapshot de segurança.
 */
function desfazerUltimaImportacao() {
    try {
        const rawSnapshot = localStorage.getItem('emergency_backup_snapshot');
        if (!rawSnapshot) {
            alert('Não há nenhum ponto de restauração disponível.\n\nO ponto de segurança é criado automaticamente sempre que você realiza uma importação de backup.');
            return;
        }

        const snapshot = JSON.parse(rawSnapshot);
        const services = snapshot.services || [];
        const expenses = snapshot.expenses || [];
        const quick = snapshot.quickEntries || [];
        const inventory = snapshot.inventory || [];
        const notes = snapshot.notes || [];
        const caixaConfig = snapshot.caixaConfig || null;

        let dataHoraFormatada = 'Data recente';
        if (snapshot.timestamp) {
            const d = new Date(snapshot.timestamp);
            dataHoraFormatada = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        const confirmMsg = `Deseja desfazer a última importação e voltar para o estado anterior?\n\n` +
                           `📅 Ponto de restauração: ${dataHoraFormatada}\n` +
                           `• Serviços a recuperar: ${services.length}\n` +
                           `• Gastos a recuperar: ${expenses.length}\n` +
                           `• Itens de estoque a recuperar: ${inventory.length}\n\n` +
                           `Todos os dados voltarão para exatamente como estavam antes de você importar o último arquivo.`;

        if (!confirm(confirmMsg)) {
            return;
        }

        const tx = db.transaction(['services', 'expenses', 'quickEntries', 'inventory'], 'readwrite');
        const storeServices = tx.objectStore('services');
        const storeExpenses = tx.objectStore('expenses');
        const storeQuick = tx.objectStore('quickEntries');
        const storeInventory = tx.objectStore('inventory');

        storeServices.clear();
        storeExpenses.clear();
        storeQuick.clear();
        storeInventory.clear();

        services.forEach(it => storeServices.put(it));
        expenses.forEach(it => storeExpenses.put(it));
        quick.forEach(it => storeQuick.put(it));
        inventory.forEach(it => storeInventory.put(it));

        const companyProfile = snapshot.companyProfile || null;
        if (companyProfile) {
            localStorage.setItem('app_company_profile', JSON.stringify(companyProfile));
        }

        if (caixaConfig) {
            localStorage.setItem('app_caixa_config', JSON.stringify(caixaConfig));
        }

        localStorage.setItem('app_notes_data', JSON.stringify(notes));
        if (typeof reagendarTodasNotas === 'function') {
            reagendarTodasNotas();
        }

        tx.oncomplete = () => {
            localStorage.removeItem('emergency_backup_snapshot');
            alert('A importação foi desfeita com sucesso!\nSeus dados anteriores foram 100% restaurados.');
            if (typeof closeDrawer === 'function') closeDrawer();
            if (typeof carregarDados === 'function') carregarDados();
        };

        tx.onerror = (err) => {
            alert('Erro ao restaurar dados do snapshot: ' + JSON.stringify(err));
        };

    } catch (e) {
        alert('Erro ao processar o ponto de restauração: ' + e.message);
    }
}

/**
 * Realiza um backup silencioso em segundo plano a cada 24 horas no armazenamento interno do app.
 */
async function realizarBackupSilencioso() {
    try {
        const rawServices = window.appDataRaw?.services || [];
        const rawExpenses = window.appDataRaw?.expenses || [];
        const rawQuick = window.appDataRaw?.quickEntries || [];
        const rawInventory = window.appDataRaw?.inventory || [];

        // Se não houver dados, não precisa salvar
        if (rawServices.length === 0 && rawExpenses.length === 0 && rawQuick.length === 0 && rawInventory.length === 0) {
            return;
        }

        const dataToExport = {
            version: 3,
            exportedAt: new Date().toISOString(),
            services: rawServices,
            expenses: rawExpenses,
            quickEntries: rawQuick,
            inventory: rawInventory,
            notes: JSON.parse(localStorage.getItem('app_notes_data') || '[]'),
            caixaConfig: JSON.parse(localStorage.getItem('app_caixa_config') || '{}'),
            companyProfile: JSON.parse(localStorage.getItem('app_company_profile') || '{}')
        };

        let exportPayload = dataToExport;
        if (typeof encryptBackupData === 'function') {
            exportPayload = await encryptBackupData(dataToExport);
        }

        const dataStr = JSON.stringify(exportPayload);

        // Se estiver em ambiente Cordova com acesso ao sistema de arquivos
        if (window.cordova && window.cordova.file && window.resolveLocalFileSystemURL) {
            const dir = cordova.file.dataDirectory || cordova.file.cacheDirectory;
            if (!dir) return;

            window.resolveLocalFileSystemURL(dir, function (dirEntry) {
                dirEntry.getFile('auto_backup.json', { create: true, exclusive: false }, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {
                        fileWriter.onwriteend = function () {
                            localStorage.setItem('last_auto_backup', Date.now().toString());
                            console.log('[AutoBackup] Backup silencioso protegido salvo com sucesso.');
                        };
                        fileWriter.onerror = function (err) {
                            console.warn('[AutoBackup] Erro ao gravar arquivo:', err);
                        };
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        fileWriter.write(blob);
                    });
                }, function (err) {
                    console.warn('[AutoBackup] Erro ao criar arquivo:', err);
                });
            }, function (err) {
                console.warn('[AutoBackup] Erro ao resolver diretório:', err);
            });
        } else {
            // Em ambiente de navegador (desenvolvimento / teste)
            localStorage.setItem('last_auto_backup', Date.now().toString());
            try {
                localStorage.setItem('auto_backup_browser_snapshot', dataStr);
                console.log('[AutoBackup] Snapshot do navegador salvo no localStorage.');
            } catch (storageErr) {
                console.warn('[AutoBackup] LocalStorage cheio para snapshot:', storageErr);
            }
        }
    } catch (e) {
        console.warn('[AutoBackup] Falha no backup automático silencioso:', e);
    }
}
