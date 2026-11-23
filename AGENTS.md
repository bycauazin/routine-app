<!-- agent-handoff:start -->
## Memória compartilhada (Claude Code ⇄ Codex)

Este projeto é trabalhado por dois agentes (Claude Code e OpenAI Codex), um continuando o trabalho do outro. A memória comum fica em `.agents/`:

- `.agents/CONTEXT.md`: o que é o projeto, tecnologias e regras. Leia antes de mexer.
- `.agents/STATE.md`: a tarefa em andamento (objetivo, status, feito, próximos passos, pendências, testes). **É a fonte da verdade para continuar.**
- `.agents/DECISIONS.md`: decisões técnicas e por quê (só acrescente).
- `.agents/journal/`: um arquivo por registro (checkpoint), com o estado do git. Nunca edite os registros do outro agente.

Ao começar: o resumo do handoff já vem no início da sessão (hook). Sem ele, rode `node C:/Users/cauas/OneDrive/Documentos/Projetos/agent-handoff/handoff.mjs resume --agent <claude|codex>`. Confira o git (`git status`, `git diff`) antes de confiar só no texto. Detalhes antigos só quando precisar: `--full`, `history`, os arquivos de `journal/`.

Durante o trabalho:
1. Ao mudar de etapa, atualize `.agents/STATE.md` (curto: objetivo, status, próximos passos).
2. Em marcos e antes de parar, registre: `node C:/Users/cauas/OneDrive/Documentos/Projetos/agent-handoff/handoff.mjs checkpoint --agent <claude|codex> --summary "o que foi feito" --next "o que falta"` (com `--decision "..."` quando decidir algo de arquitetura).
3. Rode os testes pelo registrador, para o outro agente ver o resultado: `node C:/Users/cauas/OneDrive/Documentos/Projetos/agent-handoff/handoff.mjs tests --agent <claude|codex> -- npm test`.
4. Se o resumo avisar que o outro agente está ativo, não edite os mesmos arquivos; combine com o usuário.

Nunca: commit, push, reset, checkout de arquivos ou apagar mudanças não commitadas sem o usuário pedir. Nunca grave tokens, senhas ou dados pessoais em `.agents/`.
<!-- agent-handoff:end -->
