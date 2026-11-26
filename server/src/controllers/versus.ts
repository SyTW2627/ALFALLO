import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user';
import { Workout, WorkoutStatus } from '../models/workout';
import { IVersus, Versus } from '../models/versus';
import { BodyWeightIn, WorkoutIn, computeRanks } from '../progress/engine';
import { LIFTS, LIFT_KEYS, LiftKey, Sex } from '../progress/standards';
import { DIAS_REFERENCIA, DURACIONES_DIAS, MODALIDADES, Modalidad, ganadorDe, mejorMarcaEnDuelo } from '../versus/engine';
import { toEngineWorkouts } from './progress';
import { responderError } from '../utils/errores';
import { avisarVersusRecibido, avisarVersusRespuesta, avisarVersusTerminado } from '../notifications/personal';

const DAY = 24 * 60 * 60 * 1000;
// Duelos abiertos (pendientes o en curso) como máximo por usuario: evita el spam de retos.
const MAX_ABIERTOS = 10;
// Los rechazados y cancelados se siguen viendo unos días; los terminados, los últimos 20.
const DIAS_CERRADOS_VISIBLES = 7;
const MAX_TERMINADOS = 20;

const etiquetaDe = (d: Pick<IVersus, 'ejercicio' | 'dias' | 'modalidad'>) =>
  `${LIFTS[d.ejercicio].label} · ${d.dias} días · ${d.modalidad === 'kg' ? 'por kilos' : 'por fuerza relativa'}`;

const aviso = (d: IVersus) => ({ _id: d._id as Types.ObjectId, retador: d.retador, rival: d.rival, etiqueta: etiquetaDe(d), mensaje: d.mensaje });

/* ---------- Datos de los participantes ---------- */

interface Participante {
  nombre: string;
  sex: Sex;
  bodyWeights: BodyWeightIn[];
  workouts: WorkoutIn[];
}

// Carga nombre, peso corporal y entrenamientos terminados desde `desde` de varios usuarios a la vez.
async function cargarParticipantes(ids: string[], desde?: Date) {
  const unicos = [...new Set(ids)];
  const filtro: Record<string, unknown> = { user: { $in: unicos }, status: WorkoutStatus.FINISHED };
  if (desde) filtro.finishedAt = { $gte: desde };

  const [usuarios, docs] = await Promise.all([
    User.find({ _id: { $in: unicos } }).select('name sex bodyWeights').lean(),
    Workout.find(filtro).populate('exercises.exercise', 'name bodyPart rankingKey').sort({ finishedAt: 1 }).lean(),
  ]);

  const mapa = new Map<string, Participante>();
  for (const u of usuarios) {
    mapa.set(String(u._id), {
      nombre: String(u.name ?? 'Usuario'),
      sex: (u.sex ?? 'unspecified') as Sex,
      bodyWeights: (u.bodyWeights ?? []).map((b) => ({ kg: b.kg, date: new Date(b.date) })),
      workouts: [],
    });
  }
  const duenoDe = new Map(docs.map((d) => [String(d._id), String(d.user)]));
  for (const w of toEngineWorkouts(docs)) mapa.get(duenoDe.get(w.id)!)?.workouts.push(w);
  return mapa;
}

const sinDatos = (): Participante => ({ nombre: 'Cuenta eliminada', sex: 'unspecified', bodyWeights: [], workouts: [] });

function marcadorDe(d: IVersus, datos: Map<string, Participante>, hasta: Date) {
  const calcular = (id: Types.ObjectId) => {
    const p = datos.get(String(id)) ?? sinDatos();
    return mejorMarcaEnDuelo(p.workouts, p.bodyWeights, d.ejercicio, d.modalidad, d.inicio!, hasta);
  };
  const retador = calcular(d.retador);
  const rival = calcular(d.rival);
  return { retador, rival, ganador: ganadorDe(retador, rival, d.modalidad) };
}

