# routine-app · estado atual

<!-- Fonte da verdade da tarefa em andamento. Atualize ao mudar de etapa; um agente continua daqui. -->

## Acesso público · concluído

- A página inicial oferece Entrar e Ver demonstração. Entrar abre /login. A demonstração inicia a sessão fictícia e abre /hoje.
- O botão da demonstração é compartilhado com a tela de login. Com uma sessão ativa, a página inicial oferece acesso à conta atual.
- Validação: 25 testes do frontend, build e lint sem avisos novos. Chrome em desktop e celular com API simulada conferiu login, abertura da demonstração, recuperação de erro e conta ativa.
- Etapa 6 implementada e validada em banco temporário. A migração do banco local continua pendente. Na raiz do projeto, use npm.cmd --prefix routine-back run db:deploy. Arquivos de credenciais ficam fora do escopo.

## Etapa 6 · Metas e relatórios

- Relatórios no menu, com Hoje, 7 dias, 1 mês e datas livres. Apuração de cumprimento e nota, água, treinos, categorias, sequências e mapa de atrasos. Dias futuros ficam como planejamento.
- Metas pessoais configuráveis por assunto, unidade e período. A revisão agrupa itens pendentes por dia e permite Feito, Não feito ou Não houve em lote.
- Migração 20261125060000_reports_and_goals validada em banco descartável, inclusive sobre regra e item remarcado já existentes. Banco do usuário pendente de migração.
- Testes finais: backend 125 passaram e 1 pulado; frontend 25 passaram; Prisma válido, build OK e lint com avisos preexistentes. Chrome com a demonstração em desktop e celular validou filtros, mapa, metas e revisão. Arquivos de credenciais não foram usados.
- Próximo passo: usuário testar Relatórios na demonstração após aplicar a migração local. Etapa 7 é o Bot do Telegram, após aprovação.

## Estudo visual da tela Hoje

- Foi entregue o HTML independente `docs/hoje-estudo-visual.html`, com a captura e os dados fictícios da demonstração. Compara cartões atuais, lista com divisórias, tabela e agenda. As referências visuais ficam no HTML.
- Chrome validou as quatro opções, a comparação, a marcação e a expansão em desktop e celular. O estudo é separado da interface instalada.
- O usuário decidiu deixar a escolha visual para depois e autorizou a etapa 6.

## Validação da revisão de Dia e Semana

- Semana e Dia: o editor do bloco mostra os afazeres do próprio bloco e permite vincular listas existentes ou criar uma lista nomeada. A Semana abre a edição de afazeres em “Daqui pra frente”.
- Dia: as rotinas sem horário aparecem antes da linha do tempo. Listas vinculadas têm controle para abrir e fechar.
- API: a Semana usa a mesma montagem de listas por dia. O teste de integração agora compara o retorno de Dia e Semana.
- Validação: backend 121 passaram e 1 cenário antigo pulado em PostgreSQL temporário; frontend 24 passaram; build ok; lint com avisos preexistentes. Chrome com demonstração validou criação de lista, vínculo e desvínculo, afazer recorrente vindo da Semana, seção sem horário acima da linha do tempo e recolhimento no Dia. O ambiente temporário dispensou arquivos de credenciais.
- Revisão apresentada e aceita pelo usuário.

## Objetivo atual
Ordem pedida pelo usuário (2026-11-25): 1 commit ✅ (branch rotina-etapas-3-a-7, 3 commits) → 5 dias especiais ✅ (falta só a limpeza opcional do presencial/home) → 2 usuário testa → 3 bot 7B–D → 4 publicar (etapa 8). Refeições saiu do plano.

Dias especiais (claude): special_days (HOLIDAY/VACATION/SICK, de–até, nome), SpecialDayService (map por data; marcar apaga itens intocados de fixos com skipOnHolidays; desmarcar refaz ao abrir), materialize pula fixos skipOnHolidays, Dia/Semana mostram `special`, relatório `special: { days, missed }` (ponto de atenção); front: barra no Dia (Hoje é Feriado/Doente, Desmarcar), Configurações → Dias especiais, "Pula em dias especiais" no Fixo, etiqueta na Semana, painel de atenção nos Relatórios. Back 131 + 1, front 28.

Ponto de atenção agora cobre sábado/domingo também (`special: { weekends, days, missed[{name, planned, count}] }`, só fixos, SKIPPED não conta). Presencial/home: usuário já tirou da tela; limpeza do banco descartada.

