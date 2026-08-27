# AGENT.md — Controle do Negócio PWA

## 1. Visão Geral

Aplicativo **mobile híbrido + PWA** para **autônomos, MEIs e prestadores de serviço** (público brasileiro, interface 100% em PT-BR) gerenciarem:

- Fluxo de caixa (entradas/saídas), orçamentos e serviços
- Histórico de clientes (faturamento, pendências, WhatsApp)
- Estoque / materiais com débito automático vinculado a serviços
- Notas/lembretes com alarme local no Android
- Metas financeiras (salário/pró-labore + capital de giro)
- Painel anual com termômetro do limite **MEI (R$ 81.000,00)**
- 13º salário / reserva de fim de ano
- Backup criptografado AES-256, LGPD, bloqueio por PIN

**Princípio central:** *local-first / 100% offline*. Nenhum dado sai do aparelho (sem servidor, sem nuvem). O compartilhamento é feito **sob ação explícita do usuário** (WhatsApp, PDF, backup via Share).

---

## 2. Stack & Arquitetura

| Camada | Tecnologia |
| :--- | :--- |
| Frontend | HTML5 + CSS3 + **Vanilla JS** (zero frameworks/bundlers) |
| Banco de dados | **IndexedDB** (`ControleNegocioDB`, versão **3**) |
| Config/estado pequeno | `localStorage` (notas, metas, perfil, PIN, snapshots, timestamps) |
| Criptografia | Web Crypto API — **AES-256-GCM + PBKDF2** (backup) e **SHA-256 com salt** (PIN/respostas) |
| Offline | **Service Worker** (`CACHE_NAME 'controle-negocio-v4.0.1'`) |
| Empacotamento | **Apache Cordova** (apenas plataforma Android) |
| WebView nativa | `<script src="cordova.js">` injetado no build (ausente no navegador) |

### Versões Cordova
`cordova-android ^15.1.0`. Scripts: `cordova prepare android`, `cordova build android`, `cordova run android`.
APK gerado: `platforms/android/app/build/outputs/apk/debug/app-debug.apk`.

### Plugins Cordova (package.json `cordova.plugins`)
- `cordova-plugin-file` → escrita de arquivos (backup silencioso, export)
- `cordova-plugin-android-permissions` → permissões Android 13+ (POST_NOTIFICATIONS)
- `cordova-plugin-x-socialsharing` → compartilhar backups/PDFs (WhatsApp, Drive, e-mail)
- `cordova-plugin-local-notification` → alarmes/lembretes locais
- `cordova-plugin-calendar` → criar evento na agenda nativa (alias `window.plugins.calendar`)
- `es6-promise-plugin` (dependência)

### Pré-requisitos de build
Node.js 18+, Java JDK 17, Android SDK **API 33+**.

### Branches / git
- `main` → produção estável
- ramo ativo de desenvolvimento: **`security`** (PIN, LGPD, recuperação, reset)
- Convenção de commits: mensagens curtas em PT-BR (`feat: ...`, `corrigido ...`)

---

## 3. Estrutura de Diretórios

