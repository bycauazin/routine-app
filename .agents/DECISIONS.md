# routine-app · decisões técnicas

<!-- Uma entrada por decisão: o que foi decidido e por quê. Só acrescente; não reescreva entradas antigas. -->

### 2026-11-23 07:31 · claude
Abertura da landing: Céu do dia (sky-day.jsx) numa janela à direita; Planilha viva fica no contato e nas telas de entrar/criar conta; commits só quando o usuário pedir (AGENTS.md)

### 2026-11-23 13:53 · claude
day_items com origin_date (dia da regra) separado de date (dia atual, muda ao remarcar); único (rule_id, origin_date). Água na etapa 3 com water_settings e water_logs

### 2026-11-23 14:11 · claude
Só tarefa avulsa vira atrasada; tarefa fixa não feita fica 'não feita' no dia dela. Nomes de tipos centralizados em routine-front/src/lib/kinds.js

### 2026-11-23 14:18 · claude
Textos de explicação ficam escondidos atrás de um botão (?) (HelpButton/HelpPanel), como no Finance, para a tela ficar limpa. Nenhum botão com '+' no nome

### 2026-11-24 14:35 · claude
Nova ordem das etapas 3-9 (ver PROMPT.md > Etapas); avisos via bot do Telegram em vez de notificação do PWA

### 2026-11-24 15:00 · claude
Hábitos viraram afazeres de um Bloco da rotina (HABIT sem uso); dias presenciais guardados com data de início (office_days) para o passado não mudar; semana de segunda a domingo; períodos 06-12/12-18/18-24

### 2026-11-24 22:26 · claude
Presencial/home saiu do produto a pedido do usuário (2026-11-24): itens que só valem em certos dias usam os dias da semana da regra. Back mantém o mecanismo inerte até uma limpeza com migração.

### 2026-11-24 22:41 · claude
Ícone do item: null = automático (sugerido pelo nome, senão o da categoria, senão o do tipo), calculado no front; só grava quando o usuário escolhe.

### 2026-11-24 23:01 · claude
Afazeres 'daqui pra frente' pelo Dia: primeiro PUT nos afazeres do item do dia (preserva marcados), depois PATCH na regra com as mesmas chaves a partir do dia.

### 2026-11-24 23:09 · claude
Lista não é entidade nova: é uma regra com afazeres e inside_rule_ids; o cartão do bloco só mostra os afazeres do item da lista daquele dia, então não há sincronização.

### 2026-11-25 00:23 · claude
Mudar só alguns dias de um fixo divide a regra: a original fica com os outros dias (daqui pra frente) e nasce outra com os dias escolhidos; listas que apareciam dentro da original passam a aparecer nas duas.

### 2026-11-25 01:59 · codex
Metas de fixos usam uma série estável nas regras e ocorrências. Na revisão, Não feito mantém o status pendente e registra reviewed_at. Remarcações guardam a primeira agenda, usada no mapa.

### 2026-11-25 10:33 · claude
Bot: webhook em produção e getUpdates (npm run telegram:poll) no PC, porque localmente não há URL pública.

### 2026-11-25 10:37 · claude
Simulação guarda blocos em JSON (sem datas, sem materializar): não afeta dias, relatórios nem sequências até ser aplicada; aplicar = tirar fixos daqui pra frente e criar os blocos como fixos novos.

### 2026-11-25 11:03 · claude
Etapa 9 (Refeições) cancelada a pedido do usuário: controle demais agora.

### 2026-11-25 11:11 · claude
Dias especiais reaproveitam rule.skipOnHolidays como 'pula em dias especiais'; feriados não vêm prontos (o usuário marca).

### 2026-11-25 11:50 · claude
Imprevisto não entra na nota; o que ele tirou entra (sem desculpa), com o motivo à vista. Vitest no Windows: usar caminho C: maiúsculo.
