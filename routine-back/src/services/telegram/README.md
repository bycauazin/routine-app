# Bot do Telegram (etapa 7)

Um bot só do Routine. A pessoa liga o Telegram em Configurações → Telegram (link t.me de uso único).

- [TelegramService.js](TelegramService.js): começa aqui. Liga o chat, responde mensagens (`answer`) e botões (`callback`) e manda o resumo da manhã (`morning`). `answer` e `callback` devolvem `{ text, buttons }` sem chamar o Telegram, por isso dá para testar.
- [parser.js](parser.js): regras. Água, resumo, ajuda, `anotar …` (tarefa com dia, período e hora), `fiz …` e imprevistos (`freelance sábado 14h às 21h`, `imprevisto …`).
- [ai.js](ai.js): IA de reserva (7C), igual à do Finance. Só lê o que as regras não entenderam e recebe só a mensagem e a data de hoje. Tudo o que ela devolve é conferido em `toParsed`, e ela nunca salva sozinha. Usa Gemini com `GEMINI_API_KEY`, senão Claude com `ANTHROPIC_API_KEY`. Sem chave, fica desligada.
- [messages.js](messages.js): textos (HTML do Telegram).
- [telegramApi.js](telegramApi.js): as chamadas da API do Telegram. O token nunca vai para o log.

Rascunhos: tarefas, imprevistos e a escolha entre vários itens no `fiz` ficam em `telegram_drafts`. Os botões levam só o id (`s:`, `c:`, `o:`), e `u:<item>` desfaz um feito.

Resumo da manhã (7D): um agendador chama `GET /api/cron/morning` a cada 15 min com `Authorization: Bearer CRON_SECRET`. Cada pessoa recebe uma vez por dia (`telegram_links.morning_sent_on`), a partir do horário do Acordar daquele dia (7h quando não há Acordar). A mensagem traz o que ficou sem fazer ontem e as tarefas atrasadas.

Rodar: no computador, `npm run telegram:poll`. Em produção, `npm run telegram:setup -- https://seu-dominio` (webhook).

Testes: [unit/telegram.test.js](../../../__tests__/unit/telegram.test.js) e [integration/telegram-bot.test.js](../../../__tests__/integration/telegram-bot.test.js).
