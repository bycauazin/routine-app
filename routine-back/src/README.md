# Código da API

[app.js](app.js) monta o Express. Siga o [fluxo das camadas](../README.md#fluxo-de-uma-requisição) a partir de `routes` até os [services](services/README.md) e os DAOs. Os testes ficam em [`__tests__`](../__tests__/README.md).

O acompanhamento da rotina começa em [routes/reports.js](routes/reports.js), que liga o controller aos serviços de metas e relatórios.
