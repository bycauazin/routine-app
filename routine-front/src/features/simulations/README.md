# features/simulations

Aba **Simular** do Hoje (`/hoje?aba=simular`): rotinas de teste na mesma grade da Semana.

- [SimulationsView.jsx](SimulationsView.jsx): escolher/criar (cópia da atual, de outra simulação ou vazia), renomear, apagar; grade com clicar (horário vazio cria, bloco edita/duplica/tira só do dia/apaga) e arrastar (passo de 15 min; outro dia separa o dia arrastado); comparação de horas por categoria com a rotina atual, aviso de blocos no mesmo horário; "Usar esta rotina a partir de…".
- Regras puras em [lib/simulation.js](../../lib/simulation.js) (teste `lib/simulation.test.js`).
- API (back `SimulationService`): `GET/POST /simulations`, `GET /simulations/current`, `GET/PATCH/DELETE /simulations/:id`, `POST /simulations/:id/apply`. Salva os blocos inteiros com PATCH meio segundo depois da última mudança.
