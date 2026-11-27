# Dia e Semana

[TodayPage.jsx](TodayPage.jsx) alterna entre o [Dia](DayView.jsx) e a [Semana](WeekView.jsx). [ItemDialogs.jsx](ItemDialogs.jsx) edita blocos, seus afazeres e as listas vinculadas, e registra imprevistos (`UnplannedDialog`: horário e o que ele tirou do lugar). [DayItemRow.jsx](DayItemRow.jsx) abre e fecha os afazeres sem mudar seu status.

Uma lista vinculada usa os mesmos afazeres em todos os blocos do dia. Os testes do contrato estão em [day-week.test.js](../../../../routine-back/__tests__/integration/day-week.test.js).

Na [Semana](WeekView.jsx) e na Simular, um item de período (Manhã 06–12, Tarde 12–18, Noite 18–24) é uma faixa do período inteiro ([PeriodBand.jsx](PeriodBand.jsx)) atrás dos cards com horário, que ficam um pouco recuados para a faixa aparecer. O cálculo (`periodBands`, `bandInset`) fica em [lib/agenda.js](../../lib/agenda.js), com teste em `agenda.test.js`.

Zoom das grades (Semana e Simular): [ZoomControls.jsx](ZoomControls.jsx) com −, + e **Enquadrar** (do primeiro ao último horário da semana, `gridRange` em [lib/agenda.js](../../lib/agenda.js)). A altura da hora fica em [lib/use-grid-zoom.js](../../lib/use-grid-zoom.js), guardada no navegador e compartilhada pelas duas grades.

Horas por categoria: [CategoryHours.jsx](CategoryHours.jsx) (blocos com horas, nota, etiqueta e barra), usado embaixo da Semana (planejado × feito, `weekHours`) e no Comparar da Simular. Com zoom pequeno, os cards curtos ganham altura mínima de uma linha (`minCardMinutes`) e ficam lado a lado em vez de um por cima do outro.