```
Controle-do-Negocio-PWA/
├── config.xml                # Widget Cordova (id com.gestao.controle, ícone, allow-intent)
├── package.json              # Declara com.gestao.controle (eco Cordova)
├── package-lock.json
├── README.md                 # Manual do usuário + docs
├── agent.md                  # Este arquivo
└── www/                      # 100% do app
    ├── index.html            # SPA: header, drawer, filtros, cards, formulários,
    │                         #   abas, ~12 modais, lock screen, loads dos scripts
    ├── manifest.json         # PWA: standalone, portrait, theme #1976d2
    ├── sw.js                 # Service Worker v4.0.1 (network-first para JS/HTML/CSS)
    ├── css/
    │   ├── index.css         # Estilos base do template Cordova
    │   └── style.css         # Toda a UI custom (modais, drawer, cards, PIN, temas)
    ├── img/                  # logo.png, logo.svg
    └── js/                   # 17 scripts globais (sem modules/IIFE)
        ├── crypto.js         # AES-256-GCM + PBKDF2 + hash SHA-256 com salt
        ├── privacy.js        # Lock/PIN, recuperação, LGPD (anonimizar, portabilidade)
        ├── database.js       # Camada IndexedDB (initDB/dbSave/dbDelete/dbGetAll)
        ├── backup.js         # Export/import cripto, snapshot+undo, backup silencioso, wipe
        ├── notifications.js  # Canais, permissão 13+, agendamento de alarmes
        ├── calendar.js       # Agenda nativa (plugin) / fallback Google Calendar
        ├── notes.js          # Notas/tarefas (localStorage) + alarmes
        ├── annual.js         # Painel anual + termômetro MEI
        ├── decimo.js         # 13º salário (3 modos)
        ├── inventory.js      # Estoque: CRUD, consumo, débito/estorno
        ├── pdf.js            # Gera PDF nativo manual (MinimalPdfBuilder, sem libs)
        ├── utils.js          # money(), datas, validação visual, modo privacidade
        ├── whatsapp.js       # openWhatsApp(service) — link wa.me
        ├── forms.js          # Formulários serviço/gasto, cálculo de medidas, datalists
        ├── modals.js         # Modais de status, caixa/giro, perfil, drawer
        ├── render.js         # Toda a renderização (listas, cards, clientes, gráficos)
        └── app.js            # Orquestrador SPA: init, tabs, carregarDados, totais, undo
```

### Ordem de carregamento (importante — globals compartilhados)
`crypto → privacy → database → backup → notifications → calendar → notes → annual → decimo → inventory → pdf → utils → whatsapp → forms → modals → render → app`

Por isso os módulos usam guardas defensivas tipo `typeof fn === 'function'` antes de chamar funções de outros arquivos (rodam em browser puro e no Cordova WebView).

---

## 4. Modelos de Dados

### IndexedDB — `ControleNegocioDB` v3 (object stores: `services`, `expenses`, `quickEntries`, `inventory` — todos keyPath `id`)

```js
// Serviço / Orçamento (store 'services')
{
  id: number,            // Date.now() no novo; vira eixo de ordenação
  client: string,        // OBRIGATÓRIO (único campo obrigatório)
  phone: string,         // opcional
  desc: string,          // detalhes gerais (cor, materiais...)
  notes: string,         // Endereço / observações (vira local no maps e location na agenda)
  items: [{
    type: string,        // nome do produto/serviço (liga à datalist de estoque)
    width: number, height: number,   // medidas em mUnit (opcionais)
    mUnit: 'm'|'mm'|'cm',            // default 'm'
    unitPrice: number, qty: number,
    subtotal: number                 // manual OU calculado
  }],
  labor: number,         // mão de obra (R$)
  date: 'YYYY-MM-DD',
  time: 'HH:MM',         // horário do agendamento
  val: number,           // valor total geral (R$)
  status: 'Orçamento'|'Agendado'|'Realizado'|'Pago',
  pay: 'Pix'|'Dinheiro'|'Cartão'|'Transferência'|'',   // só se Pago
  quoteDate, scheduledDate, doneDate, paidDate: 'YYYY-MM-DD',  // log de fases
  stockDebited?: boolean // flag p/ débito de estoque idempotente
}

// Despesa (store 'expenses')
{ id: number, desc: string, date: 'YYYY-MM-DD', val: number, cat: string }

// Entrada rápida (store 'quickEntries') — backup/restore mantém, UI pouco usa
{ id: number, text: string, date: 'YYYY-MM-DD', val: number }

// Item de estoque (store 'inventory')
{
  id: number, name: string,        // OBRIGATÓRIO
  category: string, specs: string, // opcionais
  qty: number, unit: 'un'|'m'|'cm'|'mm'|'m²'|'m³'|'kg'|'g'|'L'|'ml'|'pct'|'cx'|'rolo'|'par'|'kit' (default 'un'),
  minQty: number, costPrice: number, salePrice: number,
  updatedAt: ISO
}
```

### localStorage (chaves vitais)

