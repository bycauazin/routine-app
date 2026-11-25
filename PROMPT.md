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

### Controle de água

Pedido do usuário em 2026-11-23, revisto em 2026-11-24: **tela própria** (etapa 4).

- **Meta diária em ml** (padrão 2.000 ml, ajustável; é uma das metas pessoais, ver "Metas").
- **Registro só por número**: um campo onde digito quanto bebi ("200", "1000"). **Sem botões de copo.** Cada
  registro guarda a quantidade e a hora (`water_logs`), para poder **desfazer o último** e ver a lista do dia.
- No resumo do **Dia**: uma linha pequena "1,2 de 2 L" que leva para a tela da água.
- **Sequência** de dias batendo a meta (atual e recorde). Dia sem registro conta como meta não batida, mas só
  a partir do primeiro registro.
- Pelo **bot**: "bebi 500" registra.

### Revisão de 2026-11-24 (conversa com o usuário)

**Plano × real.** Tudo o que está cadastrado é o **plano**. Eu vou marcando se segui ou não. O app (pelo bot)
me cobra quando eu deixo de marcar.

**Rotinas (listas de afazeres).** Uma rotina é um item fixo com uma **lista de pequenos afazeres** que eu
configuro. Exemplos:
- **Rotina diária**: ler 2 páginas, revisar flashcards (2 min), uma lição do Duolingo, um episódio de série,
  abrir a faculdade EAD.
- **Rotina de dormir** (das 23h em diante): tirar as telas, ler, desacelerar, banho, algo leve (leite com Nescau).

Rotina **com horário** vira um cartão na Semana. Rotina **sem horário** fica só na lista do Dia. O progresso é
"3 de 5 afazeres". Cada afazer pode ter sequência própria, como os hábitos.

**Modo do dia: presencial ou home.** Trabalho CLT às vezes presencial, às vezes home. Cada dia da semana tem um
modo padrão (configurável), e no Dia há o botão **"Hoje é home"** (ou "Hoje é presencial"). Itens marcados como
**"só presencial"** (condução, por exemplo) somem do dia quando ele é home, e voltam se eu trocar de novo.

**Treino variável.** Às vezes corro, às vezes muay thai, às vezes academia. O horário de **Treino** é fixo, e na
hora de marcar feito eu escolho qual fiz. Também posso planejar um tipo para cada dia e trocar na hora. Os
relatórios mostram quantas vezes fiz cada um.

**Aulas.** Dou aula EAD (programação, Power BI…). A aula é um compromisso com um aluno e um horário (etapa 5).
Sem link da chamada no cartão (sugestão recusada).

**Tarefas avulsas: três casos.**
- **Sem data**: fica na lista **"A fazer"** do Dia até eu fazer ou descartar.
- **Com data**: aparece na lista daquele dia, não na grade.
- **Com data e período** (Manhã / Tarde / Noite), ex.: "fazer comida sábado de manhã": aparece numa faixa no
  topo da coluna daquele dia na Semana, sem ocupar um horário exato.
- Com data **e hora** já é um **compromisso avulso**.

**"Fiz em outro horário".** Ao marcar feito, posso informar a hora real. Isso alimenta o relatório de
procrastinação.

**Revisar dias pendentes.** Uma tela lista os dias com itens sem marcar (ex.: o fim de semana inteiro), para
resolver tudo de uma vez: feito, não feito ou não houve.

**Metas pessoais.** Todas personalizáveis de um jeito simples e mobile-first (o Finance tem metas, mas aqui há
muito mais opções). Exemplos: treinar 3x por semana, beber 2 L de água por dia, ler todo dia, cumprir 80% da rotina
diária. Cada meta tem: **o quê** (um item/afazer, uma categoria, o treino, a água ou a rotina inteira), **quanto**
(vezes, ml, %, minutos) e **por período** (dia, semana, mês). Os relatórios mostram se estou batendo cada meta.

**Bot do Telegram** (mesma pegada do bot do Finance: `../finance-app/finance-back/src/services/telegram/`,
regras + IA de reserva, nada é salvo sem eu confirmar):
- registrar água ("bebi 500");
- marcar item como feito;
- criar tarefa: "anotar em tarefas fazer X sábado de manhã", "anotar fazer X amanhã" ou só "anotar fazer X"
  (sem data vai para "A fazer");
- resumo do dia pela manhã;
- **lembretes e cobranças**: "ontem ficaram 4 itens sem marcar", "o fim de semana ficou sem registro". O PWA não
  tem notificações, então os avisos vêm pelo bot.

**Ideias para o futuro (não entram agora).**
- **Refeições**: plano por horário (o que comer em cada uma), com "comi / não comi" no Dia. Saiu das etapas em 2026-11-25.
- **Sono**: hora em que dormi e acordei, ligada à rotina de dormir; talvez integração com a Mi Band 8 (ainda não
  tenho o hábito de dormir com ela).

### Revisão de 2026-11-24 (noite): blocos, afazeres e listas

