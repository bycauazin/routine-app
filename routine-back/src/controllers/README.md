# Controllers — Contrato da pasta

## 1. Responsabilidade

Apenas handlers HTTP: traduzem Request → Service → Response. Controllers são **finos**.

[ReportController.js](ReportController.js) atende as consultas, as metas e a revisão histórica.

> Regra prática: se a função faz sentido num script ou job sem Express, ela não pertence ao controller.

## 2. Contrato

- **Entrada:** lê sempre de `req.validated.{params|query|body}` (preenchido pelo Form) e o usuário de `req.auth` (via `this.userId(req)`).
- **Saída:** `{ meta: { success: true, ...meta }, data }` usando `this.ok`, `this.created` ou `this.noContent`.
- **Erros:** não usa try/catch. O Express 5 encaminha promises rejeitadas ao `errorHandler`.
- Chama **um** método de Service por endpoint.

**Não pode:** acessar DAOs/Prisma, montar regras de negócio, usar `console.*`, logar `req.body`.

## 3. Convenções

- Arquivo `XyzController.js`, classe que estende `BaseController` e exporta uma instância (`export default new XyzController()`).
- Getter `routes` com os caminhos usados pelo arquivo de rota.
- Cada método retorna o handler: `list() { return async (req, res) => { ... } }`.
