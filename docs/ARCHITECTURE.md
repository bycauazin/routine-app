# Routine — Arquitetura e regras de negócio

Documento vivo. Registra as decisões que valem para todas as etapas. O escopo completo do produto e as etapas
estão em [`../PROMPT.md`](../PROMPT.md).

## Visão geral

```
routine-app/
├── routine-back/    API REST — Node.js 24, Express 5, Prisma 7, PostgreSQL
├── routine-front/   Interface — React 19, Vite, React Router, Tailwind CSS 4
├── api/             o mesmo Express como função da Vercel (/api/*)
└── docs/            este documento
```

- Nasceu da fundação do Finance (`../finance-app`): mesma estrutura, mesma segurança, mesmas convenções. Tudo o que
  era de dinheiro foi retirado; o domínio da rotina entra a partir da etapa 2.
- Tudo em **JavaScript** (ES Modules). Tipos documentados com JSDoc onde ajudam.
- **Toda regra e todo cálculo ficam no backend** (`utils/` puros e testados). O front formata e envia.
- Em desenvolvimento, o Vite (porta **5174**) encaminha `/api` para o Express (porta **3334**). As portas são
  diferentes das do Finance (5173/3333) para os dois rodarem juntos. Para o navegador, front e API têm a
  **mesma origem**, e o cookie de sessão funciona sem CORS.
- Em produção: um projeto próprio na Vercel (site estático + `/api` como função) e um banco próprio no Neon,
  com outro `AUTH_SECRET`.

## Backend (`routine-back`)

Estrutura em camadas no padrão do Desk-API (cada pasta tem um README com o seu contrato):

```
server.js             entrypoint
src/
  app.js              monta o Express (sem listen — usado pelos testes)
  config/             env validado (Zod) e opções do cookie de sessão
  routes/             URL → requireAuth → Form.validate → Controller
  forms/              validação (req.validated); falha → 422 com mensagem por campo
  controllers/        handlers finos: { meta: { success: true }, data }
  services/           regras de negócio, transações, logger
  daos/               todo acesso ao banco, sempre filtrado por userId
  database/           Prisma Client e withTransaction
  middlewares/        sessão, CSRF, no-store, limite de requisições, erros
  utils/              puros: datas (e as regras da rotina, 100% testadas)
  shared/             erros de domínio e constantes
prisma/               schema e migrations
__tests__/            unit + integration
```

Resposta da API: `{ meta: { success: true, ...meta }, data }` em sucesso e `{ meta: { success: false }, code, message, fields? }` em erro.

## A rotina (centro do app) — a partir da etapa 2

Decisões já tomadas (detalhes no `PROMPT.md`):

- **Regras fixas** repetem em dias da semana escolhidos, com horário, de uma data inicial até uma final opcional.
- **Ocorrências do dia** (`day_items`) são criadas a partir das regras **na primeira vez que o dia é aberto**, de
  forma idempotente (chave única regra + data). Não depende de cron. Abrir a semana materializa os 7 dias.
- **"Só hoje"** muda a ocorrência (`is_overridden`); **"daqui pra frente"** fecha a regra no dia anterior e cria
  uma nova, então os dias passados nunca mudam. **"Não houve"** = `SKIPPED`, não recriada e não conta como falha.
- Status: `PENDING` → `DONE` ou `SKIPPED`. `PENDING` de um dia passado conta como não feita (derivado, não gravado).
- "Livre" não é um item: é a ausência de itens. Fim de semana sem nada não conta como falha.
- **Dias especiais** (feriado, férias, folga, doente) pulam as regras marcadas com "pula em feriados".

### Modelo (etapa 2)

| Tabela | Para quê | Pontos importantes |
|---|---|---|
| `categories` | cor e ícone dos itens | `color_key` = um dos tons `--cat-*` (daily, work, commute, study, class, workout, meal, personal), nunca hex. Em uso não se exclui: arquiva. Padrão: Rotina diária, Trabalho, Condução, Estudo, Aulas, Treino, Refeição, Pessoal. |
| `routine_rules` | itens fixos | `kind`, `weekdays int[]` (0 = domingo … 6 = sábado), `start_minute`/`end_minute` opcionais (0–1440, início < fim), `start_date` e `end_date` opcional, `skip_on_holidays` (usado na etapa 5). |
| `day_items` | o que existe num dia | criados pela materialização (com `rule_id`) ou avulsos (sem `rule_id`: tarefa, compromisso). `origin_date` = o dia da regra; `date` = o dia em que está agora (muda ao remarcar). Único `(rule_id, origin_date)`: a materialização usa `skipDuplicates` e um item remarcado ou "não houve" nunca volta. |

