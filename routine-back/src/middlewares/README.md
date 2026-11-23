# Middlewares — Contrato da pasta

## 1. Responsabilidade

Infra de request: autenticação, CSRF, cache e tratamento de erros.

| Arquivo | Função |
| --- | --- |
| `auth.js` | `loadSession` (lê o cookie e valida a sessão no banco → `req.auth`) e `requireAuth` (401 sem sessão) |
| `csrf.js` | métodos que alteram dados exigem `Origin` = `APP_ORIGIN` e corpo JSON |
| `noStore.js` | `Cache-Control: no-store` em toda resposta da API |
| `errorHandler.js` | 404 de rota e handler global: `{ meta: { success: false }, code, message, fields? }` |

## 2. Contrato

- Assinatura `(req, res, next)`; em falha, sempre `next(err)`.
- Pode anexar contexto seguro em `req` (`req.auth`, `req.validated`). Não muta `req.body`.
- Nunca loga o corpo da requisição.
