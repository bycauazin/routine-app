# features/simulations

Aba **Simular** do Hoje (`/hoje?aba=simular`): rotinas de teste na mesma grade da Semana.

- [SimulationsView.jsx](SimulationsView.jsx): escolher/criar (cópia da atual, de outra simulação ou vazia), renomear, apagar; grade com clicar (horário vazio cria, bloco edita/duplica/tira só do dia/apaga), botão **Novo bloco** (nome, dias e horário digitados) e arrastar **só com mouse** (passo de 15 min; outro dia separa o dia arrastado). No toque o card só abre para editar e a grade rola; no celular cabem 3 dias e o deslize para em dia inteiro (classes `week-grid`/`week-scroll` em `index.css`, as mesmas da Semana); comparação de horas por categoria com a rotina atual (um bloco por categoria: horas da simulação, antes, diferença e barra das duas na mesma escala), zoom e Enquadrar da grade, aviso de blocos no mesmo horário; "Usar esta rotina a partir de…".
- Regras puras em [lib/simulation.js](../../lib/simulation.js) (teste `lib/simulation.test.js`).
- API (back `SimulationService`): `GET/POST /simulations`, `GET /simulations/current`, `GET/PATCH/DELETE /simulations/:id`, `POST /simulations/:id/apply`. Salva os blocos inteiros com PATCH meio segundo depois da última mudança.
