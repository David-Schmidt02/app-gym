import { borrar, guardar, listar } from './db';
import { hoy, lunes, sumarDias } from './fechas';

export function tieneCalendario(plan) {
  return Boolean(
    plan &&
      plan.dias &&
      plan.dias.length > 0 &&
      plan.dias.every((d) => d.dia_semana !== null && d.dia_semana !== undefined),
  );
}

export async function semanaActual(plan) {
  const hoyFecha = hoy();
  const inicio = lunes(hoyFecha);
  const fin = sumarDias(inicio, 6);

  const todasSesiones = await listar('sesiones');
  const sesiones = todasSesiones
    .filter((s) => s.fecha >= inicio && s.fecha <= fin)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);

  const porFecha = {};
  for (const s of sesiones) {
    if (!porFecha[s.fecha]) porFecha[s.fecha] = [];
    porFecha[s.fecha].push(s);
  }

  if (!tieneCalendario(plan)) {
    return semanaLibre(plan, hoyFecha, inicio, fin, porFecha);
  }

  const hechosPlan = {};
  for (const s of sesiones) {
    if (s.plan_id === plan.id && s.dia_orden !== null && s.dia_orden !== undefined && !(s.dia_orden in hechosPlan)) {
      hechosPlan[s.dia_orden] = s;
    }
  }

  const todosAjustes = await listar('agenda');
  const ajustes = todosAjustes.filter((a) => a.semana === inicio && a.plan_id === plan.id);
  const ajustesActivos = {};
  for (const a of ajustes) {
    if (!(a.dia_orden in hechosPlan)) {
      ajustesActivos[a.dia_orden] = a.fecha;
    }
  }

  const salteados = plan.dias
    .filter((d) => d.orden in ajustesActivos && ajustesActivos[d.orden] === null)
    .map((d) => ({ dia_orden: d.orden, dia_nombre: d.nombre }));

  const [ubicados, sinLugar] = ubicarPendientes(
    plan,
    hoyFecha,
    inicio,
    sesiones,
    hechosPlan,
    ajustesActivos,
  );

  const pendientePorFecha = {};
  for (const { diaPlan, fecha } of ubicados) {
    pendientePorFecha[fecha] = diaPlan;
  }

  const diasOut = [];
  for (let idx = 0; idx < 7; idx++) {
    const fechaCelda = sumarDias(inicio, idx);
    const hechasCelda = porFecha[fechaCelda] || [];
    if (hechasCelda.length > 0) {
      const ultima = hechasCelda[hechasCelda.length - 1];
      const nombresUnicos = [...new Set(hechasCelda.map((s) => s.dia_nombre))];
      diasOut.push({
        fecha: fechaCelda,
        dia_semana: idx,
        es_hoy: fechaCelda === hoyFecha,
        estado: 'hecho',
        dia_orden: ultima.dia_orden,
        dia_nombre: nombresUnicos.join(' + '),
        sesion_id: ultima.id,
      });
    } else if (pendientePorFecha[fechaCelda]) {
      const diaPlan = pendientePorFecha[fechaCelda];
      const original = sumarDias(inicio, diaPlan.dia_semana);
      diasOut.push({
        fecha: fechaCelda,
        dia_semana: idx,
        es_hoy: fechaCelda === hoyFecha,
        estado: 'pendiente',
        dia_orden: diaPlan.orden,
        dia_nombre: diaPlan.nombre,
        reprogramado: fechaCelda !== original,
        fecha_original: fechaCelda !== original ? original : null,
      });
    } else {
      diasOut.push({
        fecha: fechaCelda,
        dia_semana: idx,
        es_hoy: fechaCelda === hoyFecha,
        estado: 'descanso',
      });
    }
  }

  const diaIndex = diasOut.findIndex((d) => d.fecha === hoyFecha);
  const celdaHoy = diaIndex >= 0 ? diasOut[diaIndex] : diasOut[0];
  let estadoHoy;
  let diaHoy = null;
  if (celdaHoy.estado === 'hecho') {
    estadoHoy = 'hecho';
  } else if (celdaHoy.estado === 'pendiente') {
    estadoHoy = 'entrenar';
    diaHoy = celdaHoy.dia_orden;
  } else {
    estadoHoy = 'descanso';
  }

  const futuros = diasOut
    .filter((c) => c.estado === 'pendiente' && c.dia_orden !== null && c.dia_orden !== undefined && c.fecha > hoyFecha)
    .map((c) => ({ dia_orden: c.dia_orden, dia_nombre: c.dia_nombre || '', fecha: c.fecha }));

  return {
    inicio,
    fin,
    tiene_calendario: true,
    descanso_dias: plan.descanso_dias ?? 1,
    estado_hoy: estadoHoy,
    dia_hoy: diaHoy,
    proximo_dia: futuros[0] || null,
    modificada: Object.keys(ajustesActivos).length > 0,
    dias: diasOut,
    salteados,
    sin_lugar: sinLugar,
  };
}

