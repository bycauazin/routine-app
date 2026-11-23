# Forms — Contrato da pasta

## 1. Responsabilidade

Validação e normalização da entrada de cada rota.

> Regra prática: controllers consomem `req.validated`, nunca `req.body`.

## 2. Contrato

- Cada arquivo exporta uma classe que estende `BaseForm` e implementa `static get schemas()` com schemas Zod para `{ params?, query?, body? }`.
- A rota encadeia `Form.validate`, que preenche `req.validated`.
- Falha em `query`/`body` → 422 com `fields` (mensagem por campo, em pt-BR). Falha em `params` (id ou mês da URL) → 404.
- Não acessa banco, DAOs ou Services.

## 3. Convenções

- `src/forms/{recurso}/{Ação}.js` (`auth/Login.js`, `security/Code.js`).
- `shared/schemas.js`: campos reutilizados (data civil, mês, cor, ícone, nome, e-mail, senha).
- `shared/ById.js`: rotas que só recebem `:id`.
- `index.js` agrega tudo com imports explícitos (sem auto-import pelo disco).
- Datas chegam como `AAAA-MM-DD`, meses como `AAAA-MM` e horários do dia em **minutos desde 00:00** (inteiro, 0–1440).
