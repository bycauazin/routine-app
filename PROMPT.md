# Prompt inicial — Routine · bycauazin

> Itens marcados com **[CONFIRMAR]** ainda dependem de decisão minha antes de começar.

## Contexto

Quero construir um app de **controle de rotina**, irmão do meu app de finanças (`../finance-app`). Ele nasce
do mesmo jeito que o Finance: eu controlava minha rotina numa planilha semanal (dias nas colunas, horários
nas linhas, cada bloco colorido por tipo) e quero transformar essa planilha num app que eu use todo dia no
celular.

O app tem que responder rápido a três perguntas:

1. **O que eu tenho hoje, e em que horário?**
2. **O que eu já fiz e o que falta?** (hábitos, tarefas, aulas, treino)
3. **Como eu estou indo?** (sequência dos hábitos, % da rotina cumprida, nota do dia/semana)

## Base técnica: a mesma do Finance

Leia antes de tudo `../finance-app/README.md` e `../finance-app/docs/ARCHITECTURE.md`. A estrutura, as
convenções e a segurança são as mesmas; só o domínio e a identidade visual mudam.

```
routine-app/
├── routine-back/    API — Node.js 24, Express 5, Prisma 7, PostgreSQL (camadas no padrão do Desk-API)
├── routine-front/   Interface — React 19, Vite, React Router, Tailwind CSS 4
├── api/             Express como função da Vercel (/api/*)
└── docs/            ARCHITECTURE.md (documento vivo, mesmo estilo do Finance)
```

**Como começar:** copiar a fundação do Finance e retirar tudo que é de dinheiro. Fica:

- autenticação com sessões no banco, Argon2id, 2FA (TOTP), rate limits, CSRF, Helmet, no-store;
- cadastro com confirmação de e-mail **e aprovação de admin**, "esqueci a senha", aparelhos conectados;
- multiusuário com isolamento por `user_id` e FKs compostas `(pai_id, user_id)`, 404 para registro alheio;
- LGPD: baixar meus dados e excluir conta;
- demonstração com uma pessoa fictícia (nova, **não** a Júlia do Finance) e cópia própria por visitante;
- estrutura de camadas (routes → forms → controllers → services → daos), formato de resposta
  `{ meta, data }`, env validado com Zod, testes unitários e de integração (Vitest), scripts `user:create`,
  `db:deploy`, `db:deploy:prod`;
- layout mobile-first, componentes de UI, tema claro/escuro, landing page pública.

Sai: contas, cartões, empréstimos, dívidas, livro-razão, metas 50/30/20, relatórios financeiros.

Regras que continuam valendo do Finance:

- **Toda regra e todo cálculo ficam no backend** (`utils/` puros e 100% testados). O front formata e envia.
- **Datas civis** como `date` / `"YYYY-MM-DD"`; instantes como `timestamptz`; "hoje" sempre em
  `America/Sao_Paulo`.
- **Horários** do dia como **minutos desde 00:00** (`integer`, 0–1440; `1440` = meia-noite do fim do dia,
  para blocos como "23:00 às 00:00"). Bloco que atravessa a meia-noite não é suportado na primeira versão.
- Projeto **separado** na Vercel, com banco próprio no Neon e outro `AUTH_SECRET`.

## O domínio

### A planilha de hoje (referência)

Esta é a minha rotina atual. Ela serve para entender o domínio e para montar os dados da demo (com outra pessoa
e pequenas variações) e um script que cadastra a minha rotina sem eu digitar tudo.

| Horário | seg | ter | qua | qui | sex | sáb/dom |
|---|---|---|---|---|---|---|
| 07–08 | Acordar | Acordar | Acordar | Acordar | Acordar | Livre |
| 08–09 | Condução / ler livro | ← | ← | ← | ← | Livre |
| 09–13 | Trabalho | ← | ← | ← | ← | Livre |
| 13–14 | Almoço / estudo | ← | ← | ← | ← | Livre |
| 14–18 | Trabalho | ← | ← | ← | ← | Livre |
| 18–19 | Estudo | Condução / ler livro | Estudo | Condução / ler livro | Estudo | Livre |
| 19–20 | Estudo | Correr | Estudo | Correr | Estudo | Livre |
| 20–21 | Condução / ler livro | Livre | Condução / ler livro | Livre | Condução / ler livro | Livre |
| 21–23 | Muay thai | Livre | Muay thai | Livre | Muay thai | Livre |

