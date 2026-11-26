# Interface compartilhada

[AppLayout.jsx](AppLayout.jsx) monta a moldura autenticada com o menu definido em [navigation.js](navigation.js). O menu aponta para Hoje, Água, Relatórios e Configurações. A [API de relatórios](../../../../routine-back/__tests__/integration/reports.test.js) tem testes de integração.

[DemoButton.jsx](DemoButton.jsx) inicia a sessão fictícia a partir da [landing](../../pages/LandingPage.jsx) ou do [login](../../pages/LoginPage.jsx), usando o [fluxo de demonstração da API](../../../../routine-back/__tests__/integration/demo.test.js).

## Barra lateral de seções

[SectionRail](../ui/SectionRail.jsx) é a coluna de ícones fixa à direita, com um ícone por seção da página. Ela segue a barra do portfólio. O [AppLayout](AppLayout.jsx) a monta em todas as telas logadas, com `rootRef` no `<main>`, e a [landing](../../pages/LandingPage.jsx) a monta com `fitRef` na coluna de 1180px. A tela de login e as outras telas de conta não têm a barra.

- **Paradas:** os blocos com `data-rail="Nome"` (e `data-rail-icon` opcional), ou o helper `RailSection`. Quando a página não marca nada, entram as seções e cartões de primeiro nível que têm um título h2 ou h3. O ícone sai de uma palavra-chave do nome (`layers` quando nada combina).
- **Quando aparece:** com pelo menos 88px livres entre a borda do conteúdo (descontando o padding) e a da janela, altura de 520px ou mais e 2 seções ou mais. Ela se atualiza ao trocar de rota e quando o conteúdo muda (MutationObserver).
- **Animações:** ficam em `index.css` (`.section-rail*`) e são desligadas com `prefers-reduced-motion`.
