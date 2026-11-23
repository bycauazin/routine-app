# Database — Contrato da pasta

## 1. Responsabilidade

Conexão com o PostgreSQL via Prisma.

| Arquivo | Conteúdo |
| --- | --- |
| `prisma.js` | Prisma Client (driver adapter `pg`) |
| `transaction.js` | `withTransaction(fn)`: tudo dentro de `fn(tx)` grava junto ou nada grava |

O schema e as migrations ficam em `prisma/` na raiz do routine-back (convenção do Prisma).

## 2. Migrations

- `npm run db:migrate` — cria/aplica migrations em desenvolvimento e regenera o client.
- `npm run db:deploy` — aplica migrations pendentes (produção/CI).
- Regras que o schema do Prisma não expressa (CHECK, índice parcial) ficam em migrations SQL escritas à mão, junto da migration que cria a tabela.
- Nunca editar uma migration já aplicada: criar uma nova.