Refeições planejadas: café 07h (pão com ovo, queijo, atum + café), fruta 10h (banana ou abacaxi), almoço 13h
e janta 19h (arroz, feijão, alface, cenoura, tomate + proteína), lanche 16h (igual ao café), lanche 23h (whey).

"Livre" **não é um item**: é só a ausência de itens. Fim de semana sem nada cadastrado não conta como falha.

### Tipos de item

Todo item tem nome, categoria (cor e ícone) e pode ser **fixo** (regra que se repete) ou **avulso** (só numa
data). Assim como no Finance, há os dois jeitos de cadastrar.

| Tipo | Exemplos | Horário | O que se registra |
|---|---|---|---|
| **Compromisso** | reunião, consulta | início e fim | feito / não houve |
| **Bloco de rotina** | acordar, condução, trabalho, almoço | início e fim | feito / não houve |
| **Hábito** | estudar 10 min, Duolingo, ler 2 páginas | opcional (horário sugerido) | feito, com quantidade opcional (min, páginas) + sequência 🔥 |
| **Treino** | muay thai, correr | início e fim | feito / não houve (sem ficha de exercícios) |
| **Aula** | aula particular com um aluno | início e fim | dada / remarcada / cancelada |
| **Tarefa** | "ligar pro banco", tarefas do trabalho | opcional | feita / não feita |

Detalhes:

- **Fixos** repetem em **dias da semana** escolhidos, com horário, e valem de uma data inicial até uma final
  opcional (como `start_month`/`end_month` das contas fixas do Finance, mas por dia).
- **Hábitos** têm meta opcional ("10 min", "2 páginas") e podem ter **horário sugerido**: "ler livro" pode ir
  junto da "condução". Sem horário, ficam na seção **"A qualquer hora"** do dia. A sequência conta os dias
  seguidos em que o hábito era esperado e foi feito; dia "não houve" ou dia sem o hábito não quebra.
- **Tarefas do trabalho mudam todo dia**: são tarefas avulsas do dia, que podem ficar agrupadas dentro do
  bloco "Trabalho". Tarefas avulsas podem ter data e hora ou ficar sem horário. Tarefa não feita fica
  **atrasada** e continua aparecendo até ser feita ou descartada.
- **Aulas**: cadastro simples de **alunos** (nome e observação). A aula fixa liga um aluno a dias e horário.
  **Sem dinheiro.** O que importa são as mudanças do dia a dia: **atrasar** (ex.: +30 min), **remarcar** para
  outro dia/horário e **cancelar** só aquela aula. A aula original fica registrada como remarcada.

### O dia (centro do app)

Funciona como o mês do Finance:

- **Ocorrências do dia** (`day_items`) são criadas a partir das regras fixas **na primeira vez que o dia é
  aberto**, de forma idempotente (chave única regra + data, `skipDuplicates`). Não depende de cron. Abrir a
  semana materializa os 7 dias.
- **Editar "só hoje"** muda a ocorrência (`is_overridden`). **Editar "daqui pra frente"** fecha a regra no dia
  anterior e cria uma nova a partir da data escolhida, então os dias passados nunca mudam.
- **"Não houve"** marca a ocorrência como `SKIPPED` (não é recriada e não conta como falha).
- Status: `PENDING` → `DONE` (com quantidade opcional e hora em que foi marcado) ou `SKIPPED`. Uma ocorrência
  `PENDING` de um dia que já passou conta como **não feita** (derivado, não gravado).
- **Remarcar** uma ocorrência muda a data/hora dela (não a regra). Atrasar é remarcar no mesmo dia.