- `kind` (enum `ItemKind`): `ROUTINE` (bloco de rotina), `APPOINTMENT` (compromisso), `WORKOUT` (treino), `TASK`
  (tarefa), `HABIT` (etapa 3) e `CLASS` (etapa 4). Todos já existem no enum para não precisar de migração de enum depois.
- `status`: `PENDING`, `DONE` (`done_at` = instante) ou `SKIPPED` (`skip_reason` opcional). `PENDING` de dia passado é
  "não feita" só na leitura.
- **Materialização**: `GET /days/:date` (e a semana, na etapa 5) chama `materialize(userId, de, até)`: para cada regra
  ativa no intervalo, a função pura `occursOn(rule, date)` decide se o item existe; depois `createMany(skipDuplicates)`.
  Roda toda vez que o dia é aberto (barato e idempotente), então uma regra nova aparece no dia já aberto.
- **Só hoje**: edita o `day_item` e marca `is_overridden`. **Remarcar** = mudar `date`/horários do item (atrasar = mesmo
  dia, outro horário).
- **Daqui pra frente** (a partir do dia D): a regra antiga ganha `end_date = D − 1` e nasce uma regra nova a partir de D.
  Itens da regra antiga com `origin_date ≥ D`: os `PENDING` não editados são apagados (a nova regra recria); os outros
  (feitos, "não houve", editados) passam para a regra nova, para não duplicar. Se D é o primeiro dia da regra (ou antes),
  a própria regra é alterada. **Excluir daqui pra frente** fecha a regra em D − 1 e apaga as cópias futuras não
  tocadas; as tocadas (feitas, "não houve", editadas) ficam no dia como itens avulsos. Excluir desde o primeiro dia
  apaga a regra (as tocadas também viram avulsas).

#### API (etapa 2)

| Método e rota | O que faz |
|---|---|
| `GET /categories?includeArchived=true` | categorias (cria as padrão para usuário antigo sem nenhuma) |
| `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` | criar, editar (`name`, `colorKey`, `icon`, `isArchived`, `sortOrder`), excluir (409 se em uso: arquive) |
| `GET /rules` | regras em vigor hoje ou depois |
| `POST /rules` | `{ kind, name, categoryId?, weekdays[], startMinute?, endMinute?, startDate?, endDate?, skipOnHolidays?, notes? }` |
| `PATCH /rules/:id` | daqui pra frente: os campos que mudam + `from` (padrão hoje) |
| `DELETE /rules/:id?from=AAAA-MM-DD` | exclui daqui pra frente (padrão hoje) |
| `GET /days/:date` | `{ date, today, items (com horário, em ordem), anytime, overdue (só quando date = hoje), progress }` |
| `POST /days/:date/items` | avulso: `{ kind: TASK \| APPOINTMENT, name, categoryId?, startMinute?, endMinute?, notes? }` |
| `PATCH /day-items/:id/status` | `{ status: DONE \| SKIPPED \| PENDING, reason? }` |
| `PATCH /day-items/:id` | só hoje / remarcar: `{ name?, categoryId?, startMinute?, endMinute?, date?, notes? }` |
| `POST /day-items/:id/shift` | atrasar: `{ minutes }` (±720), 422 se passar da meia-noite ou sem horário |
| `DELETE /day-items/:id` | só avulsos (item de regra = 409: use "não houve") |

Cada item traz `category: { id, name, colorKey, icon } | null`.
- **Tarefas avulsas**: `TASK` sem regra, com data e horário opcional. Tarefa avulsa `PENDING` de dia anterior aparece no topo
  do Hoje como **atrasada** até ser feita ou descartada (descartar = `SKIPPED`). Tarefa **fixa** não feita não acumula: fica
  "não feita" no dia dela e volta no próximo dia da regra.