// Los duelos en curso cuya fecha de fin ya pasó se cierran: se guarda el resultado y se avisa a los dos.
async function cerrarTerminados(duelos: IVersus[], datos: Map<string, Participante>, ahora: Date) {
  for (const d of duelos) {
    if (d.estado !== 'activo' || !d.fin || d.fin > ahora) continue;
    // Solo uno de los dos (si piden la lista a la vez) consigue cerrarlo y enviar los avisos.
    const resultado = marcadorDe(d, datos, d.fin);
    const cerrado = await Versus.findOneAndUpdate(
      { _id: d._id, estado: 'activo' },
      { $set: { estado: 'terminado', resultado } },
      { new: true }
    );
    d.estado = 'terminado';
    d.resultado = resultado;
    if (cerrado) await avisarVersusTerminado(aviso(d), resultado.ganador);
  }
}

function serializar(d: IVersus, me: string, datos: Map<string, Participante>, ahora: Date) {
  const persona = (id: Types.ObjectId) => ({ id: String(id), nombre: (datos.get(String(id)) ?? sinDatos()).nombre });
  const soyRetador = String(d.retador) === me;

  let marcador = null;
  if (d.estado === 'terminado' && d.resultado) marcador = d.resultado;
  else if (d.estado === 'activo') marcador = marcadorDe(d, datos, ahora);

  return {
    id: String(d._id),
    retador: persona(d.retador),
    rival: persona(d.rival),
    soyRetador,
    ejercicio: { key: d.ejercicio, label: LIFTS[d.ejercicio].label },
    modalidad: d.modalidad,
    dias: d.dias,
    mensaje: d.mensaje ?? '',
    estado: d.estado,
    inicio: d.inicio ?? null,
    fin: d.fin ?? null,
    creadoEn: d.createdAt,
    marcador,
  };
}

/* ---------- Endpoints ---------- */

// GET /api/versus - Mis duelos (pendientes, en curso y recientes) y la gente a la que puedo retar
export const listVersus = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const ahora = new Date();
    const yo = await User.findById(me).select('following bodyWeights').lean();
    if (!yo) return res.status(404).json({ message: 'Usuario no encontrado' });

    const mios = { $or: [{ retador: me }, { rival: me }] };
    const [abiertos, terminados, cerrados, seguidores] = await Promise.all([
      Versus.find({ ...mios, estado: { $in: ['pendiente', 'activo'] } }).sort({ createdAt: -1 }),
      Versus.find({ ...mios, estado: 'terminado' }).sort({ fin: -1 }).limit(MAX_TERMINADOS),
      Versus.find({
        ...mios,
        estado: { $in: ['rechazado', 'cancelado'] },
        updatedAt: { $gte: new Date(ahora.getTime() - DIAS_CERRADOS_VISIBLES * DAY) },
      }).sort({ updatedAt: -1 }),
      User.find({ following: me }).select('_id').lean(),
    ]);
    const duelos = [...abiertos, ...terminados, ...cerrados];

    const seguidos = (yo.following ?? []).map(String);
    const ids = [me, ...seguidos, ...duelos.flatMap((d) => [String(d.retador), String(d.rival)])];
    const inicios = duelos.filter((d) => d.estado === 'activo' && d.inicio).map((d) => d.inicio!.getTime());
    // Solo hacen falta entrenamientos de los duelos en curso (y su periodo de referencia anterior).
    const desde = inicios.length ? new Date(Math.min(...inicios) - DIAS_REFERENCIA * DAY) : ahora;
    const datos = await cargarParticipantes(ids, desde);

    await cerrarTerminados(abiertos, datos, ahora);

    const meSiguen = new Set(seguidores.map((s) => String(s._id)));
    const amigos = seguidos
      .filter((id) => datos.has(id))
      .map((id) => ({ id, nombre: datos.get(id)!.nombre, mutuo: meSiguen.has(id) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return res.status(200).json({
      tengoPeso: (yo.bodyWeights ?? []).length > 0,
      ejercicios: LIFT_KEYS.map((key) => ({ key, label: LIFTS[key].label })),
      duraciones: DURACIONES_DIAS,
      amigos,
      duelos: duelos.map((d) => serializar(d, me, datos, ahora)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener tus versus', error });
  }
};

// POST /api/versus - Retar a alguien a quien sigues
export const createVersus = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const { rival, ejercicio, modalidad = 'kg', dias = 7, mensaje } = req.body ?? {};

    if (typeof rival !== 'string' || !Types.ObjectId.isValid(rival)) {
      return res.status(400).json({ message: 'Elige a quién quieres retar' });
    }
    if (rival === me) return res.status(400).json({ message: 'No puedes retarte a ti mismo' });
    if (!(LIFT_KEYS as readonly string[]).includes(ejercicio)) {
      return res.status(400).json({ message: 'Elige un ejercicio' });
    }
    if (!(MODALIDADES as readonly string[]).includes(modalidad)) {
      return res.status(400).json({ message: 'Modalidad no válida' });
    }
    if (mensaje !== undefined && typeof mensaje !== 'string') {
      return res.status(400).json({ message: 'El mensaje debe ser un texto' });
    }

    const [yo, otro] = await Promise.all([
      User.findById(me).select('following bodyWeights').lean(),
      User.findById(rival).select('_id').lean(),
    ]);
    if (!yo) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!otro) return res.status(404).json({ message: 'Ese usuario no existe' });
    if (!(yo.following ?? []).some((id) => String(id) === rival)) {
      return res.status(403).json({ message: 'Solo puedes retar a gente a la que sigues', code: 'NOT_FOLLOWING' });
    }
    if (modalidad === 'relativa' && !(yo.bodyWeights ?? []).length) {
      return res.status(400).json({ message: 'Para competir por fuerza relativa registra antes tu peso corporal', code: 'NO_BODYWEIGHT' });
    }

    const abiertosMios = await Versus.countDocuments({ $or: [{ retador: me }, { rival: me }], estado: { $in: ['pendiente', 'activo'] } });
    if (abiertosMios >= MAX_ABIERTOS) {
      return res.status(409).json({ message: `Ya tienes ${MAX_ABIERTOS} versus abiertos. Termina alguno antes de lanzar otro.` });
    }
    const repetido = await Versus.exists({
      ejercicio,
      estado: { $in: ['pendiente', 'activo'] },
      $or: [
        { retador: me, rival },
        { retador: rival, rival: me },
      ],
    });
    if (repetido) {
      return res.status(409).json({ message: 'Ya tenéis un versus abierto en ese ejercicio' });
    }

    const duelo = new Versus({ retador: me, rival, ejercicio, modalidad, dias: Number(dias), mensaje: mensaje?.trim() || undefined });
    await duelo.save();
    await avisarVersusRecibido(aviso(duelo));

    const datos = await cargarParticipantes([me, rival], new Date());
    return res.status(201).json(serializar(duelo, me, datos, new Date()));
  } catch (error) {
    return responderError(res, error, 'Error al crear el versus');
  }
};

async function buscarDuelo(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Id de versus no válido' });
    return null;
  }
  const me = req.user!.id;
  const duelo = await Versus.findOne({ _id: id, $or: [{ retador: me }, { rival: me }] });
  if (!duelo) {
    res.status(404).json({ message: 'Versus no encontrado' });
    return null;
  }
  return duelo;
}