### Dias especiais (feriado, férias, folga, doente)

- Posso marcar um dia (ou um intervalo, para férias) com um tipo e um nome, ex.: "Feriado — Proclamação da
  República". Vale para datas passadas e futuras.
- Cada regra fixa tem a opção **"pula em feriados/folgas"**, ligada por padrão em trabalho, condução e
  aulas e desligada em hábitos. Ao marcar o dia, o app mostra o que será pulado e eu confirmo. Os itens
  pulados viram `SKIPPED` com o motivo.
- Dias especiais aparecem no Hoje, na Semana e nos relatórios.

### Acompanhamento

- **% cumprido** = feitos ÷ (esperados − pulados), por dia, semana e mês; por categoria e por hábito.
- **Nota do dia e da semana** (0–10), parecida com a nota do mês do Finance: calculada a partir do resumo,
  por função pura e testada, com pesos por tipo (hábitos e compromissos pesam mais que blocos de rotina).
  Os pesos ficam documentados no ARCHITECTURE.md.
- **Sequências** dos hábitos (atual e recorde).
- Aulas no mês por aluno (dadas, remarcadas, canceladas). Horas por categoria na semana.

## Telas

Mobile-first, como o Finance, e instalável como **PWA** (manifest + ícones + service worker só para cache do
app; **sem notificações** nesta versão).

- **Hoje** (tela principal): linha do tempo do dia em ordem de horário, com o marcador de "agora", e cada item
  com um check grande. Em cima, o progresso do dia e a nota. Seção "A qualquer hora" para hábitos e tarefas
  sem horário. Tarefas atrasadas de dias anteriores aparecem no topo. Ações rápidas: **+ Tarefa**,
  **+ Compromisso**, **Marcar dia** (feriado etc.). No item: feito, não houve, atrasar, remarcar, editar só
  hoje / daqui pra frente. Navegação para ontem e amanhã.
- **Semana**: a grade da planilha (dias × horários), colorida por categoria e com o status de cada bloco. Serve
  para ver o todo e tocar num dia.
- **Relatórios**: % cumprido, nota, sequências, aulas por aluno, horas por categoria, comparando semanas e
  meses.
- **Configurações**: Rotina fixa, Hábitos, Alunos, Categorias, Dias especiais, Perfil e senha, Segurança,
  Usuários (admins).
- **Primeiros passos**: checklist até o usuário fechar, igual ao Finance.
- **Landing page** pública e **demonstração**, iguais às do Finance, com o conteúdo de rotina.

## Identidade visual: Cream Routine

Experiência leve, elegante e acolhedora, com o rosa como elemento de identidade e destaque. Interface
moderna, minimalista e responsiva (mobile-first). Referência:
https://www.realtimecolors.com/?colors=253b57-faf3e8-f4a6c1-253b57-f4a6c1&fonts=Inter-Inter

**Paleta oficial (regra 60-30-10):**

| Papel | Cor | Onde |
|---|---|---|
| 60% dominante: creme | `#FAF3E8` | fundos principais, áreas de conteúdo, superfícies predominantes |
| 30% secundária: azul-marinho | `#253B57` | textos, navegação, cabeçalhos, ícones, elementos estruturais |
| 10% destaque: rosa suave | `#F4A6C1` | botões de ação principais, estados selecionados, destaques interativos (check feito, "agora") |
| Cartões | `#FFFFFF` | quando precisar separar visualmente o conteúdo do fundo creme |

