# Shared — Contrato da pasta

## 1. Responsabilidade

Itens estáveis usados por várias camadas.

| Arquivo | Conteúdo |
| --- | --- |
| `errors.js` | `AppError` e derivados (`NotFoundError`, `ConflictError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `RateLimitError`, `StatusError`) e detectores de erro do Prisma |
| `constants.js` | constantes de domínio: sessões, demonstração, limites de login, de e-mail e de cadastro |

## 2. Contrato

- Zero dependências de `controllers/`, `services/`, `daos/`.
- Não lê `process.env` (configuração fica em `src/config/`).