function semanaLibre(plan, hoyFecha, inicio, fin, porFecha) {
  const diasOut = [];
  for (let idx = 0; idx < 7; idx++) {
    const fechaCelda = sumarDias(inicio, idx);
    const hechas = porFecha[fechaCelda] || [];
    if (hechas.length > 0) {
      const ultima = hechas[hechas.length - 1];
      const nombresUnicos = [...new Set(hechas.map((s) => s.dia_nombre))];
      diasOut.push({
        fecha: fechaCelda,
        dia_semana: idx,
        es_hoy: fechaCelda === hoyFecha,
        estado: 'hecho',
        dia_orden: ultima.dia_orden,
        dia_nombre: nombresUnicos.join(' + '),
        sesion_id: ultima.id,
      });
    } else {
      diasOut.push({
        fecha: fechaCelda,
        dia_semana: idx,
        es_hoy: fechaCelda === hoyFecha,
        estado: 'descanso',
      });
    }
  }
  return {
    inicio,
    fin,
    tiene_calendario: false,
    descanso_dias: plan?.descanso_dias ?? 1,
    estado_hoy: hoyFecha in porFecha ? 'hecho' : 'libre',
    dia_hoy: null,
    proximo_dia: null,
    modificada: false,
    dias: diasOut,
    salteados: [],
    sin_lugar: [],
  };
}

function ubicarPendientes(plan, hoyFecha, inicio, sesiones, hechosPlan, ajustesActivos) {
  const porOrden = {};
  for (const d of plan.dias) {
    porOrden[d.orden] = d;
  }

  const ocupadas = new Set(sesiones.map((s) => s.fecha));
  const todosDias = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));

  const items = [];
  for (const d of plan.dias) {
    if (d.orden in hechosPlan) continue;
    if (d.orden in ajustesActivos && ajustesActivos[d.orden] === null) continue;

    const plantilla = sumarDias(inicio, d.dia_semana);
    const ajusteFecha = ajustesActivos[d.orden];
    const fijado = ajusteFecha !== undefined && ajusteFecha !== null && ajusteFecha >= hoyFecha && !ocupadas.has(ajusteFecha);
    const deseada = ajusteFecha !== undefined && ajusteFecha !== null ? ajusteFecha : plantilla;

    items.push({
      orden: d.orden,
      nombre: d.nombre,
      fecha_plantilla: plantilla,
      deseada,
      fijado_manual: fijado,
    });
  }

  items.sort((a, b) => {
    if (a.deseada !== b.deseada) return a.deseada.localeCompare(b.deseada);
    if (a.fijado_manual !== b.fijado_manual) return a.fijado_manual ? -1 : 1;
    return a.orden - b.orden;
  });

  const reservadasManual = {};
  const fechasManuales = new Set();
  for (const item of items) {
    if (item.fijado_manual && !fechasManuales.has(item.deseada)) {
      reservadasManual[item.orden] = item.deseada;
      fechasManuales.add(item.deseada);
    }
  }

  const hechasConPlantilla = sesiones
    .filter((s) => s.plan_id === plan.id && s.dia_orden in porOrden && porOrden[s.dia_orden].dia_semana !== null)
    .map((s) => ({
      fecha: s.fecha,
      plantilla: sumarDias(inicio, porOrden[s.dia_orden].dia_semana),
    }));

  let prevFecha = null;
  let prevPlantilla = null;
  if (hechasConPlantilla.length > 0) {
    hechasConPlantilla.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ult = hechasConPlantilla[hechasConPlantilla.length - 1];
    prevFecha = ult.fecha;
    prevPlantilla = ult.plantilla;
  }

  const ubicados = [];
  const sinLugar = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (item.orden in reservadasManual) {
      const elegida = reservadasManual[item.orden];
      ocupadas.add(elegida);
      ubicados.push({ diaPlan: porOrden[item.orden], fecha: elegida });
      if (prevFecha === null || elegida >= prevFecha) {
        prevFecha = elegida;
        prevPlantilla = item.fecha_plantilla;
      }
      continue;
    }

    const libres = todosDias.filter((d) => d >= hoyFecha && !ocupadas.has(d) && !fechasManuales.has(d));
    const posteriores = libres.filter((d) => prevFecha === null || d > prevFecha);
    const candidatos = posteriores.length > 0 ? posteriores : libres;

    if (candidatos.length === 0) {
      sinLugar.push({ dia_orden: item.orden, dia_nombre: item.nombre });
      continue;
    }

    const restantes = items.slice(idx + 1).filter((x) => !(x.orden in reservadasManual)).length;
    const topeIndex = Math.max(0, candidatos.length - 1 - restantes);
    const tope = candidatos[topeIndex];

    let minima = item.deseada > hoyFecha ? item.deseada : hoyFecha;
    if (prevFecha !== null && prevPlantilla !== null && prevFecha > prevPlantilla) {
      const fechaConDescanso = sumarDias(prevFecha, (plan.descanso_dias ?? 1) + 1);
      if (fechaConDescanso > minima) {
        minima = fechaConDescanso;
      }
    }

    const objetivo = minima < tope ? minima : tope;
    const elegida = candidatos.find((d) => d >= objetivo) || candidatos[candidatos.length - 1];
    ocupadas.add(elegida);
    ubicados.push({ diaPlan: porOrden[item.orden], fecha: elegida });
    prevFecha = elegida;
    prevPlantilla = item.fecha_plantilla;
  }

  return [ubicados, sinLugar];
}