#### Front (etapa 3)

- `features/today/TodayPage.jsx`: abas **Dia | Semana** (`?aba=semana&dia=AAAA-MM-DD`). `DayView.jsx` = o resumo; `WeekView.jsx` = a agenda.
- `lib/agenda.js` (`layoutDay`, testado): cada cartão vai do início ao fim (mínimo de 30 min para dar para ler); itens no mesmo
  horário ficam lado a lado, dividindo a largura, como no Google Agenda. A grade tem 48 px por hora e abre às 06:00.
- `features/today/TimeFields.jsx`: "Sem horário / Período / Horário", usado no Dia e na Rotina fixa (`timeValues`/`timeBody` em `lib/minutes.js`).
- Treino marcado como feito abre a escolha do treino e do horário real (`DoneDialog`); o resto marca com um toque.

#### Nomes na interface (`routine-front/src/lib/kinds.js`)

Todo item é **fixo** (vem da rotina fixa, repete nos dias escolhidos) ou **avulso** (só num dia). A tela mostra o tipo com essa
palavra: "Tarefa fixa", "Tarefa avulsa", "Compromisso fixo", "Compromisso avulso"; "Bloco da rotina" e "Treino" ficam sem a
palavra. **Tarefa** = algo para fazer e marcar, com ou sem horário (ler 2 páginas, ligar pro banco). **Compromisso** = hora
marcada com alguém ou em algum lugar (dentista, reunião). A categoria **Rotina diária** junta as tarefas fixas pequenas de todo
dia, sem horário (ler 2 páginas de um livro, revisar flashcards no aplicativo). Use sempre `KINDS`/`itemKindLabel` em vez de
escrever os nomes de novo.

- **Progresso do dia** = feitos ÷ (itens do dia − "não houve"), função pura em `utils/`. A nota vem na etapa 6.

### Modelo (etapa 3): Dia + Semana

Escopo revisto com o usuário em `PROMPT.md` → "Revisão de 2026-11-24". Regras puras em `utils/routineUtils.js`
(testadas em `__tests__/unit/routine.test.js`); fluxos em `__tests__/integration/day-week.test.js`.

| O quê | Onde | Regra |
|---|---|---|
| **Afazeres** (rotina diária, rotina de dormir) | `routine_rules.steps` (JSON `[{ key, name }]`, só `ROUTINE`, até 20) → `day_item_steps` (uma linha por afazer por dia, `done_at`) | A materialização copia os afazeres para o dia (`createManyAndReturn` + `createMany`, na mesma transação). O bloco fica `DONE` quando todos os afazeres estão feitos; o check grande marca todos; voltar de feito desmarca todos. "Não houve" vale para o bloco inteiro (afazer não pode ser marcado). Marcar afazer trava a linha do bloco (`DayItemDao.lock`) para dois toques rápidos não se sobreporem. A `key` do afazer passa de uma versão da regra para a outra ("daqui pra frente"), então a **sequência** continua. |
| **Sequência** | leitura | Por afazer (`key`): dias seguidos feitos até o dia aberto; dia passado não feito quebra; "não houve" e dia sem o afazer não quebram; o próprio dia só conta depois de feito (`streak`). Hábitos viraram afazeres: o tipo `HABIT` ficou sem uso. |
| **Progresso** | leitura | Cada afazer conta como um item (3 de 5 afazeres = 3 feitos); bloco "não houve" pula todos os seus afazeres. |
| **Período** (Manhã 06–12, Tarde 12–18, Noite 18–24) | `period` em `routine_rules` e `day_items` | Horário exato **ou** período, nunca os dois (`timeError`). Na linha do tempo, o item de período fica no início do período, antes dos horários exatos dali. Na Semana, vai para a faixa do topo do dia. |
| **A fazer** (tarefa sem data) | `day_items.date = null` (só `TASK` avulsa) | Aparece no Dia de hoje até ganhar um dia (`PATCH date`) ou ser feita. Não fica atrasada. |
| **Presencial ou home** | `user_settings.office_days` (JSON `[{ from, weekdays }]`), `day_modes` (troca de um dia), `routine_rules.mode` (`OFFICE`, `HOME` ou nulo = todo dia) | O modo do dia = a troca daquele dia, senão o padrão do dia da semana **em vigor naquela data** (os dias presenciais mudam "daqui pra frente", como as regras: o passado guarda os seus). A materialização só cria as regras que cabem no modo do dia. Trocar o modo (`PUT /days/:date/mode`) ou os dias presenciais refaz os dias: apaga os itens **intocados** de regras com modo e materializa de novo (`DayService.redo`). Intocado = pendente, não editado, sem afazer marcado (`UNTOUCHED`). |
| **Treino** | `variant` em `routine_rules` (planejado) e `day_items` (feito); `user_settings.workout_types` (sugestões) | Só `WORKOUT`. Ao marcar feito, escolhe qual foi; texto livre (a lista é só sugestão). |
| **Feito em outro horário** | `day_items.done_minute` | Ao marcar feito pode informar a hora real. Sem informar: hora atual se o item é de hoje; nulo se é de outro dia (não se sabe). Usado nos relatórios de procrastinação (etapa 6). |
| **Semana** | leitura | Segunda a domingo (`weekStart`), como a planilha. Materializa os 7 dias. |