| Chave | Formato | Quem usa |
| :--- | :--- | :--- |
| `app_notes_data` | array de notas | notes.js, backup.js |
| `app_caixa_config` | `{ 'YYYY-MM': {fundoCaixa, capitalGiro}, default, targetCapitalGiro, metaDecimoTerceiro, modoDecimo, aporteMensalDecimo }` | modals.js, decimo.js, render.js, backup.js |
| `app_company_profile` | `{ name, owner, phone, pix, city }` | modals.js, pdf.js, whatsapp.js, backup.js |
| `app_pin_security_data` | `{ enabled, pinHash, pinSalt, question, answerHash, answerSalt, createdAt }` | privacy.js |
| `app_mask_values` | `'true'|'false'` | utils.js (modo privacidade) |
| `last_manual_export` | epoch ms | backup.js, app.js (banner 3 dias) |
| `last_auto_backup` | epoch ms | backup.js, app.js (gatilho 24 h) |
| `emergency_backup_snapshot` | snapshot pré-importação (uso único) | backup.js |
| `auto_backup_browser_snapshot` | cópia do backup silencioso (browser) | backup.js |

> Notas vivem em **localStorage**, não no IndexedDB — é a única exceção.

---

## 5. Módulos — Detalhamento

### `app.js` (orquestrador)
- Globais: `activeTab` (`services|quotes|expenses|all`), `serviceSubFilter` (`pending|paid`), `allSubFilter` (`list|charts`), `deferredPwaPrompt`.
- `DOMContentLoaded`: registra SW (`./sw.js`) e força recarga quando nova versão ativa; `initMaskValues()`; `checkAppLockStatus()`; popula `input[type=date]` com `today`; `popularMeses()` (select de meses — ano atual e anterior); `initDB(() => { carregarDados(); if (cordova) deviceready → initNotifications })`.
- `beforeinstallprompt`/`appinstalled` → botão "Instalar Aplicativo" no drawer (`drawerInstallPwa`); `instalarPwaApp()`.
- **`carregarDados(callback)`** — coração do app: `dbGetAll` → aplica filtro de mês (`filterMonth`, prefixo `YYYY-MM`), grava `window.appDataFiltered` e `window.appDataRaw`, banner de serviços de hoje, banner de backup >3d (`last_manual_export`), dispara backup silencioso se >24h, popula datalists de clientes/estoque, `calcularTotais()` e `renderView()`.
- `calcularTotais()`: Recebido = soma de `status==='Pago'`; Pendente = `Agendado|Realizado`; Gastos = despesas; Lucro = in − out.
- Exclusão com desfazer: `confirmDelete(store, id, desc)` (guarda cópia em `ultimoItemExcluido`, estaborna estoque se `stockDebited`, toast 6 s → `executarDesfazerExclusao()`).
- `switchTab`/`switchServiceSubFilter`/`switchAllSubFilter`.

### `database.js`
API mínima: `initDB(cb)` (v3, cria stores na falta), `dbSave(store, item, cb)`, `dbDelete(store, id, cb)`, `dbGetAll(cb)` retorna `{services, expenses, quickEntries, inventory}` (4 stores numa transaction).

### `utils.js`
- `money(v)` → `R$` via `Intl.NumberFormat('pt-BR', {currency:'BRL'})`.
- `getLocalDateString(d)` → `YYYY-MM-DD` local (timezone-safe); `today` é a constante global.
- `formatDateToBR()` (`YYYY-MM-DD` → `DD/MM/YYYY`, idempotente).
- Validação visual: `destacarCampoErro(input, msg)`, `removerMensagemErro`, `limparTodosErrosFormulario(formId)` (classe `input-error` + `.error-msg`).
- **Modo privacidade** (mascarar valores): `maskValuesEnabled`, `initMaskValues()`, `toggleMaskValues()` → `body.blur-values` (CSS esfumaça `.value-maskable`), botão `#btnMask` `👁️`/`🙈`.