export function diaSugeridoAgenda(plan, semana, fallbackCola) {
  if (semana.dia_hoy !== null && semana.dia_hoy !== undefined) {
    return semana.dia_hoy;
  }
  if (semana.proximo_dia) {
    return semana.proximo_dia.dia_orden;
  }
  if (semana.sin_lugar && semana.sin_lugar.length > 0) {
    return semana.sin_lugar[0].dia_orden;
  }
  return fallbackCola;
}

export async function moverDiaAgenda(plan, { dia_orden, fecha, cascada = true }) {
  if (!plan || !tieneCalendario(plan)) {
    throw new Error('Asigná días de la semana a la rutina antes de reprogramar');
  }
  if (dia_orden < 0 || dia_orden >= plan.dias.length) {
    throw new Error('La rutina no tiene ese día');
  }

  const hoyFecha = hoy();
  const inicio = lunes(hoyFecha);
  const fin = sumarDias(inicio, 6);

  const todasSesiones = await listar('sesiones');
  const sesiones = todasSesiones.filter((s) => s.fecha >= inicio && s.fecha <= fin);
  if (sesiones.some((s) => s.plan_id === plan.id && s.dia_orden === dia_orden)) {
    throw new Error('Ese día ya fue entrenado esta semana');
  }

  if (fecha !== null && fecha !== undefined) {
    if (fecha < inicio || fecha > fin) {
      throw new Error('Solo se puede reprogramar dentro de la semana actual');
    }
    if (fecha < hoyFecha) {
      throw new Error('No se puede mover un entrenamiento a un día que ya pasó');
    }
    if (sesiones.some((s) => s.fecha === fecha)) {
      throw new Error('Ya hay un entrenamiento registrado en ese día');
    }

    const diaActual = plan.dias[dia_orden];
    const todosAjustes = await listar('agenda');
    const ajustes = todosAjustes.filter((a) => a.semana === inicio && a.plan_id === plan.id);

    for (const existente of ajustes) {
      if (existente.dia_orden === dia_orden || existente.fecha === null) continue;
      const otroDia = plan.dias[existente.dia_orden];
      const esPosterior = otroDia && otroDia.dia_semana !== null && otroDia.dia_semana > diaActual.dia_semana;
      if (existente.fecha === fecha || (cascada && esPosterior)) {
        await borrar('agenda', existente.id);
      }
    }
  }

  const ajusteId = `${inicio}_${plan.id}_${dia_orden}`;
  await guardar('agenda', {
    id: ajusteId,
    semana: inicio,
    plan_id: plan.id,
    dia_orden,
    fecha: fecha ?? null,
  });

  return semanaActual(plan);
}

export async function restaurarSemanaAgenda(plan) {
  if (!plan || !tieneCalendario(plan)) {
    throw new Error('No hay una rutina activa con calendario');
  }
  const inicio = lunes(hoy());
  const todosAjustes = await listar('agenda');
  for (const a of todosAjustes) {
    if (a.semana === inicio && a.plan_id === plan.id) {
      await borrar('agenda', a.id);
    }
  }
  return semanaActual(plan);
}
