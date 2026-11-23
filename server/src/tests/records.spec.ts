import { describe, it, expect } from 'vitest';
import { computeRecords, WorkoutIn } from '../progress/engine';

const entreno = (id: string, fecha: string, ejercicios: [string, string, [number, number][]][]): WorkoutIn => ({
  id,
  startedAt: new Date(new Date(fecha).getTime() - 3600000),
  finishedAt: new Date(fecha),
  exercises: ejercicios.map(([eid, name, sets]) => ({
    id: eid,
    name,
    bodyPart: 'Chest',
    sets: sets.map(([weightKg, reps]) => ({ weightKg, reps })),
  })),
});

describe('Récords personales (computeRecords)', () => {
  const records = computeRecords([
    entreno('1', '2026-11-01T10:00:00Z', [['banca', 'Press de banca', [[80, 5], [80, 5]]], ['dom', 'Dominadas', [[0, 10]]]]),
    entreno('2', '2026-11-10T10:00:00Z', [['banca', 'Press de banca', [[85, 3], [70, 12]]], ['dom', 'Dominadas', [[0, 12]]]]),
    entreno('3', '2026-11-20T10:00:00Z', [['banca', 'Press de banca', [[85, 3]]]]),
  ]);
  const banca = records.find((r) => r.id === 'banca')!;
  const dominadas = records.find((r) => r.id === 'dom')!;

  it('Guarda el peso máximo y la primera vez que se consiguió', () => {
    expect(banca.pesoMaximo).toMatchObject({ kg: 85, reps: 3 });
    expect(banca.pesoMaximo!.fecha.toISOString()).toBe('2026-11-10T10:00:00.000Z');
  });

  it('Calcula el mejor 1RM estimado con Epley (solo series de hasta 10 reps)', () => {
    expect(banca.mejor1RM).toMatchObject({ kg: 85, reps: 3, e1rm: 93.5 });
  });

  it('Guarda la serie con más repeticiones y la sesión con más volumen', () => {
    expect(banca.masReps).toMatchObject({ kg: 70, reps: 12 });
    expect(banca.mejorSesion!.volumen).toBe(85 * 3 + 70 * 12);
    expect(banca.sesiones).toBe(3);
  });

  it('En ejercicios sin peso solo hay récord de repeticiones', () => {
    expect(dominadas.pesoMaximo).toBeNull();
    expect(dominadas.mejor1RM).toBeNull();
    expect(dominadas.masReps!.reps).toBe(12);
  });

  it('Ordena por el ejercicio hecho más recientemente', () => {
    expect(records.map((r) => r.id)).toEqual(['banca', 'dom']);
  });
});
