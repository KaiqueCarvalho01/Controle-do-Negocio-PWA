# 📊 Controle do Negócio — Manual do Usuário

Aplicativo feito para **autônomos, MEIs e prestadores de serviços** cuidarem de todo o dia a dia do negócio: fluxo de caixa, orçamentos, serviços, clientes, estoque, notas e metas financeiras.

> 🔒 **Importante:** todos os seus dados ficam **somente no seu aparelho**. Não existe nuvem nem servidor — ninguém, nem nós, consegue acessar suas informações. Por isso, **faça backup com frequência** (seção "Backup e Restauração").

---

## 1. Como instalar o aplicativo

### 📱 No celular (Android ou iPhone) — instalação rápida
O aplicativo funciona como **PWA** (Progressive Web App): você instala pelo navegador e ele vira um app normal na tela inicial, com ícone próprio.

1. Abra o endereço do aplicativo no navegador do celular (Chrome no Android, Safari no iPhone).
2. Toque nas opções do navegador (⋮ ou ⬆️/Compartilhar).
3. Escolha **"Instalar aplicativo"** (ou **"Adicionar à Tela Inicial"** no iPhone).
4. Pronto! O ícone aparecerá na tela inicial como um app comum.

Dentro do aplicativo, a opção **"⬇️ Instalar Aplicativo"** também aparece no menu lateral (☰) quando a instalação está disponível.

### 🖥️ No computador
Abra o mesmo endereço no navegador (Chrome/Edge). Você também pode instalar pelo ícone do navegador para abrir em **janela própria**, como um programa.

### ⚠️ Sobre as notificações
- Na **primeira abertura**, o aplicativo pergunta se pode enviar notificações. **Permita** para receber lembretes de serviços agendados, notas com alarme e o lembrete de backup.
- **No APK Android**, os alarmes funcionam até com o aplicativo fechado.
- **No navegador/PWA**, as notificações funcionam enquanto a página estiver aberta (o navegador não consegue despertar o celular em segundo plano).

---

## 2. Conhecendo a tela

- **Menu lateral (☰):** abre as opções principais — Clientes, Estoque, Extrair/Lixeira, Metas, Painel Anual, 13º Salário, Perfil da Empresa, Backup, Segurança, e mais.
- **Botão 👁️ (topo):** liga/desliga o **Modo Privacidade**, que esconde todos os valores da tela (`R$ *****`) — útil para usar perto de clientes.
- **Filtro de mês:** um seletor no topo define qual mês você está visualizando. Mude para ver os dados de outros meses.
- **Abas principais:**
  - **📝 Serviços** — serviços agendados e realizados, com sub-filtro *Pendentes* / *Concluídos*.
  - **📄 Orçamentos** — propostas ainda não confirmadas.
  - **💸 Despesas** — todos os seus gastos.
  - **📊 Extrato** — visão completa do mês, com gráficos e metas.
- **Botão "＋"** no rodapé: cria um novo serviço (ou orçamento), conforme a aba ativa.

---

## 3. Serviços e Orçamentos

### ➕ Criando um serviço
1. Toque no botão **"＋"**.
2. Preencha o formulário. **Apenas o nome do cliente é obrigatório** — todo o resto é opcional.
3. Campos úteis:
   - **Telefone:** ao digitar o nome de um cliente já cadastrado, o telefone é preenchido automaticamente.
   - **Descrição / Detalhes:** cor, material, características do serviço.
   - **Endereço / Observações:** vira o *local* na agenda do celular e um link direto para o Google Maps no card do serviço, se preenchido.
   - **Data e horário:** data do serviço e, se agendar, o horário (usado no alarme e na agenda).
   - **Itens do serviço:** nome do produto/serviço, dimensões (largura × altura), unidade (m, cm, mm), quantidade, preço unitário. O subtotal pode ser **calculado automaticamente** pelas medidas ou **digitado manualmente**.
   - **Mão de obra:** valor separado do material, se quiser deixar o orçamento transparente.
4. Toque em **Salvar**.

### 🔁 Ciclo de status
Cada serviço segue uma sequência de fases, marcada por um **botão de próximo passo** no card:

`📄 Orçamento ➔ 📅 Agendado ➔ ✅ Realizado ➔ 💰 Pago`

- Ao tocar no botão do status, um aviso confirma a transição e registra a data daquela fase automaticamente.
- Quando marcar como **Pago**, o aplicativo pede a **forma de pagamento**: Pix, Dinheiro, Cartão ou Transferência.
- **Dica:** se você se lembrar da data depois, dá para editar o serviço e ajustar o histórico de datas sem apagar as anteriores.

### 🧾 Ações em cada serviço
Abaixo de cada card de serviço ficam os botões rápidos:

