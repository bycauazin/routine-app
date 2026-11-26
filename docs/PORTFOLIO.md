# nuCorre no portfólio (para a sessão da landing-page)

Resumo do projeto publicado, para atualizar a entrada que já existe em `landing-page/app/data/projects.js`. Hoje ela descreve o app como "Routine" em andamento. Tudo aqui foi conferido em 2026-11-26.

## Identidade

- **Nome:** nuCorre (antes Routine; o repositório, as pastas e o banco continuam como `routine`).
- **No ar:** https://nucorrebc.vercel.app (site e API no mesmo endereço; demonstração sem cadastro em "Ver demonstração").
- **Código:** github.com/bycauazin/routine-app (privado).
- **Uma frase:** controle de rotina no formato da planilha da semana. Cada dia vira uma lista em ordem de horário, com um check para cada coisa feita.
- **Marca:** logo bycauazin (fita em espiral) com contorno creme `#faf3e8`, fita azul-marinho `#253b57` e interior rosa `#f4a6c1`. Na página clara, contorno e fita trocam. Nome "nuCorre" em Inter 800, ao lado da assinatura `<bycauazin/>` em Major Mono Display.
- **Arquivos da logo:** `routine-front/public/logo-sticker.svg` (fundo escuro), `logo-sticker-light.svg` (fundo claro) e `logo.svg` (ícone num quadrado azul-marinho).
- **Paleta do app ("Cream Routine"):** fundo creme `#faf3e8`, tinta azul-marinho `#253b57`, destaque rosa `#f4a6c1`. No tema escuro o fundo é `#16253a`.
- **Abertura:** igual à do portfólio e à do Cacau, em azul-marinho e rosa: a logo gira, "nuCorre" é digitado e a assinatura aparece.

## O que está pronto (todas as etapas)

- **Rotina fixa:** blocos com dia e horário (trabalho, condução, estudo, treino, aulas), rotinas com afazeres (manhã, hora de dormir), hábitos com sequência e tarefas avulsas.
- **Hoje, Dia e Semana:** a lista do dia em ordem de horário, com linha do tempo. Itens sem horário ficam no topo. Item atrasado pode ser remarcado. A semana aparece em grade.
- **Água:** meta diária e registro rápido.
- **Dias especiais e imprevistos:** feriado, férias e doença pulam os blocos certos. Um imprevisto ("trânsito das 18 às 19:30") tira do caminho o que estava planejado.
- **Relatórios e metas:** cumprimento e nota por período (hoje, 7 dias, 1 mês, datas livres), água, treinos, categorias, sequências, mapa de atrasos e metas pessoais. A revisão marca dias pendentes em lote.
- **Simular:** testa uma rotina nova sem mexer na atual.
- **Bot do Telegram:** "anotar comprar pão amanhã de manhã", "fiz o treino", "bebi um copo de água" e resumo do dia. Uma IA (Gemini, ou Claude de reserva) lê o que as regras não entendem. Ela só recebe a mensagem e a data, e nada é salvo sem "Salvar". Há um limite de 30 leituras por pessoa por hora. Toda manhã, no horário de "Acordar", o bot manda o resumo do dia.
- **App instalável (PWA):** funciona como app no celular. Os dados privados nunca vão para o cache.
- **Conta:** login, cadastro com aprovação, verificação em duas etapas com códigos de recuperação, sessões, exportação de dados (LGPD) e exclusão da conta.

## Parte técnica

- **Stack:** JavaScript de ponta a ponta. React 19 + Vite + Tailwind 4 no front. Node.js + Express 5 + Prisma 7 + PostgreSQL no back, em camadas (rotas → forms Zod → controllers → services → DAOs).
- **Publicação:** Vercel (site e API como função, região São Paulo) + Neon (PostgreSQL). O resumo da manhã é disparado por um cron externo a cada 15 minutos.
- **Segurança, revisada em 2026-11-26** (OWASP Top 10 e auditoria de dependências, sem achado explorável):
  - cookie de sessão `__Host-` httpOnly, CSRF por origem, limite de requisições por IP e senha com argon2;
  - todo acesso por ID confere o dono do dado;
  - conta de demonstração isolada (máximo de 30 contas, 6 por IP por hora, apagada em 24 h);
  - webhook do Telegram e cron protegidos por segredo.
- **Testes:** backend com 139 testes de integração e unidade em PostgreSQL real; frontend com 28.

## Para as fotos e telas

- Use a demonstração (dados fictícios da "Marina Costa"). Nunca use a conta real.
- Bons enquadramentos: Hoje no celular (linha do tempo), Semana no computador (grade), Relatórios (nota e mapa de atrasos), a conversa com o bot e a abertura animada.
