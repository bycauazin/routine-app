# Utils — Contrato da pasta

## 1. Responsabilidade

Funções **puras** e reutilizáveis: mesma entrada → mesma saída, sem I/O, sem Express, sem banco.

| Arquivo | Conteúdo |
| --- | --- |
| `dateUtils.js` | datas civis e meses (`AAAA-MM`), "hoje" em America/Sao_Paulo, somar dias e meses sem "somar 30 dias" |
| `keepAlive.js` | mantém a conexão com o banco acordada |

## 2. Contrato

- Recebe só dados; pode lançar `Error`; não define status HTTP.
- 100% coberto por testes unitários (`__tests__/unit`).