### `render.js`
- `clientSortFilter` global (`spent|alpha|recent|oldest`).
- `renderView()` — despacha por `activeTab`; renderiza via strings HTML com `onclick` inline (usa `JSON.stringify(x)` — frágil com aspas no dado).
- `renderServiceCard(x)`: itens (tipo, medida `WxH mUnit`, qty, preço, subtotal), botão de **próximo passo** do status → `openStatusModal`, log de datas (`historicoDatas`), `notes` vira link do **Google Maps**, botões Agenda/WhatsApp/PDF/Editar/Excluir.
- Aba `services`: pills Pendentes (`Agendado|Realizado`) vs Concluídos (`Pago`), busca em client/desc/notes.
- Aba `quotes`: status `Orçamento`. Aba `expenses`: linhas de gastos + editar/excluir.
- Aba `all` (Extrato): totais do mês filtrado, **giro acumulado histórico** (soma por mês anterior: lucro do mês − `fundoCaixa`; reserva só `max(0, ...)`, prejuízo corrói; só serviços `Pago` contam como entrada), metas Fundo de Caixa + Capital de Giro com % e alerta de "Lucro Livre Excedente", sub-filtro `list|charts`, `gerarHtmlGraficos()` (barra in/out proporcional + ranking por categoria: Material, Combustível, Ferramentas, Publicidade, Alimentação, Outros), e o PDF `gerarPdfExtrato`. Movimentações: mescla serviços Pagos (tipo `in`) e despesas (tipo `out`), ordena por data desc.
- Clientes: `openClientsModal`, `switchClientSort`, `renderClientsList()` (agrupa por nome, totais pago/pendente, telefone; ordenações spend/alpha/recent/oldest; ações WhatsApp, "＋ Novo Serviço" (`novoServicoParaCliente`), LGPD `exportarDadosDoTitular`/`anonimizarDadosCliente`).

### `forms.js`
- Formulários serviço/despesa: `openServiceForm(editItem?)`, `openExpenseForm(editItem?, prefillData?)`, `closeAllForms()`.
- `togglePayField()`: campo pagamento só visível quando status `Pago`.
- **`saveService()`**: única validação = `client`. IDs = `Date.now()`. Log de datas de fase imutável ao editar (só preenche a data da fase atual se ainda não existe). Efeitos: `agendarNotificacaoServico`, prompt de agenda nativa se `Agendado` + plugin `window.plugins.calendar`, **estoque**: se `Realizado`/`Pago` e o registro antigo já estava debitado, estorna o consumo antigo (`estornarEstoqueDoServico(existing)`) antes de debitar (`debitarEstoqueDoServico(item)`) — evita débito duplicado ao editar sem mudanças; `estornarEstoqueDoServico(existing)` se voltar para Orçamento/Agendado e tinha `stockDebited`.
- **`recalcularTotaisServico(isSubtotalManual)`** — motor de preço: subtotal manual tem precedência; senão com 2 dimensões usa **área `w×h`** se o item do estoque for unidade `m²`, senão **perímetro/linear `w+h`**; 1 dimensão = linear com conversão (cm÷100, mm÷1000); `subtotal = price × qty × fatorMedida`; soma `labor` no total.
- Datalists: `popularDatalistClientes`, `sugerirTelefoneCliente`, `popularDatalistEstoque`, `sugerirPrecoItemEstoque` (preenche salePrice/costPrice).
- Itens dinâmicos: `addServiceItem(data?)`, `removeServiceItem(itemId)`.
- ⚠️ `saveService` coleta itens via `document.querySelectorAll('.item-row')` **sem escopo** (quirk).

### `modals.js`
- `openStatusModal(id, status)` / `closeStatusModal` / `confirmStatusChange()`:
  - Mapa `Orçamento→Agendado`, `Agendado→Realizado`, `Realizado→Pago`; só a transição para Pago mostra forma de pagamento (default Pix).
  - `confirmStatusChange` muta o objeto ao vivo, grava `scheduledDate|doneDate|paidDate`, **estorna** estoque ao agendar, **debita** ao Realizado/Pago, salva, reagenda notificação.
- Caixa/giro: `getAllCaixaConfigs()` (com migração de formato legado plano → `{default: {...}}`), `getCaixaConfig(monthStr)` (resolução: mês → default → `targetCapitalGiro` → 0; `'all'` cai no mês atual), `openCaixaModal`, `saveCaixaConfig()` (grava no mês atual **e** `targetCapitalGiro` global).
- Perfil: `getCompanyProfile()`, `openProfileModal`, `saveCompanyProfile` (localStorage `app_company_profile`).
- Drawer: `openDrawer`/`closeDrawer` (transição CSS por classes `.open`).