- **📅 Agenda** — cria um evento na agenda do celular com cliente, endereço, detalhes e horário (1 toque no Android).
- **💬 WhatsApp** — manda a mensagem do serviço/orçamento para o cliente, com itens, medidas, mão de obra e, **se ainda não pago**, a opção de pagamento Pix.
- **🖨️ PDF** — gera a **PROPOSTA DE ORÇAMENTO** ou o **COMPROVANTE DE SERVIÇO** com o cabeçalho da sua empresa, tabela de itens e quadro do Pix.
- **✏️ Editar** e **🗑️ Excluir** — editar mantém o histórico de datas; excluir envia para a **Lixeira** (fica recuperável por 3 dias).

> 💡 *Sobre o WhatsApp:* o aplicativo monta a mensagem pronta com o nome da sua empresa (configurado no Perfil). Se o telefone do cliente tiver um número de 9 dígitos formatado como fixo, o aplicativo corrige a formação automaticamente antes de abrir o WhatsApp.

---

## 4. Clientes 📇

Acesse pelo **menu lateral → Clientes**.

- Mostra cada cliente com **faturamento total** e **saldo pendente**.
- **Ordenação:** 💰 Mais gastaram · 🔤 Alfabético · 🆕 Mais recentes · ⏳ Mais antigos.
- **Ações por cliente:**
  - 💬 abrir conversa no WhatsApp com 1 toque;
  - ➕ criar um novo serviço já com nome e telefone preenchidos;
  - 📜 expandir o histórico completo de serviços e pagamentos;
  - 🛡️ opções **LGPD**: **"Exportar Dados"** (gera o arquivo com os dados daquele cliente, para você entregar se ele pedir) e **"Anonimizar"** (transforma o cliente em "Cliente Anonimizado" e apaga o telefone, mantendo os valores nas suas contas).
- **Busca:** digite o nome para localizar rapidamente.

---

## 5. Bloco de Notas e Lembretes com Alarme 📝

Acesse pelo menu lateral ou pelo ícone de notas.

- Crie **anotações e checklist de tarefas** com caixas de marcação (o texto fica riscado ao concluir).
- Defina **data e horário** para receber um alarme/notificação no momento programado.
  - **No APK Android:** alarme exato, mesmo com o app fechado.
  - **No navegador:** a notificação aparece enquanto a página estiver aberta.
- As notas fica salvas junto com o backup `.json` e são restauradas ao importar.

---

## 6. Despesas 💸

Acesse pela aba **Despesas** ou pelo botão "＋" nessa aba.

- Registre gastos com **categoria** (Material, Combustível, Ferramentas, Publicidade, Alimentação, Outros...), valor e data.
- Edite ou exclua depois, se precisar (excluir também vai para a Lixeira).
- Todos os gastos do mês aparecem somados no **Extrato**.

---

## 7. Estoque e Materiais 📦

Acesse pelo **menu lateral → Estoque**.

- **Cadastro rápido:** só o **nome** é obrigatório. Especificações (cor, medidas), estoque mínimo, preço de custo e de venda são opcionais.
- Aviso visual automático quando um item fica **abaixo do estoque mínimo**.
- **Integração com serviços:** ao orçar, o aplicativo sugere os itens cadastrados e preenche o preço automático. Quando um serviço é marcado como **Realizado ou Pago**, o consumo sai do estoque automaticamente (e é devolvido se você voltar o serviço ou excluí-lo).
- Use **ajustar quantidade** para entradas e saídas manuais.

---

## 8. Extrato e Metas Financeiras 📊

Acesse pela aba **Extrato** para a visão completa do mês:

- **Resumo:** Recebido (serviços pagos), Pendente, Gastos e Lucro do mês.
- **Movimentações:** todas as entradas e saídas na ordem, com busca por cliente ou descrição.
- **Gráficos:** barra de proporção Entradas × Saídas e ranking de gastos por categoria.
- **PDF do extrato:** botão para gerar o extrato do mês em PDF — ótimo para prestar contas ou arquivar.

### 🎯 Metas de Caixa (menu lateral → Metas de Caixa)
Configure duas "caixas" separadas do dinheiro do negócio:

- **Fundo de Caixa (por mês):** o valor que você tira para você (**pró-labore/salário**) naquele mês.
- **Capital de Giro (acumulado):** reserva do negócio que vai sobrando mês a mês. Defina uma **meta** (`targetCapitalGiro`); cada mês, o que sobrar depois de tirar o seu fundo de caixa entra na reserva.
  - Se o mês der prejuízo, ele "corrói" a reserva.
  - Só entram no cálculo serviços **Pagos** (não conta o que ainda não entrou).
