import { LOCK1, RES1, LOCK2, LOCK2_PROVISOIRE, RES2, LOCKGP, TOUR2 } from './data.js?v=109';
export function homeCalendar(now, completed) {
  const stages = [
    { key: 'l1', title: 'Qui sera toujours là en janvier ?', lock: LOCK1, end: RES1 },
    { key: 'l2', title: 'Qui aura les 500 signatures ?', lock: LOCK2, end: RES2, provisional: LOCK2_PROVISOIRE },
    { key: 'gp', title: 'La présidentielle · Top 5 et finale', lock: LOCKGP, end: TOUR2 }
  ].map((stage, index) => ({ ...stage, number: index + 1, anchor: 'st' + (index + 1), complete: Boolean(completed[stage.key]) }));
  const action = stages.find(stage => now < +stage.lock && !stage.complete);
  return { stages, current: action?.number, next: action ? { date: action.lock, label: action.title, stage: action.number, provisional: action.provisional } : null };
}
