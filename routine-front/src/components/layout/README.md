# Interface compartilhada

[AppLayout.jsx](AppLayout.jsx) monta a moldura autenticada com o menu definido em [navigation.js](navigation.js). O menu aponta para Hoje, Água, Relatórios e Configurações. A [API de relatórios](../../../../routine-back/__tests__/integration/reports.test.js) tem testes de integração.

[DemoButton.jsx](DemoButton.jsx) inicia a sessão fictícia a partir da [landing](../../pages/LandingPage.jsx) ou do [login](../../pages/LoginPage.jsx), usando o [fluxo de demonstração da API](../../../../routine-back/__tests__/integration/demo.test.js).
