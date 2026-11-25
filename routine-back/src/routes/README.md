# Routes — Contrato da pasta

## 1. Responsabilidade

Definição das rotas HTTP (Express Router): URL + método → cadeia de middlewares → handler do controller.

[reports.js](reports.js) expõe as rotas autenticadas de relatórios, metas e revisão de dias pendentes.

> Regra prática: Route só "conecta peças". Não implementa regra de negócio.

## 2. Contrato

- Ordem da cadeia, sempre:
    1. autenticação (`requireAuth`) — nas rotas privadas
    2. validação (`forms.<recurso>.<Ação>.validate`)
    3. controller (`XController.metodo()`)
- Caminhos vêm de `XController.routes` (constantes), não de strings soltas.
- Não acessa Service, DAO ou banco. Não processa dados.

## 3. Convenções

- Um arquivo por recurso, no plural quando fizer sentido (`days.js`, `habits.js`). Exceções: `auth.js`, `security.js`, `admin.js`.
- `index.js` monta todos os arquivos; o `app.js` aplica, antes deles, `noStore`, `csrfProtection` e `loadSession` em `/api/v1`.

| Arquivo | Recurso |
| --- | --- |
| `auth.js` | login, logout, cadastro, demonstração, sessão, perfil e senha |
| `security.js` | verificação em duas etapas, aparelhos conectados, baixar dados, excluir conta |
| `admin.js` | aprovação de cadastros (só admins) |