### `backup.js`
- `exportarBackup()` → envelope **v3** `{version:3, exportedAt, services, expenses, quickEntries, inventory, notes, caixaConfig, companyProfile}`; teste de integridade in-memory (stringify/parse); senha opcional via `prompt()` → criptografa (`encryptBackupData`); Cordova: grava em `cordova.file.cacheDirectory` + `socialsharing.shareWithOptions`; browser: Web Share API (AbortError = sucesso) ou `<a download>`; seta `last_manual_export`, `agendarLembreteBackup()`, `carregarDados()`.
- `handleImportFile(event)` — lê/parseia; auto-detecta `__encrypted` → pede senha (`decryptBackupData`); normaliza legado (aceita v1/v2/v3; `data.entries` → quickEntries); **snapshot** `emergency_backup_snapshot` ANTES de apagar; transação limpa + recria as 4 stores; restaura notes/caixa/profile do localStorage; `reagendarTodasNotas()`; em `onerror` faz **rollback** a partir do snapshot.
- `desfazerUltimaImportacao()` — restaura o snapshot (consumido uma vez) e o remove.
- `realizarBackupSilencioso()` — auto diário/24 h; salva o envelope v3 **em texto puro** (cópia interna do app, sem senha — criptografia fica só para a exportação manual) em `auto_backup.json` no `cordova.file.dataDirectory`; browser → `auto_backup_browser_snapshot`; grava `last_auto_backup` ao concluir.
- `limparTodosOsDadosLocais()` — LGPD/descarte: confirma 2x (exige digitar `"APAGAR TUDO"`), `localStorage.clear()`, `sessionStorage.clear()`, `indexedDB.deleteDatabase`, limpa caches do SW, reload.

### `crypto.js`
- `encryptBackupData(dataObj, password)` → `{__encrypted:true, version:1, algorithm:'AES-256-GCM', salt, iv, payload, exportedAt}` (campos binários em base64). PBKDF2 `iterations:100000, SHA-256`, salt 16 B, IV 12 B, chave não-extraível.
- `decryptBackupData(obj, password)` — backup legado (sem `__encrypted`) passa direto; senha errada → erro genérico `'Senha incorreta ou arquivo de backup corrompido.'`.
- `hashValueWithSalt(value, salt?)` → `SHA-256(salt ‖ value.toLowerCase().trim())` (usado para PIN e resposta secreta). ⚠️ Hash rápido + PIN de 4 dígitos = brute-force trivial se localStorage for extraído.
- `bufferToBase64`/`base64ToBuffer`.
- Sem chave mestra hardcoded no arquivo (README menciona chave configurável em `crypto.js` — hoje não há).

### `privacy.js`
- Lock por PIN: `checkAppLockStatus()` (no boot), keypad virtual (`handlePinDigit`, 4 dígitos, auto-submit), `submitUnlockPin` (verifica via `verifyHashedValue`), `unlockApp`. Sem contador de tentativas.
- Config: `openSecurityModal`, `onTogglePinSwitch` (ao ATIVAR sempre pede um PIN novo como no primeiro cadastro — não reativa o hash antigo; ao DESATIVAR apenas desliga), `saveNewPinConfiguration` (PIN + pergunta/resposta secrets). Recuperação `openForgotPinModal` / `submitResetPinWithAnswer` (responde a pergunta → redefine PIN; modal sobrepoõe lock screen com `z-index: 1000000`).
- LGPD: `exportarDadosDoTitular(client)` (JSON portável Art. 18) e `anonimizarDadosCliente(client)` (vira `'Cliente Anonimizado'`, apaga phone, preserva valores financeiros, salva registro por registro).