#### API (etapa 3)

| Método e rota | O que faz |
|---|---|
| `GET /days/:date` | agora também `mode: { value, isDefault, relevant }`, `inbox` (A fazer, só hoje), `period`, `variant`, `doneMinute` e `steps: [{ id, key, name, doneAt, streak }]` em cada item |
| `GET /weeks/:date` | `{ from, to, today, modeRelevant, days: [{ date, mode, items, anytime, progress }] }` da semana de `date` |
| `PUT /days/:date/mode` | `{ mode: OFFICE \| HOME \| null }` (null = volta ao padrão) → devolve o dia |
| `POST /tasks` | tarefa sem data: `{ name, categoryId?, notes? }` |
| `PATCH /day-items/:id/steps/:stepId` | `{ done }` → devolve o bloco |
| `PATCH /day-items/:id/status` | aceita também `doneMinute` (0–1439) e `variant` (só treino) |
| `PATCH /day-items/:id` | aceita também `period`, `variant` e `date: null` (tarefa avulsa volta para A fazer) |
| `POST /rules`, `PATCH /rules/:id` | aceitam `period`, `mode`, `variant` e `steps: [{ key?, name }]` |
| `GET /routine-settings`, `PATCH /routine-settings` | `{ officeWeekdays, workoutTypes }`; os dias presenciais novos valem de hoje em diante |

### Água (etapa 4)

- `water_settings` (por usuário): `goal_ml` (padrão 2000). Sem tamanhos de copo: o registro é só por número.
- `water_logs`: `date` civil, `amount_ml` (1–3000), `logged_at` (instante). Desfazer = apagar o último do dia.
- Leitura do dia: total, meta, % e a lista. Sequência = dias seguidos com total ≥ meta, contando só a partir do
  primeiro registro (função pura, testada).

## Datas e horários

- **Datas civis** (o dia de uma ocorrência, início e fim de uma regra) são `date` no banco e `"YYYY-MM-DD"` na API.
  Não sofrem com fuso.
- **Horários do dia** são **minutos desde 00:00** (`integer`, 0–1440; `1440` = meia-noite do fim do dia, para um
  bloco "23:00 às 00:00"). Bloco que atravessa a meia-noite não é suportado na primeira versão.
- **Instantes** (criação, login, sessão, hora em que algo foi marcado como feito) são `timestamptz`.
- "Hoje" é sempre calculado em `America/Sao_Paulo` (`user_settings.timezone`).
- Somar meses respeita o calendário (31/01 + 1 mês = 28/02 ou 29/02). Nunca "somar 30 dias".

## Multiusuário e isolamento

1. Toda tabela de dados do usuário tem `user_id`.
2. Toda consulta do repository filtra por `user_id` da sessão. Updates e deletes usam a chave composta `(id, user_id)`.
3. Tabelas filhas referenciam pais por **FK composta `(pai_id, user_id)`**. O próprio PostgreSQL recusa vincular um registro a outro de um usuário diferente, mesmo que haja bug no código.
4. IDs inválidos ou de outro usuário retornam **404**, nunca 403. Não se revela que o registro existe.

