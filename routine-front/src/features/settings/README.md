# Configurações

[SettingsLayout.jsx](SettingsLayout.jsx) reúne as configurações. [RoutineSettings.jsx](RoutineSettings.jsx) gerencia os fixos e exporta o formulário usado também no [Dia e na Semana](../today/README.md) para criar listas vinculadas. [CategoriesSettings.jsx](CategoriesSettings.jsx) gerencia as categorias.

O contrato de listas da rotina é exercitado em [day-week.test.js](../../../../routine-back/__tests__/integration/day-week.test.js).

- [TelegramSettings.jsx](TelegramSettings.jsx): conectar o bot do Telegram (link único do `@BotFather` bot), ver o chat ligado, desconectar. API: `GET /telegram`, `POST|DELETE /telegram/link`.
