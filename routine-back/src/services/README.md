# Services — Contrato da pasta

## 1. Responsabilidade

Regras de negócio e orquestração dos casos de uso: o "como" e o "quando" da rotina.

> Regra prática: se a lógica faz sentido fora do HTTP, ela pertence a Services.

## 2. Contrato

- **Entrada:** dados já validados. Nunca recebe `req`, `res` ou `next`.
- **Saída:** dados puros (DTOs). Não formata resposta HTTP.
- **Erros:** lança erros de domínio de `src/shared/errors.js` (`NotFoundError`, `ConflictError`, `ValidationError`, `StatusError`).
- **Banco:** só via DAOs. Operações que mexem em mais de uma tabela rodam em `withTransaction` (`src/database/transaction.js`), passando `{ tx }` a cada DAO.
- **Logs:** apenas `logger.js`, só metadados (ids, contagens), nunca valores digitados ou senhas.

## 3. Convenções

- Arquivo `XyzService.js`, classe exportada como instância (`export default new XyzService()`).
- `security/`: senha (Argon2id) e sessões.

| Service | Domínio |
| --- | --- |
| `AuthService` | login com rate limit, perfil, troca de senha |
| `UserService` | criação de usuário (script `user:create`, cadastro, demonstração) |
| `AccountSecurityService` | 2FA, aparelhos conectados, baixar dados, excluir conta |
| `AdminService` | aprovação de cadastros |
| `DemoService` | contas de demonstração (pessoa fictícia, uma por visitante) |
| [`DayService`](DayService.js) | materialização do Dia e da Semana, afazeres e listas vinculadas por data |
| [`GoalService`](GoalService.js) | metas pessoais e alvos da própria conta |
| [`ReportService`](ReportService.js) | apuração por período, sequências e dias pendentes |
| `AuditService` | trilha de auditoria |
| `logger` | log estruturado (o único lugar que escreve no console) |

Os cenários de Dia e Semana estão em [day-week.test.js](../../__tests__/integration/day-week.test.js).