### `inventory.js`
- `openInventoryModal`/`close` + `saveInventoryItem`/`deleteInventoryItem`/`adjustInventoryQty` e `renderInventoryList()` (busca, filtro por categoria, `__low` = só estoque baixo; header com totais e patrimônio a custo `Σ qty*costPrice`).
- **`calcularConsumoItemEstoque(sItem, invItem)`** — consumo conforme unidade: `m²` → `w×h×qty`; linear com 2 dims → `w+h` escalado; unid. → qty.
- **`debitarEstoqueDoServico(service)`** / **`estornarEstoqueDoServico(service)`** — casa `sItem.type` com `inv.name` ou `inv.name (specs)`; idempotente via flag `stockDebited`; quantidades min 0, 4 casas decimais. Consumidos por forms.js, modals.js e app.js.

### `notes.js`
- Notas em `localStorage` (`app_notes_data`): `{id, text, date, time, done, createdAt}`.
- `salvarNovaNota`, `toggleNotaConcluida` (cancela/reagenda alarme), `excluirNota`, `agendarLembreteNota` (ID = últimas 8 casas do id, canal `servicos_lembretes`, hora default 09:00), `reagendarTodasNotas()` (re-cria todos os alarmes pendentes — usado no boot e pós-importação).

### `notifications.js`
- `initNotifications()` (no `deviceready`): pede permissão POST_NOTIFICATIONS (Android 13+/API 33) → só agenda **dentro do callback de concessão**; cria 3 canais.
- Canais: `servicos_lembretes` (importância 4, vibração), `alertas_financeiros` (3, vibração), `sistema_backup` (3, sem vibração).
- `agendarNotificacaoServico(servico)` — serviço `Agendado` → alarme na data (`scheduledDate || date`) **no horário do campo `time` (HH:MM)**; sem horário, fallback 08:00; não-Agendado → `cancel`.
- `agendarLembreteBackup()` — recorrente 12:00 diário (ID fixo `999901`).
- `verificarNotificacoesAoIniciar()` — 2,5 s após boot, alerta serviço `Realizado` não pago (ID fixo `999902`).
- `reagendarServicosFuturos()` — re-cria alarmes de todos `Agendado` (recuperação pós-reboot — não há persistência de alarme no plugin).

### `calendar.js`
- `adicionarServicoNaAgenda(service)` — nativo `window.plugins.calendar.createEventInteractively` (título `🛠️ cliente - desc`, local = `notes`, corpo com cliente/tel/valor, início na `date`+`time` (default 09:00), duração fixa 1 h). Fallback web: template URL do Google Calendar (`calendar.google.com/calendar/render?action=TEMPLATE&...`).

### `annual.js`
- `LIMITE_MEI_ANUAL = 81000`. `openAnnualModal`/`renderAnnualReport(year)`:
  - Usa **`window.appDataRaw`** (ignora filtro de mês). Entrada anual = só serviços `Pago`; despesas todas.
  - Termômetro 3 faixas: verde (<80%), laranja (≥80% = R$64.800, "⚠️ Atenção"), vermelho (>R$81.000, "🚨 ultrapassou").
  - Fechamento mês a mês (Janeiro–Dezembro), `mediaMensal = totalIn/mesesComFaturamento`, barra mensal normalizada por 1/4 do ano.
  - Cards: Faturamento Anual, Despesas (com N serviços pagos), Lucro Líquido.

### `decimo.js`
- Config no `app_caixa_config`: `metaDecimoTerceiro`, `modoDecimo`, `aporteMensalDecimo`.
- Modos: `aporte_gastos` (lança despesa cat `13º Salário / Férias`; busca por cat **ou** desc contendo `13º`/`decimo`), `aporte_mensal` (meta/12 × meses decorridos, puramente calendário), `excedente_giro` (só o que sobra após `targetCapitalGiro` global).
- `lancarAporteDecimoNosGastos()` → `switchTab('expenses')` + `openExpenseForm(null, {desc, cat:'13º Salário / Férias', val, date})`.
- Badge de status, `bonusExtra` quando estourado.