Imprevistos (claude): day_items.is_unplanned + displaced_by_id (migração 20261125150000_unplanned). POST /days/:date/items com `unplanned: true` (exige início e fim; nasce DONE; fora do progresso e da nota) e `displaceIds` (itens do dia que ele tirou: continuam contando na nota). Dia/Semana: `displacedBy {id,name}`; excluir o imprevisto desliga. Relatório `unplanned: { count, minutes, missed, list[{..., taken}] }`. Front: botão Imprevisto (3º em Adicionar), UnplannedDialog (marca sozinho o que cruza o horário, dá pra desmarcar), linha com raio e "tirado por X", painel Imprevistos nos Relatórios. Sem tipos (usuário pediu só nome; ícone/categoria pelo nome ou escolhidos). Bot: "freelance sábado 14h às 21h" entra no 7B. Teste: __tests__/integration/unplanned.test.js. Back 132 + 1.
ATENÇÃO testes no Windows: rodar o Vitest com o caminho "C:\..." (maiúsculo); com "c:\" ele carrega duas cópias e todos falham com "failed to find the runner".

## Status
- S1 back ✅ (claude): tabela simulations (blocks JSON), SimulationService (create from current|empty|id, update com validação, remove, apply: tira fixos daqui pra frente e cria os blocos, listas por insideKeys), rotas /api/v1/simulations, /simulations/current, /:id, /:id/apply; testes em __tests__/integration/simulations.test.js. Back 130 + 1 pulado.
- S2 front ✅ (claude, não visto no navegador): aba "Simular" em TodayPage; lista/cria simulações (nome + origem); grade igual à WeekView com blocos expandidos por dia; clicar em horário vazio cria bloco; clicar no bloco edita (todos os dias dele), duplica, tira só deste dia, apaga; arrastar move hora (passo de 15 min) e dia (se o bloco tem vários dias, separa o dia arrastado); salva com PATCH (blocks inteiros), com debounce.
- S3 ✅ (claude): painel comparando horas/semana por categoria (atual = GET /simulations/current) e aviso de sobreposição; botão "Usar esta rotina a partir de…".
- Etapa 7: 7A feita (bot liga a conta, água, resumo, ajuda); 7B–7D pausadas.

## Próximos passos (etapa 7)
- 7B: "anotar fazer X [sábado de manhã|amanhã]" (sem data → Quando der), "fiz <item>" / marcar feito; rascunho com botões Salvar/Cancelar (telegram_drafts como no Finance).
- 7C: IA de reserva (copiar ../finance-app/finance-back/src/services/telegram/ai.js; Gemini ou Claude por chave no .env), limite por hora.
- 7D: resumo da manhã no horário do Acordar + cobranças ("ontem ficaram N sem marcar"); endpoint de cron protegido (CRON_SECRET) chamado a cada 15 min (Vercel cron) e um tick no telegram:poll no PC; guardar o último envio por usuário.
- Usuário precisa criar o bot no @BotFather e pôr TELEGRAM_BOT_TOKEN/USERNAME no .env (não ler o .env).

## Feito nesta rodada (resumo para quem continuar)
- Hoje: botões **Fixo** (abre RuleDialog) e **Avulso** (data/período/hora opcionais; sem data → "Quando der"; "É um compromisso"; "Onde fica: dentro de <bloco>" vira afazer só do dia).
- Presencial/home fora das telas (back inerte: day_modes, office_days, rule.mode — limpar numa migração se o usuário quiser).
- Todo fixo é bloco (RULE_KINDS=[ROUTINE]); sem treino/tipos de treino na UI.
- Ícone por item (routine_rules.icon, day_items.icon; null = sugerido pelo nome em lib/icons.js).
- Afazeres com hora opcional (day_item_steps.minute); "Afazeres…" no menu do item (PUT /day-items/:id/steps; daqui pra frente = PUT + PATCH /rules).
- Listas: regra com afazeres + routine_rules.inside_rule_ids; GET /days devolve `lists` dentro de cada bloco (mesmos passos do item da lista). Na seção "Para hoje" a lista fica fechada ("Ver afazeres").
- Dia: Atrasadas → Para hoje, sem horário → Linha do tempo (hora grande à esquerda) → Quando der; títulos maiores; linha da Água.
- Semana: fontes maiores; clicar no cartão abre Editar; "Daqui pra frente" tem "Em quais dias" → POST /rules/:id/split divide o fixo (ex.: Acordar seg/qua/sex 6:45–7:45, ter/qui 7–8).
- Água (etapa 4): water_logs, user_settings.water_goal_ml, /water*, tela /agua, item Água no menu.
- Conta do dono criada (cauasantana9524@gmail.com, ADMIN) com a rotina atual via scripts/my-routine.js. Primeiro cadastro sem admin vira ADMIN aprovado. MAIL_PROVIDER=console (e-mail só no terminal; usuário pediu para não mexer no .env agora).

