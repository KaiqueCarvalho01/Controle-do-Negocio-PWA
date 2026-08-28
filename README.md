# 📊 Controle do Negócio

Aplicativo mobile híbrido desenvolvido para profissionais autônomos, MEIs e prestadores de serviços gerenciarem fluxo de caixa (entradas/saídas), orçamentos, estoque, histórico de clientes, agendamentos e tarefas de forma **100% offline**, segura e sem necessidade de conexão com a internet.

---

## 📚 Manual do Usuário

Guia completo do aplicativo em dois formatos:

| Documento | Formato Markdown | Formato PDF |
| :--- | :--- | :--- |
| **📘 Manual do Usuário** | [`docs/MANUAL_DO_USUARIO.md`](docs/MANUAL_DO_USUARIO.md) | [`docs/MANUAL_DO_USUARIO.pdf`](docs/MANUAL_DO_USUARIO.pdf) |

---

## 🚀 Funcionalidades do Sistema

### 🛠️ 1. Gestão Completa de Serviços & Orçamentos
- **Aba Exclusiva para Orçamentos:** Separação entre propostas comerciais e serviços confirmados.
- **Sub-filtro de Serviços:** Alternância rápida entre serviços *Pendentes* (Agendados/Realizados) e *Concluídos* (Pagos).
- **Fluxo Guiado de Status:** Transição com modal próprio (`Orçamento` ➔ `Agendado` ➔ `Realizado` ➔ `Pago`) com seleção padronizada de pagamento (Pix, Dinheiro, Cartão, Transferência).
- **Histórico Completo de Datas (Log):** Registro das datas em que cada etapa do serviço foi executada (`quoteDate`, `scheduledDate`, `doneDate`, `paidDate`).
- **Itens e Medidas Flexíveis:** Suporte a cálculo automático por dimensões e quantidade ou preenchimento livre de subtotais e valor total.
- **Autocomplete & Sugestão de Contato:** Ao digitar o nome do cliente, o sistema sugere clientes já cadastrados e preenche o telefone automaticamente.

---

### 📅 2. Integração com a Agenda do Celular
- **Definição de Horários:** Campo de horário integrado para agendamento de serviços.
- **Sincronização com o Google Agenda / Android:** Criação de eventos na agenda nativa do smartphone com 1 toque, pré-preenchendo cliente, endereço, detalhes e horário do serviço.

---

### 👥 3. Histórico e Gestão de Clientes
- **Painel de Clientes:** Acessível pelo menu lateral, exibindo faturamento total gerado por cada cliente e saldo pendente.
- **Filtros e Ordenação Inteligente:**
  - 💰 *Mais Gastaram* (Clientes mais lucrativos no topo)
  - 🔤 *Ordem Alfabética (A-Z)*
  - 🆕 *Mais Recentes* (Últimos atendidos)
  - ⏳ *Mais Antigos*
- **Ações Rápidas:**
  - 💬 Abrir conversa no WhatsApp com 1 clique.
  - ➕ Criar novo serviço já com o nome e telefone do cliente preenchidos.
  - 📜 Histórico expansível com todos os serviços e pagamentos realizados.

---

### 📝 4. Bloco de Notas & Lembretes com Alarme
- **Checklist de Tarefas:** Crie anotações rápidas com caixas de marcação interativas (com efeito riscado ao concluir).
- **Alarmes no Android:** Defina data e hora para receber notificações locais na tela do celular no momento exato programado.
- **Persistência Pós-Reboot:** Lembretes pendentes são reagendados automaticamente ao reiniciar o aparelho.
- **Inclusão no Backup:** Todas as anotações e tarefas são exportadas e restauradas junto com o backup `.json`.

---

### 💰 5. Despesas, Extrato & Metas Financeiras
- **Registro Categorizado:** Despesas separadas por categorias (Material, Combustível, Alimentação, Ferramentas, etc.).
- **Extrato Consolidado:** Entradas e saídas unificadas com busca em tempo real por cliente ou descrição.
- **Metas de Caixa & Capital de Giro:**
  - Configuração de Fundo de Caixa (reserva de emergência) e Capital de Giro.
  - Cálculo automático de saldo livre disponível para retiradas/pró-labore.
  - Opção de considerar o saldo restante do mês anterior.
- **Gráficos e Indicadores Visuais:** Indicador visual de proporção entre Entradas x Saídas e barras de distribuição percentual dos gastos por categoria.
- **Exportação em PDF:** Geração de extrato detalhado formatado em PDF para prestação de contas ou arquivamento.

---