## Autenticação e segurança

- **Sessões no banco**, não JWT, porque o logout e a troca de senha precisam revogar sessões na hora. O cookie guarda um token aleatório de 256 bits. O banco guarda só o **HMAC-SHA256** do token (chave derivada do `AUTH_SECRET`).
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` + prefixo `__Host-` em produção.
- **Duração da sessão**: termina depois de 30 dias sem uso (renovada quando restam menos de 15) e, mesmo usada todo dia, **no máximo 90 dias depois do login**. O "último acesso" é atualizado no máximo uma vez por hora.
- **Aparelhos conectados**: o usuário vê onde está logado e encerra um aparelho ou todos os outros (Configurações → Segurança).
- Senhas com **Argon2id** (19 MiB, t=2, p=1) com sal e um *pepper* derivado do `AUTH_SECRET`.
- **Verificação em duas etapas** (opcional, TOTP/RFC 6238, a mesma dos apps Google/Microsoft Authenticator). A chave fica cifrada com AES-256-GCM (chave derivada do `AUTH_SECRET`). Cada código vale uma vez (o último passo de 30 s aceito fica gravado). 10 códigos de recuperação, guardados só como HMAC. Depois da senha, o login devolve um *ticket* de 10 minutos; o ticket sobrevive a um código digitado errado, e 5 erros em 15 minutos bloqueiam. Ativar desconecta os outros aparelhos. Desativar, gerar novos códigos e excluir a conta pedem senha + código. Emergência: `npm run user:disable-2fa -- email`.
- **Rate limits**: login com 5 falhas por e-mail ou 30 por IP a cada 15 minutos (mesma mensagem e tempo para "e-mail inexistente" e "senha errada"); ações que mandam e-mail ou criam conta; e um limite geral de **120 requisições por minuto por IP** em toda a API, contado no banco (vale para todas as instâncias da Vercel).
- **CSRF**: requisições que alteram dados precisam do header `Origin` igual a `APP_ORIGIN` e de corpo JSON.
- Helmet (CSP restritiva na API), `Cache-Control: no-store` em todas as respostas da API, limite de 100 kB no corpo.
- Logs de erro não incluem corpo de requisição (senhas, valores).
- Cadastro público com confirmação por e-mail **e aprovação de um admin** (desligável de vez com `SIGNUP_ENABLED=false`). Depois de confirmar o e-mail, a conta fica esperando (`users.approved_at` nulo, login recusado com `ACCOUNT_PENDING`) e cada admin recebe um e-mail. Em Configurações → Usuários (só admins) o pedido é liberado (a pessoa recebe um e-mail) ou recusado (a conta é excluída). Contas criadas por `npm run user:create` já nascem liberadas. As respostas de cadastro e "esqueci a senha" são iguais exista o e-mail ou não, e os e-mails saem em segundo plano para o tempo de resposta não revelar nada.
- Troca de senha encerra todas as outras sessões; redefinição por e-mail encerra todas.
- **Demonstração**: qualquer pessoa toca em "Ver demonstração" na tela de entrada (`POST /auth/demo`) e ganha uma cópia só sua de uma pessoa fictícia (Marina Costa), montada pelos mesmos serviços do app, que começou a usar o app há algumas semanas (a rotina dela entra a cada etapa). Cada cópia tem `users.demo_expires_at`: some quando o visitante sai e para de funcionar depois de 24 horas (é apagada quando a próxima demo é aberta). No máximo 30 ao mesmo tempo (abrir mais uma apaga a mais antiga) e 6 por IP a cada hora. Se alguém estava logado no aparelho, a sessão dele termina. A demo não entra por senha (e-mail `demo-…@routine.invalid`, domínio reservado), não recebe e-mail, não troca senha, e-mail ou 2FA, não se exclui e não aparece em Configurações → Usuários.
- **LGPD**: "Baixar meus dados" exporta tudo o que é do usuário em JSON (sem segredos). "Excluir conta" apaga o usuário e, em cascata, todas as tabelas dele.

## Sistema visual: Cream Routine

Fica todo em `routine-front/src/index.css`, em tokens CSS expostos ao Tailwind 4 por `@theme inline`.
**Nenhum hex solto em componente**; as exceções são o QR code (preto no branco, para ler bem) e o logo.

| Papel (60-30-10) | Claro | Escuro | Onde |
|---|---|---|---|
| 60% base | creme `#FAF3E8` | marinho `#16253A` | fundos, áreas de conteúdo |
| 30% estrutura | marinho `#253B57` | creme `#FAF3E8` | texto, navegação, cabeçalhos, ícones, linhas |
| 10% destaque | rosa suave `#F4A6C1` | rosa suave `#F4A6C1` | botão principal, selecionado, check feito, "agora" |
| Cartões | branco `#FFFFFF` | `#1E3149` | separar conteúdo do fundo |

