# features/water

Tela **Água** (etapa 4), na rota `/agua` (`?dia=AAAA-MM-DD` para outro dia).

- [WaterPage.jsx](WaterPage.jsx): total do dia contra a meta, campo "Quanto você bebeu?" (só número, em ml), lista de registros com hora (apagar ou desfazer o último), sequência de dias batendo a meta e edição da meta.
- Formato "1,2 L" / "800 ml": [lib/water.js](../../lib/water.js) (teste em `lib/water.test.js`).
- API: `GET /water/:date`, `POST /water`, `DELETE /water/last`, `DELETE /water/logs/:id`, `PATCH /water/goal` (back: `WaterService`). O Dia recebe `water: { totalMl, goalMl }` e mostra a linha que leva para cá.