## Pendências
- Usuário quer ajustar o Acordar pela Semana (agora possível com "Em quais dias").
- Rotina de dormir sem afazeres (o usuário vai preencher).
- Testes com data fixa dependem de "hoje" (2 corrigidos; outros podem quebrar com o tempo).

## Plano da etapa 3
- **3A · Backend** ✅ (claude): migrações 20261124174135_day_and_week e 20261124180000_office_days_over_time; utils (períodos, modo do dia, dias presenciais com data, afazeres, sequência, semana) + testes; DayService (materialização por modo, afazeres com trava de linha, semana, A fazer, setMode/redo), RoutineSettingsService, rotas novas; testes em __tests__/integration/day-week.test.js. 117 testes passando.
- **3B · Front Dia** ✅ (claude): abas Dia | Semana em /hoje (?aba=semana), afazeres no cartão do bloco com sequência, "A fazer", período, presencial/home, treino ao marcar feito, "feito em outro horário".
- **3C · Front Semana** ✅ (claude): grade horas × dias (6h–24h), cartões proporcionais, lado a lado quando batem (lib/agenda.js + teste), faixa Manhã/Tarde/Noite.
- **3D · Configurações** ✅ (claude): RuleDialog com horário/período/sem horário, afazeres, "vale em" (todo dia / só presencial / só home), treino planejado; dias presenciais e tipos de treino.
- **3E · Fechamento** ✅ (claude): ARCHITECTURE/README atualizados; back 117 e front 23 testes, lint sem avisos novos, build ok; conferido pela API real com a demo (sem ferramenta de navegador nesta sessão: as telas NÃO foram vistas no Chrome; o usuário vai testar).
- Pendências: pedir ao usuário a planilha atual (o script routine:mine ainda usa a antiga, com as rotinas diária e de dormir novas). Contas que rodaram o script antigo têm "Ler 2 páginas"/"Revisar flashcards" como tarefas fixas soltas: trocar pela Rotina diária com afazeres.


## Plano da etapa 2 (marque [x] ao terminar e escreva quem está em qual bloco)
Ordem importa: 2B e 2C dependem da API do 2A. Não edite os arquivos de um bloco que o outro agente marcou como "em andamento".

- **2A · Backend** ✅ (claude) — API documentada em docs/ARCHITECTURE.md → "API (etapa 2)"
  - [x] schema + migração 20261123165434_routine_day (categories, routine_rules, day_items, checks no banco)
  - [x] utils/routineUtils.js + __tests__/unit/routine.test.js (occursOn, minutesError, splitTimeline, dayProgress, shiftMinutes)
  - [x] CategoryService, RuleService (daqui pra frente), DayService (materialize, get, avulsos, status, só hoje, atrasar)
  - [x] RoutineController + routes/routine.js + forms/routine; LGPD exporta as tabelas novas
  - [x] __tests__/integration/routine.test.js (11 testes)
- **2B · Tela Hoje** ✅ (claude) — features/today/TodayPage.jsx, DayItemRow.jsx, ItemDialogs.jsx; lib/minutes.js (+ teste)
  - [x] linha do tempo com linha "agora", check grande, progresso no topo, ‹ › entre dias (?dia=AAAA-MM-DD)
  - [x] "Atrasadas", "A qualquer hora", Tarefa avulsa / Compromisso avulso
  - [x] menu: não houve, voltar, atrasar 15/30/60, remarcar, editar só neste dia / daqui pra frente, excluir avulso
  - [x] conferido no Chrome em 390px e 1366×768, nos temas claro e escuro. Data do Hoje ajustada para caber no celular.
  - [x] nomes claros (pedido do usuário): cada item mostra "Tarefa fixa/avulsa", "Compromisso fixo/avulso", "Bloco da rotina", "Treino" (lib/kinds.js); botões "Tarefa avulsa" e "Compromisso avulso" com explicação (sem "+" no nome: pedido do usuário, vale para todos os botões)
  - [x] categoria padrão nova "Rotina diária" (tom --cat-daily) com "Ler 2 páginas de um livro" e "Revisar flashcards no aplicativo" (tarefas fixas, todo dia, sem horário) no script e na demo
  - [x] só tarefa AVULSA fica atrasada; tarefa fixa não feita não acumula
  - O estado vazio e a ajuda do Hoje levam para /configuracoes/rotina.