### 👁️ 6. Privacidade & Lixeira de Segurança
- **Modo Privacidade (`👁️`):** Botão no cabeçalho que oculta todos os valores financeiros da tela (ex: `R$ *****`), permitindo usar o aplicativo perto de clientes ou funcionários com total discrição.
- **Lixeira com Retenção Temporária:** Registros excluídos vão para a lixeira por **3 dias** antes da exclusão definitiva, permitindo restaurar serviços e gastos apagados por engano.

---

### 🛡️ 7. Backup, Segurança & Snapshot de Restauração
- **Exportação Validada:** Teste de integridade em memória (*Round-Trip Test*) e validação de tamanho de arquivo antes de salvar/compartilhar via WhatsApp, Drive ou E-mail.
- **Backup Silencioso:** Cópia de segurança automática diária em segundo plano no armazenamento interno do app.
- **Lembrete Periódico:** Notificação e banner caso o usuário passe mais de **3 dias** sem exportar uma cópia de segurança externa.
- **Snapshot Pré-Importação & Desfazer Importação:**
  - Antes de restaurar qualquer backup, o app grava um ponto de restauração completo no `localStorage`.
  - Opção **"↩️ Desfazer Importação"** no menu lateral para reverter 100% dos dados para o estado anterior caso um arquivo incorreto tenha sido importado.
- **Retrocompatibilidade Garantida:** Aceita versões anteriores de backups `.json` sem perder nenhuma informação.

---

### 📊 8. Painel Anual & Termômetro do MEI
- **Fechamento Anual (Jan a Dez):** Visão consolidada de todos os 12 meses do ano com faturamento, despesas e lucro líquido mês a mês.
- **Termômetro do Limite MEI (R$ 81.000,00):** Acompanhamento dinâmico do teto anual de faturamento da Receita Federal com alertas visuais por cores (Verde, Laranja 80%+ e Vermelho ao exceder).
- **Média Mensal e Estatísticas:** Cálculo automático do faturamento médio mensal e contagem de atendimentos pagos no ano.

---

### 🎄 9. 13º Salário & Reserva de Férias do Autônomo
- **Modo Aporte Mensal ou Excedente:** Escolha entre guardar um valor fixo por mês ou abastecer o 13º somente quando o Capital de Giro da empresa estiver completo.
- **Acompanhamento de Metas:** Percentual acumulado, contagem regressiva de meses até Dezembro e identificador de superávit extra.

---

### 📦 10. Controle de Estoque & Materiais
- **Cadastro Ágil:** Apenas o nome do item é obrigatório; especificações (cor, medidas), estoque mínimo, preços de custo e venda são opcionais.
- **Alertas de Reposição:** Avisos visuais automáticos quando itens estiverem com estoque baixo.
- **Integração com Serviços:** Datalist inteligente que sugere produtos cadastrados e preenche preços na hora de orçar serviços.

---

### 🛡️ 11. Criptografia Militar de Backup (AES-256 GCM)
- **Privacidade Total:** Ao exportar, você pode proteger o `.json` com uma **senha pessoal** — a criptografia usa AES-256-GCM via Web Cryptography API (`crypto.subtle`).
- **Criptografia Opcional:** Deixando a senha em branco, o backup é exportado em texto puro (útil para conferir/editar no computador).
- **Importação Inteligente:** Na restauração, o app detecta sozinho se o arquivo é criptografado e pede a senha apenas nesse caso.
- **Retrocompatibilidade:** Aceita backups antigos (v1/v2/v3, com ou sem senha) sem perder informação.

---

### 🏢 12. Dados da Empresa, Chave Pix & Mão de Obra
- **Perfil Personalizável:** Nome da Empresa, Responsável, Telefone, Chave Pix e Cidade no Menu Lateral.
- **Cabeçalho & Rodapé do PDF:** Substitui o nome padrão do app pela sua marca em orçamentos e comprovantes.
- **Quadro de Pagamento Pix:** Exibição da chave Pix no comprovante quando configurada.
- **Discriminação de Mão de Obra:** Campo opcional no formulário de serviços para separar materiais de mão de obra de forma transparente no orçamento, no PDF e na mensagem do WhatsApp.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript puro (Vanilla JS)
- **Banco de Dados Local:** IndexedDB (`ControleNegocioDB` v4 - inclui a lixeira de 3 dias)
- **Criptografia:** Web Cryptography API (AES-256 GCM + PBKDF2)
- **Empacotamento Mobile:** Apache Cordova (Android)
- **Plugins Cordova Integrados:**
  - `cordova-plugin-calendar` (Sincronização com a Agenda nativa)
  - `cordova-plugin-local-notification` (Alarmes e lembretes locais)
  - `cordova-plugin-file` (Gravação de backups e arquivos)
  - `cordova-plugin-x-socialsharing` (Compartilhamento de backups e PDFs)
  - `cordova-plugin-android-permissions` (Gerenciamento de permissões)