async function responderConDuelo(res: Response, duelo: IVersus, me: string) {
  const ahora = new Date();
  const desde = duelo.inicio ? new Date(duelo.inicio.getTime() - DIAS_REFERENCIA * DAY) : ahora;
  const datos = await cargarParticipantes([String(duelo.retador), String(duelo.rival)], desde);
  return res.status(200).json(serializar(duelo, me, datos, ahora));
}

// POST /api/versus/:id/accept - El rival acepta: empieza la cuenta atrás
export const acceptVersus = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const duelo = await buscarDuelo(req, res);
    if (!duelo) return;
    if (String(duelo.rival) !== me) return res.status(403).json({ message: 'Solo la persona retada puede aceptar el versus' });
    if (duelo.estado !== 'pendiente') return res.status(409).json({ message: 'Este versus ya no está pendiente' });

    if (duelo.modalidad === 'relativa') {
      const yo = await User.findById(me).select('bodyWeights').lean();
      if (!(yo?.bodyWeights ?? []).length) {
        return res.status(400).json({ message: 'Para competir por fuerza relativa registra antes tu peso corporal', code: 'NO_BODYWEIGHT' });
      }
    }

    const inicio = new Date();
    duelo.estado = 'activo';
    duelo.inicio = inicio;
    duelo.fin = new Date(inicio.getTime() + duelo.dias * DAY);
    await duelo.save();
    await avisarVersusRespuesta(aviso(duelo), true);
    return responderConDuelo(res, duelo, me);
  } catch (error) {
    return responderError(res, error, 'Error al aceptar el versus');
  }
};

