# routine-back

API REST do Routine — Node.js 24, Express 5, Prisma 7, PostgreSQL. JavaScript (ES Modules).

A estrutura segue o padrão em camadas do Desk-API: **routes → forms → controllers → services → daos**, com `utils`, `shared` e `middlewares` separados. Cada pasta tem um README com o contrato dela.

## Fluxo de uma requisição

```
PATCH /api/v1/me
  │
  ├─ app.js            noStore → apiRateLimit → csrfProtection → loadSession
  ├─ routes/auth.js    requireAuth → forms.auth.UpdateProfile.validate → AuthController.updateProfile()
  ├─ forms/            valida params/body (Zod) → req.validated
  ├─ controllers/      lê req.validated, chama 1 service, responde { meta: { success: true }, data }
  ├─ services/         regra de negócio, transação (withTransaction)
  └─ daos/             Prisma, sempre filtrando pelo dono (userId)
```

Erros: `{ meta: { success: false }, code, message, fields? }`. `fields` traz a mensagem de cada campo inválido.

## Pastas

| Pasta | Responsabilidade |
| --- | --- |
| `server.js` | sobe o servidor (entrypoint) |
| `src/app.js` | monta o Express (usado pelos testes sem `listen`) |
| `src/config/` | variáveis de ambiente validadas e opções do cookie de sessão |
| `src/routes/` | URL → auth → Form → Controller |
| `src/forms/` | validação de entrada (`req.validated`) |
| `src/controllers/` | handlers HTTP finos |
| `src/services/` | regras de negócio, transações, logger |
| `src/daos/` | todo acesso ao banco |
| `src/database/` | Prisma Client e `withTransaction` |
| `src/middlewares/` | sessão, limite de requisições, CSRF, cache, erros |
| `src/utils/` | funções puras (datas, e as regras da rotina a partir da etapa 2) |
| `src/shared/` | erros e constantes de domínio |
| `prisma/` | schema e migrations |
| `scripts/` | criar usuário, e-mail de teste, copiar dados, desligar 2FA |
| `__tests__/` | unitários e de integração (Vitest + Supertest) |

## Módulos

| Prefixo | Recurso |
| --- | --- |
| `/api/v1/auth`, `/api/v1/me` | login (com verificação em duas etapas), logout, sessão, `POST /auth/demo` (demonstração, pública), criar conta, confirmar e-mail, esqueci a senha, trocar e-mail, perfil, senha |
| `/api/v1/me/sessions`, `/api/v1/me/two-factor`, `/api/v1/me/export`, `DELETE /api/v1/me` | segurança: aparelhos conectados, verificação em duas etapas e códigos de recuperação, baixar meus dados, excluir conta |
| `/api/v1/admin/users` | só admins: lista as contas, libera (`POST /:id/approve`) e exclui (`DELETE /:id`) |

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor com reload (porta 3334, para rodar junto com o Finance na 3333) |
| `npm start` | servidor (produção) |
| `npm run db:migrate` | cria/aplica migrations e regenera o Prisma Client |
| `npm run db:deploy` | aplica migrations pendentes (banco do `.env`) |
| `npm run db:deploy:prod` | aplica migrations pendentes no banco de produção, lendo **só** `.env.production` (ignorado pelo Git) |
| `npm run db:status:prod` | só leitura: mostra migração com falha (e o erro) e o que existe no banco de produção |
| `npm run user:create` | cria um usuário já confirmado (senha digitada, nunca no repositório) |
| `npm run mail:test -- email@exemplo.com` | manda um e-mail de teste com a configuração do `.env` |
| `npm run user:disable-2fa -- email@exemplo.com` | emergência: desliga a verificação em duas etapas de uma conta (celular e códigos perdidos) |
| `npm test` | todos os testes (no Windows, rode a partir de `C:\…` com C maiúsculo) |
| `npm run test:unit` / `test:integration` | só uma parte |

Configuração: copie `.env.example` para `.env`. Regras de negócio e decisões: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).
