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

## Etapas

| Etapa | Escopo | Situação |
|---|---|---|
| 1 | Fundação: cópia do Finance sem o domínio de dinheiro, login, cadastro, 2FA, segurança, demonstração, identidade Cream Routine, landing | ✅ |
| 2 | Rotina fixa + Hoje (MVP): categorias, regras por dia da semana e horário, materialização, checks, "só hoje"/"daqui pra frente", "não houve", tarefas avulsas | ⏳ |
| 3 | Hábitos: meta e quantidade, horário sugerido, "A qualquer hora", sequências | |
| 4 | Aulas e alunos: atrasar, remarcar, cancelar | |
| 5 | Semana em grade + dias especiais | |
| 6 | Relatórios e nota do dia/semana | |
| 7 | Qualidade e publicação: PWA, demonstração completa, primeiros passos, E2E, backups, deploy | |
| 8 | Refeições | |
