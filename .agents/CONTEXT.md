# routine-app · contexto

<!-- Curto e estável: o que um agente precisa saber antes de mexer. Detalhes ficam em docs/ e no código. -->

## O que é
Controle de rotina pessoal (irmão do `../finance-app`): blocos fixos por dia da semana e horário, tarefas avulsas,
hábitos com sequência, aulas com alunos, dias especiais, relatórios e refeições. A tela central é **Hoje**.
Escopo completo e etapas: `PROMPT.md`. Decisões: `docs/ARCHITECTURE.md`.

## Tecnologias e estrutura
- `routine-back/`: Node 24, Express 5, Prisma 7, PostgreSQL. Camadas routes → forms → controllers → services → daos.
- `routine-front/`: React 19, Vite, React Router 7, Tailwind 4. Tokens de cor em `src/index.css` (Cream Routine).
- `api/index.js` + `vercel.json`: deploy na Vercel (ainda não publicado).
- Tudo em JavaScript (ES Modules).

## Regras de negócio essenciais
- Regras e cálculos só no backend. Datas civis `YYYY-MM-DD`; horários em minutos desde 00:00; "hoje" em America/Sao_Paulo.
- Multiusuário: toda tabela do usuário tem `user_id`, FKs compostas `(pai_id, user_id)`, registro alheio = 404.
- Ocorrências do dia materializadas a partir das regras na primeira abertura do dia (idempotente); "só hoje" /
  "daqui pra frente"; "não houve" = SKIPPED (ver ARCHITECTURE.md).

## Padrões de desenvolvimento
- Cores: nunca hex solto em componente; usar tokens. Texto sobre rosa é marinho; rosa em texto = `text-accent-text`.
- Gráficos usam `--chart-*` (validados), sempre com rótulo direto; `--cat-*` só para fundo de bloco.
- Commits pequenos em português, **só quando o usuário pedir**.
- Mobile-first; testar no celular (390px) e no notebook (1366×768).

## Como rodar e testar
- API: `cd routine-back && npm run dev` (porta 3334). Site: `cd routine-front && npm run dev` (porta 5174).
- Testes: `cd routine-back && npm test` (precisa do PostgreSQL local, bancos `routine` e `routine_test`); `cd routine-front && npm test`, `npm run lint`, `npm run build`.