Pedido do usuário, aprovado com "ok". Vale sobre o que estiver escrito antes.

- **Adicionar no Hoje:** dois botões, **Fixo** (se repete: regra com dias, horário/período/sem horário e
  início) e **Avulso** (uma vez; data, período e horário opcionais; sem data vai para "Quando der"; com
  horário pode ser "compromisso", que não fica atrasado).
- **Sem presencial/home.** Condução só em certos dias = um fixo com esses dias da semana.
- **Todo fixo é um bloco** (nome, dias, horário, categoria, ícone, afazeres opcionais). Sem tipo
  Treino/Tarefa fixa/Compromisso fixo e sem "qual treino fiz"/tipos de treino.
- **Ícone por item**, sugerido pelo nome (ou escolhido), na cor da categoria.
- **Afazeres editáveis no Dia** ("Afazeres…"): só neste dia ou daqui pra frente; cada afazer com hora
  opcional (ex.: "Reunião com cliente 15:00" dentro do Trabalho).
- **Parte 3 (feita): Listas** ("Rotina diária", "Rotina do trabalho"): afazeres sem horário próprio que
  aparecem dentro dos blocos escolhidos (Condução ida e volta, Almoço, Trabalho manhã e tarde). Marcar num
  lugar marca em todos; a lista também aparece como cartão próprio em "Para hoje, sem horário".
- **Parte 4 (feita): Avulso dentro de um bloco**: com data, "Colocar dentro de: Trabalho (13h–17h)" vira
  um afazer daquele bloco só naquele dia.
- **Seções do Dia:** Atrasadas → Para hoje, sem horário → Quando der (sem dia marcado) → Linha do tempo
  (hora grande à esquerda).

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
- **Revisão de 2026-11-24: duas abas no topo, no celular e no computador.**
  - **Dia** (o resumo): a lista do dia descrita acima, mais rotinas com seus afazeres, "A fazer" (tarefas sem
    data), o modo presencial/home e a linha da água.
  - **Semana**: agenda como Google Agenda / Outlook. **Horas à esquerda (de 1 em 1 hora), dias em cima.** Cada
    cartão ocupa o espaço exato do horário (um compromisso das 1h30 às 2h30 começa no meio da linha da 1h e
    termina no meio da das 2h). Itens no mesmo horário ficam **lado a lado**, dividindo a largura, sem um cobrir o
    outro. Grade visível das 6h às 24h, rolando para ver o resto. Faixa Manhã / Tarde / Noite no topo de cada dia.
    Itens sem horário não aparecem na grade.
- **Água**: tela própria (ver "Controle de água").
- **Revisar dias pendentes**: ver a revisão acima.
- **Relatórios**: filtro de período que começa em **Hoje**, com os botões **7 dias** e **1 mês** e datas de
  início e fim livres. Mostra:
  - % cumprido, nota, sequências, aulas por aluno, horas por categoria;
  - **metas pessoais** batidas ou não;
  - **água**: média, dias com a meta batida;
  - **treinos** por tipo;
  - **quando eu mais procrastino**: mapa de calor dia da semana × horário que junta (a) itens não feitos,
    (b) diferença entre a hora planejada e a hora real e (c) itens atrasados ou remarcados.
- **Configurações**: Rotina fixa, Hábitos, Água, Alunos, Categorias, Dias especiais, Perfil e senha, Segurança,
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
Nova ordem aprovada em 2026-11-24:

3. **Dia + Semana**: abas Dia e Semana (agenda com horas × dias, cartões proporcionais, lado a lado quando
   batem); hábitos e **rotinas com afazeres** (diária, de dormir); tarefas sem data, com data e com período;
   modo presencial/home; treino variável; "fiz em outro horário".
4. **Água**: tela própria, registro por número, desfazer, sequência, linha no resumo do Dia.
5. **Dias especiais (adiada)**: feriado, férias e folga, com "pula em feriados". Aulas usam Avulso ou Fixo e
   podem ter afazeres só na ocorrência. Cadastro dedicado de alunos e relatórios por aluno saíram do escopo.
6. **Metas e relatórios**: metas pessoais configuráveis, filtro Hoje / 7 dias / 1 mês / datas livres, nota,
   procrastinação, água, treinos; tela "Revisar dias pendentes".
7. **Bot do Telegram**: água, marcar feito, criar tarefa ("anotar…"), resumo da manhã, lembretes e cobranças.
8. **Qualidade e publicação**: PWA instalável, demonstração com pessoa fictícia, primeiros passos, testes
   E2E, backups, deploy final.
9. ~~Refeições~~ **Fora do plano (usuário, 2026-11-25):** controle demais por agora; fica nas ideias para o futuro.

## Como trabalhar

- Antes da etapa 1, leia o Finance e me apresente um plano curto do que será copiado, removido e renomeado.
- Pergunte quando uma regra de negócio não estiver clara, em vez de supor.
- Toda decisão nova vai para `docs/ARCHITECTURE.md`, no mesmo estilo do Finance.
- Commits pequenos, em português, por etapa.
