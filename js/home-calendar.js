import { LOCK1, RES1, LOCK2, LOCK2_PROVISOIRE, RES2, LOCKGP, TOUR1, TOUR2 } from './data.js?v=102';

export function homeCalendar(now, completed) {
  const stages = [
    { key: 'l1', title: 'Qui sera toujours là en janvier ?', lock: LOCK1, end: RES1 },
    { key: 'l2', title: 'Qui aura les 500 signatures ?', lock: LOCK2, end: RES2, provisional: LOCK2_PROVISOIRE },
    { key: 'gp', title: '1er tour : mon top 5', lock: LOCKGP, end: TOUR1 },
    { key: 'gp', title: '2e tour : ma finale', lock: LOCKGP, end: TOUR2 }
  ].map((stage, index) => ({ ...stage, number: index + 1, anchor: 'st' + (index + 1), complete: Boolean(completed[stage.key]) }));
  const current = stages.find(stage => now < +stage.end)?.number;
  const events = [
    { date: LOCK1, label: 'Qui sera toujours là en janvier ?', stage: 1, closing: true },
    { date: RES1, label: 'Résultat du pari « Qui sera là ? »', stage: 1 },
    { date: LOCK2, label: 'Clôture du pari « 500 signatures »', stage: 2, provisional: LOCK2_PROVISOIRE },
    { date: RES2, label: 'Liste officielle attendue', stage: 2 },
    { date: LOCKGP, label: 'Clôture du top 5 et de la finale', stage: 3 },
    { date: TOUR1, label: 'Premier tour', stage: 3 },
    { date: TOUR2, label: 'Second tour', stage: 4 }
  ];
  return { stages, current, next: events.find(event => now < +event.date) || null };
}