// POST /api/versus/:id/decline - El rival lo rechaza
export const declineVersus = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const duelo = await buscarDuelo(req, res);
    if (!duelo) return;
    if (String(duelo.rival) !== me) return res.status(403).json({ message: 'Solo la persona retada puede rechazar el versus' });
    if (duelo.estado !== 'pendiente') return res.status(409).json({ message: 'Este versus ya no está pendiente' });

    duelo.estado = 'rechazado';
    await duelo.save();
    await avisarVersusRespuesta(aviso(duelo), false);
    return responderConDuelo(res, duelo, me);
  } catch (error) {
    return responderError(res, error, 'Error al rechazar el versus');
  }
};

// DELETE /api/versus/:id - El retador retira un versus que aún no se ha aceptado
export const cancelVersus = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const duelo = await buscarDuelo(req, res);
    if (!duelo) return;
    if (String(duelo.retador) !== me) return res.status(403).json({ message: 'Solo quien lanzó el versus puede retirarlo' });
    if (duelo.estado !== 'pendiente') {
      return res.status(409).json({ message: 'Un versus aceptado no se puede retirar: ¡a entrenar!' });
    }

    duelo.estado = 'cancelado';
    await duelo.save();
    return responderConDuelo(res, duelo, me);
  } catch (error) {
    return responderError(res, error, 'Error al retirar el versus');
  }
};

// GET /api/versus/head-to-head/:id - Comparación al momento de los 5 ejercicios básicos (últimos 90 días).
// Solo entre amigos (os seguís mutuamente): incluye la fuerza relativa, que depende del peso corporal.
export const headToHead = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Id de usuario no válido' });
    if (id === me) return res.status(400).json({ message: 'Elige a otra persona para compararte' });

    const [yoSigo, meSigue] = await Promise.all([
      User.exists({ _id: me, following: id }),
      User.exists({ _id: id, following: me }),
    ]);
    if (!yoSigo || !meSigue) {
      return res.status(403).json({ message: 'Solo puedes compararte con amigos: tenéis que seguiros mutuamente', code: 'NOT_FRIENDS' });
    }

    const datos = await cargarParticipantes([me, id]);
    const yo = datos.get(me);
    const otro = datos.get(id);
    if (!yo || !otro) return res.status(404).json({ message: 'Usuario no encontrado' });

    const ahora = new Date();
    const rangos = (p: Participante) => computeRanks({ workouts: p.workouts, bodyWeights: p.bodyWeights, sex: p.sex, now: ahora });
    const mios = rangos(yo);
    const suyos = rangos(otro);

    const marca = (r: (typeof mios)[number]) =>
      r.actual && { e1rm: r.actual.e1rm, ratio: r.actual.ratio, kg: r.actual.kg, reps: r.actual.reps, fecha: r.actual.fecha, rango: r.actual.rango };

    const ejercicios = LIFT_KEYS.map((key: LiftKey, i) => {
      const a = marca(mios[i]);
      const b = marca(suyos[i]);
      const comoMarca = (m: typeof a) => m && { ...m, fecha: new Date(m.fecha) };
      const ganador = (modo: Modalidad) => {
        const g = ganadorDe(comoMarca(a), comoMarca(b), modo);
        return g === 'retador' ? 'yo' : g === 'rival' ? 'rival' : g;
      };
      return { key, label: LIFTS[key].label, yo: a, rival: b, ganadorKg: ganador('kg'), ganadorRelativa: ganador('relativa') };
    });

    const cuenta = (campo: 'ganadorKg' | 'ganadorRelativa') => ({
      yo: ejercicios.filter((e) => e[campo] === 'yo').length,
      rival: ejercicios.filter((e) => e[campo] === 'rival').length,
      empates: ejercicios.filter((e) => e[campo] === 'empate').length,
    });

    return res.status(200).json({
      yo: { id: me, nombre: yo.nombre, tienePeso: yo.bodyWeights.length > 0 },
      rival: { id, nombre: otro.nombre, tienePeso: otro.bodyWeights.length > 0 },
      ventanaDias: 90,
      ejercicios,
      resumen: { kg: cuenta('ganadorKg'), relativa: cuenta('ganadorRelativa') },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al comparar la fuerza', error });
  }
};