---

## 📦 Estrutura do Projeto

```text
Controle-do-Negocio-PWA/
├── .github/workflows/deploy.yml  # Publica www/ no GitHub Pages (push em main)
├── config.xml              # Configurações do Cordova, ícone, permissões e plugins
├── docs/                   # Manuais (Manual do Usuário em .md e .pdf)
├── www/
│   ├── css/
│   │   ├── index.css       # Estilos base do Cordova
│   │   └── style.css       # Estilos da aplicação, modais, drawer, notas, clientes, estoque e temas
│   ├── js/
│   │   ├── annual.js       # Painel anual, fechamento mês a mês e termômetro do limite MEI
│   │   ├── app.js          # Inicialização da SPA, carregamento de dados e navegação por abas
│   │   ├── backup.js       # Exportação (com senha opcional), importação validada, snapshot e desfazimento
│   │   ├── calendar.js     # Integração com a agenda do Android via plugin
│   │   ├── crypto.js       # Motor de criptografia/descriptografia AES-256 GCM + hash de PIN
│   │   ├── database.js     # Camada de persistência IndexedDB (v4, com lixeira de 3 dias)
│   │   ├── decimo.js       # Gestão e cálculo do 13º salário (3 modos)
│   │   ├── forms.js        # Formulários de serviço/despesa e cálculo de medidas via datalist de estoque
│   │   ├── inventory.js    # Módulo de cadastro, saldo, busca e alerta de estoque de materiais
│   │   ├── modals.js       # Controle de modais, metas de caixa e menu lateral (Drawer)
│   │   ├── notes.js        # Bloco de notas, checklist e agendamento de alarmes locais
│   │   ├── notifications.js# Gerenciador de notificações (APK nativo e PWA web)
│   │   ├── pdf.js          # Gerador nativo de PDFs (orçamento/comprovante e extrato)
│   │   ├── privacy.js      # Bloqueio por PIN, recuperação e LGPD (anonimizar/exportar dados)
│   │   ├── render.js       # Renderização dinâmica de listas, cards, clientes e gráficos
│   │   ├── trash.js        # Lixeira de 3 dias (excluir/restaurar/expirar)
│   │   ├── utils.js        # Funções utilitárias (moeda, datas, máscara de valores, numVal)
│   │   └── whatsapp.js     # Integração para envio de orçamentos e mensagens no WhatsApp
│   ├── img/
│   │   ├── logo.png        # Identidade visual da aplicação
│   │   └── logo.svg        # Ícone da aplicação
│   ├── index.html          # Estrutura principal da aplicação SPA e modais
│   ├── manifest.json       # Manifesto PWA (standalone, tema, ícones)
│   └── sw.js               # Service Worker (offline + atualizações)
└── README.md
```

---

## 💻 Como Executar e Compilar

### Pré-requisitos
- **Node.js** (v18+)
- **Java JDK 17**
- **Android SDK (API 33+)**
- **Apache Cordova CLI** (`npm install -g cordova`)

### Passos de Build

1. **Restaurar plataformas e plugins:**
   ```bash
   cordova prepare android
   ```

2. **Compilar o APK de depuração (Debug):**
   ```bash
   cordova build android
   ```

3. **Localização do APK gerado:**
   ```text
   platforms/android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Executar diretamente em um dispositivo/emulador conectado via USB:**
   ```bash
   cordova run android
   ```

---

## 🌐 Acesso como PWA (navegador)

Além do **APK Android** (build Cordova), o aplicativo também roda direto no navegador como **PWA**, hospedado no **GitHub Pages**. No celular, abra o site no navegador e use a opção **"Instalar Aplicativo"** para adicionar o ícone à tela inicial e usar como um app nativo (com funcionamento offline).

## 🌿 Versionamento, Branches e Deploy

- **`main`**: Código de produção estável e testado.
- **Branches de desenvolvimento** (`security`, `features`, `bug-fixes`, etc.): novas funcionalidades e correções contínuas, integradas à `main` via Pull Request.
- **GitHub Pages:** o workflow `.github/workflows/deploy.yml` publica automaticamente a pasta `www/` a cada push na `main`, atualizando o PWA hospedado.