**Tokens derivados (tema claro)**, com contraste conferido sobre o creme:

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#FAF3E8` | fundo |
| `--paper` | `#FFFFFF` | cartões |
| `--sunk` | `#F2E9DA` | áreas rebaixadas, hover de linhas |
| `--ink` | `#253B57` | texto principal (10:1) |
| `--muted` | `#5A6B80` | texto secundário (4,9:1) |
| `--rule` / `--rule-strong` | `#EADFCF` / `#D5C6B0` | linhas e bordas |
| `--accent` | `#F4A6C1` | fundo do botão principal, check feito |
| `--accent-hover` / `--accent-active` | `#EE9AB8` / `#E88DAF` | hover e pressionado do botão rosa |
| `--accent-ink` | `#253B57` | texto sobre o rosa (6:1). **Nunca branco** sobre o rosa |
| `--accent-text` | `#B8336A` | rosa em texto, ícone pequeno, link, barra fina sobre creme/branco (5:1). O rosa suave sozinho tem ~1,8:1 e não serve para texto |
| `--selected` | `#FCE4EC` | fundo de item selecionado e da linha "agora" (texto marinho) |
| `--focus-ring` | `#253B57` | anel de foco de 2px com offset 2px (rosa sobre creme não aparece) |

**Tema escuro:** o marinho vira a base, como no Finance. Fundo `#16253A`, superfície `#1E3149`, superfície
elevada e linhas `#253B57` / `#34506F`, texto creme `#FAF3E8`, secundário `#B5BDC8`. O rosa `#F4A6C1`
serve para tudo (texto sobre ele: `#16253A`), selecionado = `rgb(244 166 193 / 0.16)`, anel de foco rosa.

**Regras:**

- Todas as cores ficam **centralizadas em tokens** (variáveis CSS em `index.css`, expostas ao Tailwind 4 via
  `@theme inline`, igual ao Finance). Nenhum hex solto em componente.
- Todo elemento interativo tem **hover, foco visível (`:focus-visible`) e desabilitado**. Desabilitado = 45%
  de opacidade, `cursor: not-allowed`, sem hover. Respeitar `prefers-reduced-motion`.
- Fonte **Inter** (`@fontsource-variable/inter`) no lugar da Geist do Finance, com números tabulares em
  horários e contadores.
- Cores das categorias (trabalho, estudo, treino, aula, condução, refeição…) são próprias e ficam fora da
  conta 60-30-10, como as cores de dinheiro do Finance. Todas com contraste AA no claro e no escuro.
- Nome do app: **Routine · bycauazin** (no mesmo formato do "Finance · bycauazin").

## Etapas

Uma etapa por vez. No fim de cada uma: testes passando, `docs/ARCHITECTURE.md` e README atualizados, e você
me mostra o que ficou pronto e espera eu aprovar antes de começar a próxima.

1. **Fundação**: copiar o Finance, retirar o domínio de dinheiro, renomear (`routine-back`, `routine-front`,
   banco `routine`/`routine_test`), nova paleta e landing page. Login, cadastro, 2FA e segurança funcionando,
   e o esqueleto publicado na Vercel + Neon.
2. **Rotina fixa + Hoje** *(MVP: aqui eu já começo a usar)*: categorias, regras fixas por dia da semana e
   horário, materialização do dia, tela Hoje com linha do tempo e checks, "só hoje" / "daqui pra frente",
   "não houve", tarefas avulsas (com e sem horário, atrasadas). Script que cadastra a minha rotina da
   planilha.
3. **Hábitos**: meta e quantidade opcionais, horário sugerido, "A qualquer hora", sequências.
4. **Aulas e alunos**: cadastro de alunos, aulas fixas, atrasar, remarcar e cancelar.
5. **Semana + dias especiais**: grade semanal estilo planilha, feriados/férias/folga com "pula em feriados".
6. **Relatórios e nota**: % cumprido, nota do dia/semana, sequências, aulas por aluno, horas por categoria.
7. **Qualidade e publicação**: PWA instalável, demonstração com pessoa fictícia, primeiros passos, testes
   E2E, backups, deploy final.
8. **Refeições**: plano de refeições por horário (o que comer em cada uma), com "comi / não comi" no Hoje.

## Como trabalhar

- Antes da etapa 1, leia o Finance e me apresente um plano curto do que será copiado, removido e renomeado.
- Pergunte quando uma regra de negócio não estiver clara, em vez de supor.
- Toda decisão nova vai para `docs/ARCHITECTURE.md`, no mesmo estilo do Finance.
- Commits pequenos, em português, por etapa.