- **Texto sobre o rosa é sempre marinho** (`--accent-ink`), nunca branco (contraste 6:1).
- O rosa suave não tem contraste para texto sobre o creme (~1,8:1). Texto, ícone pequeno, link e barra fina em rosa
  usam **`--accent-text`** (`#B8336A` no claro, 5:1; o próprio rosa no escuro). Em classes: `text-accent-text`,
  nunca `text-accent`.
- Estados: hover `--accent-hover`, pressionado `--accent-active`, selecionado `--selected`, foco com anel
  `--focus-ring` (marinho no claro, rosa no escuro), desabilitado com 50% de opacidade e `cursor: not-allowed`.
- Cores com significado próprio, fora da conta: `done` (feito), `danger` (erro, não feito), `warn` (atenção) e as
  cores das categorias (`--cat-work`, `--cat-study`…), sempre com texto `--ink`.
- Fonte **Inter** (`@fontsource-variable/inter`), números tabulares em horários e contadores.
- Mobile-first: barra de abas embaixo no celular, no topo a partir de `md`.

### Movimento (páginas públicas: landing, contato, entrar, criar conta)

Escolhidas numa página de comparação com 6 opções por grupo:

- **Céu do dia** (`pages/landing/sky-day.jsx`), numa janela à direita da abertura (o título fica à esquerda, com
  prioridade): a luz segue a hora em que o mouse está na abertura, do amanhecer (borda esquerda) à noite (borda
  direita); o sol percorre um arco e vira lua depois das 19:30; embaixo, os blocos do dia formam uma cidade com bordas
  num branco suave e janelas na cor de texto (marinho no claro, creme no escuro), e o bloco de agora em rosa. Sem
  mouse, o dia passa sozinho. Cores em tokens `--sky-*`. A abertura é um painel com borda marinho que cabe numa tela
  só; as telas do app (celular e computador) vêm logo abaixo, na seção "No celular e no computador".
- **Sequência** (`pages/landing/streak-run.jsx`), na linha entre as seções: quadradinhos de dias se preenchem de uma
  ponta à outra da página e terminam no selo "N dias seguidos".
- **Planilha viva** (`pages/landing/live-sheet.jsx`), no contato e nas telas de entrar e criar conta: a grade da planilha no fundo; as células perto do mouse se
  pintam com as cores das categorias e se apagam. **Atrás de elementos `[data-calm]`** (título, textos, botões, o
  menu fixo) as células continuam acendendo, mas numa camada desfocada e mais fraca, para não atrapalhar a
  leitura. Sem mouse por um tempo, um ponteiro "fantasma" passeia. Começa só depois que a página
  carrega e o navegador fica ocioso, pausa fora da tela e com a aba escondida, e as linhas são desenhadas uma vez só.
- **Cursor de encaixe** (`pages/landing/snap-cursor.jsx`): ponto marinho + anel rosa que segue com atraso e, em
  cima de link ou botão, assume o formato dele. Só com mouse de verdade (`pointer: fine`); em campos de texto volta
  o cursor normal.
- **Grade da semana** (`lib/grid-transition.js` + `GridLink`): quadrados sólidos (cantos retos, sem frestas) cobrem a tela em
  onda diagonal, a página troca por baixo e eles se desfazem. Usada nas entradas (landing → entrar, criar conta,
  contato, abrir o app), não em todo clique dentro do app.
