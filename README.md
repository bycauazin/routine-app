# Routine · bycauazin

Controle de rotina no formato da planilha da semana: blocos fixos com dia e horário (trabalho, condução, estudo,
treino), aulas com cada aluno, hábitos diários com sequência, tarefas avulsas e refeições. Todo dia vira uma lista
em ordem de horário, com um check para cada coisa feita. Irmão do Finance, com a mesma estrutura.

```
routine-app/
├── routine-back/    API — Node.js + Express + PostgreSQL (Prisma), estrutura em camadas no padrão do Desk-API
├── routine-front/   Interface — React + Vite + Tailwind (identidade "Cream Routine")
├── api/             o Express como função da Vercel
└── docs/            Arquitetura e regras de negócio
```

Tudo em **JavaScript**. Escopo e etapas: [PROMPT.md](PROMPT.md). Decisões técnicas: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requisitos

- Node.js 24+
- PostgreSQL 15+ (testado no 18)

## Como rodar (desenvolvimento)

### 1. Banco de dados

Crie um usuário próprio do app e os bancos de dev e de testes. Rode como superusuário (`postgres`) e troque a senha:

```sql
CREATE ROLE routine LOGIN PASSWORD 'troque-esta-senha' CREATEDB;
CREATE DATABASE routine OWNER routine ENCODING 'UTF8';
CREATE DATABASE routine_test OWNER routine ENCODING 'UTF8';
```

### 2. API

```bash
cd routine-back
cp .env.example .env        # preencha DATABASE_URL, TEST_DATABASE_URL e AUTH_SECRET (veja abaixo)
npm install
npm run db:deploy           # aplica as migrations
npm run user:create         # cria o primeiro usuário (admin), de forma interativa
npm run dev                 # http://localhost:3334
```

**AUTH_SECRET** é o segredo do servidor: entra no hash de cada senha e assina os tokens de sessão e
dos links por e-mail. Gere um seu (um para desenvolvimento, outro para produção) e cole no `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Não troque depois que houver contas: as senhas deixam de funcionar. Em desenvolvimento
(`MAIL_PROVIDER="console"`), os e-mails de confirmação e de nova senha aparecem no terminal do back,
com o link para abrir.

### 3. Interface

```bash
cd routine-front
npm install
npm run dev                 # http://localhost:5174
```

Abra http://localhost:5174 e entre com o usuário criado. As portas são diferentes das do Finance
(5173/3333), então os dois podem rodar ao mesmo tempo.

## Publicar (Vercel + Neon)

Site e API ficam num só projeto da Vercel, no mesmo endereço:

- `routine-front` é compilado e servido como site;
- `api/index.js` roda o mesmo Express do `routine-back` como função (`/api/*`);
- o banco é um PostgreSQL no [Neon](https://neon.tech).

A configuração está em `vercel.json`. Em produção, as variáveis ficam no painel da Vercel
(**Settings → Environment Variables**), nunca em arquivo:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | endereço **pooled** do Neon (o host tem `-pooler`) |
| `AUTH_SECRET` | um segredo **novo**, diferente do de desenvolvimento |
| `APP_ORIGIN` | o endereço do site, ex.: `https://routine-bycauazin.vercel.app` |
| `MAIL_PROVIDER`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` | iguais aos do `.env` |
| `SIGNUP_ENABLED` | `"false"` para fechar o cadastro público |

`NODE_ENV` e `TRUST_PROXY` são definidos pelo próprio `api/index.js`.

As tabelas são criadas (e atualizadas a cada migração nova) do seu computador. Guarde o endereço
**direto** do Neon (sem `-pooler`) num arquivo próprio, `routine-back/.env.production` (o Git ignora),
com uma linha só:

```
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require&channel_binding=require"
```

e rode:

```powershell
cd routine-back
npm run db:deploy:prod
```

Ele lê só esse arquivo, então o `.env` (banco local) nunca aponta para produção. Toda migração nova
vai primeiro para o Neon e só depois o código vai para o `main`.

Para levar os dados do banco local para o Neon (uma vez, com o Neon já com as tabelas e vazio):

```powershell
cd routine-back
$env:TARGET_DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"; npm run db:copy
Remove-Item Env:TARGET_DATABASE_URL
```

Tudo vai numa transação só (ou copia tudo, ou nada), e no fim ele confere a quantidade de cada tabela.
Sessões e links de e-mail não são copiados. Como o `AUTH_SECRET` de produção é outro, entre no site
publicado com "Esqueci minha senha".

Função e banco na mesma região (`gru1` = São Paulo, em `vercel.json`) deixam cada resposta rápida.

## Testes

```bash
cd routine-back
npm run test:unit           # regras de dinheiro e datas
npm run test:integration    # API + banco routine_test (isolamento, auth, CSRF…)

cd routine-front
npm test
```

## Status

| Etapa | Escopo | Situação |
|---|---|---|
| 1 | Fundação: login, cadastro, 2FA, segurança, multiusuário, demonstração, identidade visual, landing | ✅ |
| 2 | Rotina fixa + tela Hoje (MVP) | ⏳ |
| 3 | Hábitos e sequências | |
| 4 | Aulas e alunos | |
| 5 | Semana em grade + feriados e dias especiais | |
| 6 | Relatórios e nota do dia/semana | |
| 7 | PWA, demonstração completa, E2E, deploy | |
| 8 | Refeições | |
