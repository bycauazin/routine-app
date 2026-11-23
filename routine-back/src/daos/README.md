# DAOs — Contrato da pasta

## 1. Responsabilidade

Camada de acesso a dados (Prisma). **Toda** leitura e escrita no banco passa por um DAO.

## 2. Contrato

- Recebe parâmetros de domínio e `options = { tx }` opcional (transação aberta pelo Service).
- Nunca recebe `req`, `res` ou `next`. Não tem regra de negócio, não decide status HTTP.
- **Isolamento entre usuários:** todo método de tabela do usuário recebe `userId` e filtra por ele. Updates e deletes usam a chave composta `(id, userId)`, então o próprio WHERE garante a posse.

## 3. Convenções

- Arquivo `XyzDao.js`, exporta instância.
- Tabelas do usuário estendem `BaseDao` (`findOwned`, `findAllOwned`, `countOwned`, `create`, `updateOwned`, `deleteOwned`, `...ManyOwned`).
- `UserDao`, `SessionDao` e `LoginAttemptDao` não estendem `BaseDao` (não são "do usuário").

| DAO | Tabela |
| --- | --- |
| `UserDao`, `SessionDao`, `LoginAttemptDao`, `AuthTokenDao`, `RecoveryCodeDao` | autenticação |
| `RequestCounterDao` | limite geral de requisições por IP |
| `AuditLogDao` | trilha de auditoria |
| `UserDataDao` | "Baixar meus dados" (LGPD): toda tabela nova do usuário entra aqui |

As tabelas da rotina (regras fixas, ocorrências do dia, hábitos, alunos…) entram a partir da etapa 2.