- Gráficos (relatórios e mockups): as categorias usam `--chart-*` (validadas para daltonismo nos dois temas, ordem
  fixa: trabalho, aulas, treino, estudo) e sempre têm rótulo direto. Os tons `--cat-*` são só para fundo de bloco
  com texto, nunca para gráfico.
- Tudo respeita `prefers-reduced-motion`: com ele ligado, a grade fica parada, o cursor é o do sistema e a página
  troca sem transição.

## Metas e relatórios (etapa 6)

- `GET /reports?from&to` apura o período solicitado até hoje. Intervalos de até 366 dias usam datas civis de São Paulo. O serviço materializa as ocorrências esperadas até a data apurada, inclusive em dias que ainda não foram abertos.
- O percentual de cumprimento é feito ÷ (esperado − pulado). Em blocos com afazeres, cada afazer conta uma vez. Afazeres e compromissos têm peso 2 na nota. Demais itens têm peso 1. A nota vai de 0 a 10 com uma casa decimal e é omitida quando nada era esperado. A nota do intervalo considera todos os itens e seus pesos.
- Horas por categoria usam a duração planejada dos itens concluídos com início e fim. Treinos incluem itens antigos do tipo `WORKOUT` e itens de categorias com a cor `workout`. O agrupamento usa o tipo salvo ou o nome do item. A média de água começa no primeiro registro e compara cada dia à meta configurada em Água.
- O mapa conta itens por dia da semana e hora planejada. Não feitos entram depois que o dia passou. Feito depois compara hora real com hora agendada. Remarcado usa a primeira data e horário antes da mudança. As contagens podem se sobrepor. Itens sem horário entram nos totais. A migração recupera remarcações anteriores de fixos cujo dia de origem difere da data atual.
- Metas em `personal_goals` pertencem ao usuário e têm alvo validado ao salvar. Cada resultado usa o dia, a semana de segunda a domingo ou o mês civil correspondente até hoje. As metas personalizadas de água podem coexistir com a meta diária da tela Água.
- A identidade `series_id` mantém um fixo atrelado à mesma meta depois de edições ou divisões. Cada regra preexistente recebe a própria identidade na migração. A sequência de afazeres usa a chave estável do passo e considera dias esperados ainda sem ocorrência.
- `GET /goals` e `/goals/options` listam metas e alvos. `POST /goals`, `PUT /goals/:id` e `DELETE /goals/:id` gerenciam metas. `GET /reports/pending?from&to` reúne dias passados com itens sem revisão. `POST /reports/pending/:date` recebe até 100 IDs de um dia e salva a revisão em transação. “Não feito” grava `reviewed_at` e mantém a pendência no cálculo. “Não houve” marca `SKIPPED`.
- [reports.test.js](../routine-back/__tests__/integration/reports.test.js) cobre o contrato. A conta de demonstração inclui água, atrasos, remarcações e metas em três semanas de histórico fictício.

## Etapas

| Etapa | Escopo | Situação |
|---|---|---|
| 1 | Fundação: cópia do Finance sem o domínio de dinheiro, login, cadastro, 2FA, segurança, demonstração, identidade Cream Routine, landing | ✅ |
| 2 | Rotina fixa + Hoje (MVP), categorias gerenciáveis, materialização, checks, edição só neste dia ou daqui pra frente, itens avulsos e ajuda nas telas | ✅ |
| 3 | Dia + Semana: abas, agenda horas × dias, rotinas com afazeres e sequências, tarefas sem data e por período, modo presencial/home, treino variável, feito em outro horário | em avaliação |
| 4 | Água: tela própria, registro por número, sequência | |
| 5 | Dias especiais. Aulas usam Fixo ou Avulso | Adiada |
| 6 | Metas pessoais e relatórios (procrastinação, água, treinos), revisar dias pendentes | ✅ |
| 7 | Bot do Telegram (mesma base do Finance): água, marcar feito, tarefas, resumo, lembretes | |
| 8 | Qualidade e publicação: PWA, demonstração completa, primeiros passos, E2E, backups, deploy | |
| 9 | Refeições | |