- O Extrato mostra a evolução da reserva, o percentual da meta atingido e avisa quando há **lucro livre excedente** (reserva acima da meta).

---

## 9. Painel Anual e Termômetro do MEI 📊

Acesse pelo **menu lateral → Painel Anual**.

- Fechamento **mês a mês (Janeiro a Dezembro)** do ano selecionado: faturamento, despesas e lucro.
- Média mensal de faturamento e quantidade de atendimentos pagos.
- **Termômetro do limite MEI (R$ 81.000,00):** acompanha seu faturamento no ano em relação ao teto da Receita Federal.
  - 🟢 Verde até 80%;
  - 🟠 Laranja dos 80% até o teto (aviso "atenção");
  - 🔴 Vermelho se ultrapassar o limite (⚠️).

---

## 10. 13º Salário e Reserva de Fim de Ano 🎄

Acesse pelo **menu lateral → 13º Salário**. Configure sua meta e escolha **um** dos modos:

- **💼 Aporte Mensal:** você guarda um valor fixo por mês (calculado de forma proporcional aos meses que já passaram).
- **💵 Excedente de Giro:** guarda **só o que sobrar** depois que o Capital de Giro estiver completo na meta.
- **📝 Gasto Manual:** quando você lançar manualmente uma despesa com categoria **"13º Salário / Férias"**, ela já conta automaticamente para a meta.

O painel mostra o percentual acumulado, a contagem regressiva de meses até dezembro e o **superávit extra**. Acompanhe o progresso ao longo do ano para chegar em dezembro com o seu 13º garantido.

---

## 11. Perfil da Empresa 🏢

Acesse pelo **menu lateral → Perfil da Empresa**.

Configure **nome da empresa, responsável, telefone, chave Pix e cidade**. Essas informações:

- aparecem no **cabeçalho/rodapé dos PDFs** (orçamento, comprovante e extrato) no lugar do nome padrão;
- exibem a **chave Pix no comprovante** quando o cliente for pagar;
- assinam as **mensagens do WhatsApp**.

---

## 12. Privacidade e Segurança 🔐

### 👁️ Modo Privacidade
O botão no topo da tela **oculta todos os valores** (`R$ *****`). Perfeito para usar o aplicativo perto de clientes ou funcionários sem esconder o resto do conteúdo.

### 🔑 Bloqueio por PIN (menu lateral → Segurança)
- Ative o **PIN de 4 dígitos**: ao abrir o aplicativo, aparecerá uma tela de bloqueio com teclado numérico.
- Defina também uma **pergunta de recuperação secreta** — se você esquecer o PIN, responder essa pergunta permite redefini-lo (o aplicativo redefine o PIN todo na tela de bloqueio).
- Para desativar, basta desligar a opção na tela de Segurança.

### 🛡️ LGPD
Você, como *controlador* dos dados de seus clientes, tem as ferramentas no painel de Clientes: **exportar os dados de um titular** (portabilidade) e **anonimizar um cliente** (exclusão lógica mantendo os valores para suas finanças). Para apagar tudo do aplicativo, use **"Limpar todos os dados"** no menu lateral (exige digitar *APAGAR TUDO* para confirmar).

---

## 13. Lixeira (3 dias) 🗑️

Quando você **exclui** um serviço, despesa, nota ou item de estoque, ele vai para a **Lixeira** e fica lá por **3 dias** antes de ser apagado de vez.

- Acesse **menu lateral → Lixeira** para ver os itens.
- **Restaurar** devolve o item exatamente como estava (com estoque rebalanceado se necessário).
- **Excluir definitivamente** remove o item sem chance de voltar.
- Logo após excluir, um **aviso com "Desfazer"** aparece na tela por alguns segundos — a forma mais rápida de se recuperar de um engano.

---

## 14. Backup e Restauração 🛡️ (LEIA)

Seus dados são **só seus e só do seu aparelho**. Um backup externo é a **única proteção** contra perda (celular roubado, quebrado, desinstalar o app, limpar dados do navegador).

### ✈️ Exportar (salvar) — menu lateral → Exportar Backup
1. Toque em **"Exportar Backup"**.
2. Opcional: defina uma **senha** para proteger o arquivo. Sem senha, o arquivo fica em texto puro (pode abrir no computador para conferir).
3. Escolha para onde enviar: **WhatsApp (salvar em "Mensagens arquivadas" com você mesmo), Drive, e-mail** ou baixar para o aparelho.
4. O aplicativo **testa a integridade** do arquivo antes de compartilhar — se algo estiver errado, ele avisa e não envia.

> 🔒 **Sobre a senha do backup:** ela é usada para criptografar com o padrão AES-256. **Não há como recuperar a senha** — se você esquecer, o backup não abre (nem nós conseguimos). Guarde a senha em lugar seguro e use a mesma nos backups seguintes.