### `pdf.js`
- **`MinimalPdfBuilder`** — PDF 1.4 gerado **manualmente** (sem biblioteca): stream de operadores, A4 595.28×841.89 pt, fonte Helvetica (F1) / Bold (F2), xref table válida, `buildBlob()`.
- `sanitize()` remove acentos e não-ASCII (⚠️ texto PDF perde acentos/emojis).
- `gerarPdfServico(servico)` — "PROPOSTA DE ORÇAMENTO" (Orçamento) ou "COMPROVANTE DE SERVIÇO"; cabeçalho com perfil da empresa/logo (banner azul `rect`), box clientes, tabela de itens (zebra), linha de mão de obra, totalizador Materiais | Mão de Obra, **box Pix** quando `profile.pix`, rodapé.
- `gerarPdfExtrato()` — usa **`window.appDataFiltered`** (mês filtrado): totais do mês, tabela movimentações por data desc.
- ⚠️ Sem paginação (1 página só); coordenadas fixas (texto longo pode sobrepor).
- Compartilha via socialsharing (cache dir) / Web Share / download (fallback).

### `whatsapp.js`
- `openWhatsApp(serviceItem)` — normaliza telefone (prefixa `55` se ≤ 11 dígitos e não começa com 55), monta mensagem rica por status (Orçamento/Agendado/Realizado/Pago), com itens numerados, mão de obra, detalhes, **Pix só se não pago**, assinatura do perfil; abre `https://api.whatsapp.com/send?phone=...&text=...` com `target='_system'`.

---

## 6. Fluxos de Negócio Essenciais

### Ciclo de status do serviço
`Orçamento → Agendado → Realizado → Pago`

- Cada transição registra a data de fase correspondente (`quoteDate/scheduledDate/doneDate/paidDate`), editáveis sem sobrescrever as anteriores.
- `pay` só é persistido quando `Pago`.
- Notificação automática no horário agendado (`time`, fallback 08:00) para `Agendado`.
- Estoque: debita em `Realizado`/`Pago` (guardado por flag `stockDebited`), estorna ao voltar para pendente ou excluir; ao **editar** um serviço já debitado, estorna o antigo e debita o novo (rebalanceamento).

### Metas financeiras & giro acumulado (Extrato)
- `fundoCaixa` (pró-labore/salário do mês) é **por mês**; `capitalGiro` (reserva) é **global** (`targetCapitalGiro`).
- Giro acumulado = soma histórica (meses anteriores ao filtro) de `max(0, lucroMês − salárioMês)`; prejuízo corrói a reserva; entradas contam só `Pago`.
- Excedente = giro além da meta → decentral "lucro livre".

### Termômetro MEI (R$ 81.000)
Percentual sobre faturamento anual recebido (`Pago` apenas); cor muda em 80% (R$ 64.800) e 100%.

### 13º salário
3 modos mutuamente exclusivos (ver seção decimo.js); o modo `excedente_giro` depende de `targetCapitalGiro` estar preenchido.

### Backup
Regras de tempo: banner avisa se > **3 dias** sem exportação manual; backup silencioso dispara a cada **24 h**.

---

## 7. Convenções de Código

- **Sem modules/IIFE** — tudo no escopo global, funções declaradas `function` para uso em `onclick` inline do HTML.
- Guardas defensivas `typeof fn === 'function'` e checagens `window.cordova` / `window.plugins` para dual browser/Cordova.
- IDs numéricos = `Date.now()`.
- Datas em `YYYY-MM-DD` (ordenáveis lexicograficamente); exibição via `formatDateToBR`/`money`.
- Valores monetários renderizados com classe `value-maskable` para o modo privacidade.
- Nomes de função/variavel em **pt-BR** (`carregarDados`, `calcularTotais`, `renderView`).
- Cabeçalhos de seção com `// ====`, JSDoc básico em português nas funções e comentários explicativos para lógica não óbvia.
- Modal: `.modal-overlay` + `.modal-card`; mostrar = remover `hidden`; alguns modais usam `z-index` acima de outros.

### Retrocompatibilidade (regra de ouro)

> Todo e qualquer alteração de código **deve** ser retrocompatível com versões anteriores do app. Bases de dados produzidas por versões antigas **nunca** podem quebrar ou perder informação.