- **2C · Configurações** ✅ (codex, transferência solicitada pelo usuário em 2026-11-23) — arquivos: routine-front/src/features/settings/ (novas telas RoutineSettings, CategoriesSettings), App.jsx (rotas de configurações), SettingsLayout (abas). Ícones: routine-front/src/lib/icons.js (os das categorias padrão: briefcase, bus, book-open, graduation-cap, dumbbell, utensils, sparkles)
  - [x] Rotina fixa ligada como entrada das Configurações. Chrome com a demonstração validou criação, edição a partir de hoje e retirada, mantendo a versão do dia anterior na API real.
  - [x] `lib/weekdays.js` + `weekdays.test.js` ("seg a sex", "todo dia", "seg, qua e sex")
  - [x] Categorias: oito tons `--cat-*`, ícones de rotina, edição, arquivo/reativação e exclusão com alternativa de arquivar no conflito 409. Fluxos validados no Chrome móvel com a API real.
  - [x] **Pedido do usuário: explicações como no Finance** — tela limpa, textos de explicação escondidos atrás de um botão com ícone de interrogação (usar `components/ui/Help.jsx`: `HelpButton` + `HelpPanel`, mesmo esquema do finance-app). Aplicar no Hoje (os textos dos botões Tarefa avulsa/Compromisso avulso e o aviso da rotina fixa), na Rotina fixa (descrição do cabeçalho, textos de cada tipo no RuleDialog, dicas dos campos) e em Categorias.
  - Regra do usuário: nenhum botão com "+" no nome.
- **2D · Dados** ✅ (claude)
  - [x] script `npm run routine:mine -- <email> [--from=AAAA-MM-DD]` (scripts/my-routine.js; recusa se já houver itens fixos)
  - [x] demonstração: rotina da Marina, 3 semanas de histórico, tarefa atrasada, tarefa e compromisso hoje
- **2E · Fechamento** ✅ (codex)
  - [x] README e ARCHITECTURE.md atualizados. Testes back/front, lint, build e revisão Chrome dos dois temas com 12 capturas em 390px e 1366×768.
  - [ ] Aguarda aprovação do usuário após a demonstração antes de começar hábitos e água.

## Plano revisto em 2026-11-24 (aprovado pelo usuário)
Detalhes em PROMPT.md → "Revisão de 2026-11-24" e "Etapas". Nova ordem: 3 Dia + Semana (agenda horas × dias, rotinas com afazeres, tarefas sem data/com data/com período, modo presencial/home, treino variável, "fiz em outro horário"); 4 Água (tela própria, só número); 5 Aulas + dias especiais; 6 Metas pessoais + relatórios (procrastinação) + revisar dias pendentes; 7 Bot do Telegram (base do Finance); 8 Qualidade/publicação; 9 Refeições.
- Recusado: link da chamada no cartão da aula. Futuro: sono / Mi Band 8.
- Próximo: modelo de dados da etapa 3 no ARCHITECTURE.md, mostrar ao usuário, e só então codar.

## Problemas conhecidos / pendências
- Bancos locais `routine`/`routine_test` foram criados com o usuário `finance` do PostgreSQL (falta um usuário `routine`).
- Deploy na Vercel + Neon ainda não feito.
- Mudança não commitada em `routine-front/src/pages/landing/snap-cursor.jsx` (da sessão anterior; não mexer sem combinar).
- Windows: rode os testes de um caminho com "C:" maiúsculo (com "c:" o vitest falha em todos os arquivos).

## Testes
- Backend: 98 testes passando, Prisma validado. Frontend: 17 testes passando, build ok e lint com cinco avisos preexistentes. Testes pelo registrador no caminho Windows com C: maiúsculo.
- Na demonstração com API real: criação, edição daqui pra frente e remoção da regra; categorias, conflito 409 e arquivo; abertura dos botões de ajuda.

## Combinado com o usuário
- Ao terminar cada passo: avisar que está pronto, listar o que ele precisa fazer e o passo a passo para testar, e ESPERAR o ok antes de seguir.