### 📥 Importar (restaurar) — menu lateral → Importar Backup
1. Escolha o arquivo `.json` do backup (baixado do WhatsApp, Drive, e-mail...).
2. Se o arquivo tiver senha, o aplicativo pede a senha automaticamente — não precisa dizer nada, ele detecta sozinho se é criptografado.
3. **Antes de importar**, o aplicativo tira um **snapshot (retrato) automático** do estado atual — se algo der errado, dá para voltar.

### ↩️ Desfazer Importação
Se um arquivo errado for importado, o menu lateral tem a opção **"↩️ Desfazer Importação"**: reverte 100% dos dados para o estado anterior (válido uma vez, logo após a importação).

### ⏰ Lembretes automáticos
- **Backup silencioso diário:** o aplicativo guarda uma cópia interna do banco a cada 24 h **no seu aparelho** (não substitui o export manual).
- **Lembrete de backup:** depois de **3 dias** sem exportar, aparece um aviso na tela (e uma notificação diária às 12:00) lembrando de fazer backup externo.

### 🔁 Compatibilidade com backups antigos
Versões novas leem **backups de versões antigas** (com ou sem senha) sem perder nenhuma informação. E o contrário também é seguro: a importação valida os dados e corrige automaticamente valores que vieram em formato estranho.

---

## 15. Atualizações do aplicativo 🔄

Quando uma nova versão é publicada, o aplicativo mostra a mensagem **"🔄 Nova versão disponível — toque para atualizar"**. Basta tocar; ele atualiza sem apagar seus dados.

> Se abrir a nova versão e a tela ficar em branco, **feche as outras abas/janelas do aplicativo** que ainda estão abertas (em outro dispositivo ou do celular antigo) e recarregue — o aplicativo tenta sozinho e depois abre. Nada é perdido.

---

## 16. Solução de Problemas (FAQ) ❓

**"Depois de atualizar, meus dados sumiram!"**
Relaxa: eles continuam no aparelho. Fecha outras abas do app que ficaram abertas (no celular e em outros dispositivos) e recarregue. O aplicativo, se necessário, mostra um aviso sobre a atualização do banco e tenta novamente sozinho.

**"A importação deu erro / backup não abriu."**
As versões novas mostram o **erro real** e não mais um aviso genérico. As causas mais comuns:
- **Senha errada** → mensagem "Senha incorreta ou arquivo de backup corrompido." (verifique a senha que usou ao exportar).
- **Arquivo baixado errado** → às vezes o WhatsApp/drive salva a *página* em vez do arquivo (o arquivo mesmo tem final `.json`). Baixe de novo e importe o arquivo correto.
- **Backup de muito tempo atrás em formato antigo** → as versões novas ainda aceitam, mas se o arquivo veio pela metade (download cortado), baixe novamente.

**"Notificação não toca."**
No **navegador/PWA**, notificações só tocam com a página aberta (limitação do próprio navegador). No **APK Android**, tocam até com o app fechado e são re-agendadas ao ligar o celular. Confirme também que as notificações do aplicativo estão permitidas nas configurações do aparelho.

**"Somei na calculadora e o total do extrato não bate."**
Pode ser um valor de um registro antigo criado por versões antigas do app em formato de texto. O aplicativo **corrige automaticamente** esses valores ao carregar. Se ainda estiver errado, edite o serviço/despesa e confira o valor.

**"O cliente reclamou que recebeu número errado no WhatsApp."**
O aplicativo normaliza o número automaticamente (9º dígito etc.). Se o telefone cadastrado tiver DDD errado, edite o serviço e corrija o campo Telefone.

**"Fiz backup sem senha. O arquivo é seguro?"**
Sim: o app não envia dados a ninguém; o arquivo contém seus dados de forma legível, por isso **guarde bem** onde salvou. A senha é para proteção em **trânsito/cópia** (ex.: enviar pelo WhatsApp).

---

## 17. Resumo rápido (gostou de ler rápido 😉

1. Instale (PWA) → permita notificações.
2. Cadastre seu **Perfil da Empresa** (nome, Pix).
3. Crie **Serviços** e avance o status: Orçamento → Agendado → Realizado → Pago.
4. Veja o **Extrato** todo mês; configure **Metas de Caixa** e acompanhe o **Painel Anual/MEI**.
5. **Exporte backup** regularmente (a cada atualização de mês é uma boa hora) — sem senha ou com a senha que você escolher.
6. Ative o **Modo Privacidade** (👁️) e o **PIN** se quiser discrição.
7. Deixe a **Lixeira** trabalhar: exclusões acidentais têm 3 dias de recuperação.

---

*Controle do Negócio — seus dados, seu controle.* 💪