- **IndexedDB (`ControleNegocioDB`)**: nunca remover/renomear object stores (`services`, `expenses`, `quickEntries`, `inventory`) nem mudar o `keyPath` (`id`). Para adicionar novos campos, itens novos são opcionais e sempre tratados com fallback (`|| 0`, `|| ''`, `Array.isArray(...)`, `typeof === 'undefined'`). Aumentar `version` do banco só com `onupgradeneeded` que **cria** dados sem destruir os existentes.
- **Registros**: ao salvar/editar, preservar todos os campos legados mesmo que não sejam mais usados na UI (ex.: o objeto `services` deve continuar gravando `quoteDate/scheduledDate/doneDate/paidDate`, `pay`, `labor`, `stockDebited`, `items[]` etc.).
- **localStorage**: não renomear/remover chaves existentes (`app_notes_data`, `app_caixa_config`, `app_company_profile`, `app_pin_security_data`, `app_mask_values`, `last_manual_export`, `last_auto_backup`, `emergency_backup_snapshot`, `auto_backup_browser_snapshot`). Ao mudar formato, migrar na leitura (ver `getAllCaixaConfigs()` que migra o formato legado plano de `app_caixa_config` para `{default: {...}}`).
- **Variáveis globais**: manter nomes e assinaturas de funções/variaveis já existentes. Novos recursos **adicionam** funções novas; não renomeiam/removem as atuais, pois o HTML chama via `onclick` inline e módulos dependem dos globals (`window.appDataRaw`, `window.appDataFiltered`, `activeTab`, `serviceSubFilter`, `allSubFilter`, `db`, `today`, etc.).
- **Backups `.json`**: aceitar e restaurar formatos antigos (v1/v2/v3). Não exigir campos novos na importação; normalizar shape legado (ex.: `data.entries` → `quickEntries`).
- **Dual contexto browser/Cordova**: manter guardas `typeof fn === 'function'`, `window.cordova`, `window.plugins` para o mesmo código rodar em PWA (navegador) e no WebView nativo.

### Comentários

- **Comentários devem ser MANTIDOS** ao editar código existente — não apagar os comentários/`JSDoc` já presentes nos arquivos.
- **Comentários devem ser ACRESCENTADOS** sempre que a lógica for não óbvia (regras de negócio, cálculos de medidas/estoque, migrações, transições de status), explicando o **porquê** da decisão — em português, seguindo o estilo do projeto (`// texto`, `/** JSDoc */`).

---

## 8. Bugs / Peculiaridades Conhecidas

1. **PDF perdroso**: acentos/emoji removidos, sem paginação, coordenadas fixas (sobreposição em textos longos).
2. **Sem "lixeira de 3 dias" real** — exclusão é definitiva com undo via toast (6 s) e, pom importação, snapshot de uso único.
3. **PIN**: sem limite de tentativas (força bruta na tela de bloqueio); hash SHA-256 salgado (não PBKDF2) para 4 dígitos = fraco contra extração de localStorage.
4. **Renderização por strings inline**: `JSON.stringify` dentro de `onclick` quebra com aspas/caracteres especiais em nomes.
5. `saveService()` coleta itens com `querySelectorAll('.item-row')` sem escopo.
6. README lista `descriptografar.html`/`descriptografar.js` e manual_do_usuario/manual_tecnico em outro repo (estes arquivos **não existem** neste repositório).
7. Branches de trabalho: `main` (produção) e `security` (desenvolvimento ativo).

---

## 9. Referência rápida de fluxos de execução (boot)

```
Boot:
DOMContentLoaded (app.js)
 ├─ serviceWorker.register('./sw.js') → força update/reload em nova versão
 ├─ initMaskValues()  (utils)
 ├─ checkAppLockStatus()  (privacy — tela PIN se habilitado)
 ├─ popularMeses()
 └─ initDB(cb=carregarDados)  (database)
     ├─ carregarDados() → dbGetAll → appDataFiltered/appDataRaw → banners
     │                    → datalists → calcularTotais → renderView()
     └─ se cordova: deviceready → initNotifications()
         ├─ permissão POST_NOTIFICATIONS (Android 13+)
         ├─ configurarCanais()
         ├─ agendarLembreteBackup()
         ├─ verificarNotificacoesAoIniciar()
         ├─ reagendarServicosFuturos()
         └─ reagendarTodasNotas()

Recarga dados: carregarDados() (removido filtro, salvo edição, desfeito, etc.)
```