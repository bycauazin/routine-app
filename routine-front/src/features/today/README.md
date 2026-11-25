# Dia e Semana

[TodayPage.jsx](TodayPage.jsx) alterna entre o [Dia](DayView.jsx) e a [Semana](WeekView.jsx). [ItemDialogs.jsx](ItemDialogs.jsx) edita blocos, seus afazeres e as listas vinculadas, e registra imprevistos (`UnplannedDialog`: horário e o que ele tirou do lugar). [DayItemRow.jsx](DayItemRow.jsx) abre e fecha os afazeres sem mudar seu status.

Uma lista vinculada usa os mesmos afazeres em todos os blocos do dia. Os testes do contrato estão em [day-week.test.js](../../../../routine-back/__tests__/integration/day-week.test.js).
