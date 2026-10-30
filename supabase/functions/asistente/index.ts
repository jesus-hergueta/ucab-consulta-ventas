import { crearAsistente } from "./asistente.ts";

const config = {
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  supabaseKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  claudeKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
  modelo: Deno.env.get("CLAUDE_MODEL") ?? "claude-haiku-5-5",
  token: Deno.env.get("ASISTENTE_TOKEN") ?? "",
};
const atender = crearAsistente(config);

Deno.serve(async (req) => {
  const autorizado =
    config.token &&
    req.headers.get("Authorization") === `Bearer ${config.token}`;
  const entrada =
    req.method === "POST"
      ? await req
          .clone()
          .json()
          .catch(() => null)
      : null;
  const respuesta = await atender(req);
  if (!autorizado || !entrada || typeof entrada.pregunta !== "string")
    return respuesta;
  const salida = await respuesta.json();
  const ahora = new Date().toISOString();
  const id = crypto.randomUUID();
  const sesion =
    typeof entrada.sesion_id === "string" &&
    /^SES-[a-zA-Z0-9-]{6,64}$/.test(entrada.sesion_id)
      ? entrada.sesion_id
      : "SES-" + crypto.randomUUID();
  const inicio =
    typeof entrada.fecha_inicio_sesion === "string" &&
    !Number.isNaN(Date.parse(entrada.fecha_inicio_sesion))
      ? entrada.fecha_inicio_sesion
      : ahora;
  const texto =
    salida.respuesta_agente?.texto ||
    salida.texto ||
    salida.error ||
    "Sin respuesta";
  const traza = {
    agente_id: "AG-01",
    version_agente: "1.0.0",
    sesion: {
      id_sesion: sesion,
      fecha_inicio: inicio,
      usuario: {
        id_usuario: "U-WEB",
        nombre: "Gerente",
        rol: "Gerente Comercial",
      },
    },
    pregunta: {
      id_pregunta: "P-" + id,
      texto_original: entrada.pregunta,
      timestamp: ahora,
    },
    intencion: {
      ...(salida.intencion || {
        tipo: salida.estado,
        metrica: "",
        dimension: "",
        periodo: "",
      }),
      filtros: salida.interpretacion || {},
    },
    fuente_dato: salida.fuente_dato || { tabla_hechos: "", dimensiones: [] },
    consulta_analitica: salida.consulta_analitica || {
      sql_generado: "",
      parametros: {},
    },
    regla_validacion: salida.regla_validacion || {
      nombre_regla: "Sin_consulta",
      aprobada: false,
      detalle: texto,
    },
    resultado_consulta: {
      ...(salida.resultado_consulta || {
        datos_raw: [],
        filas_afectadas: 0,
        esta_vacio: true,
      }),
      estado: salida.estado,
    },
    respuesta_agente: salida.respuesta_agente || {
      texto,
      regla_calculo: "",
      advertencias: null,
    },
    timestamp_registro: ahora,
  };
  const archivo = `${sesion}/${id}.json`;
  try {
    const guardado = await fetch(
      `${config.supabaseUrl}/storage/v1/object/trazas-agente/${archivo}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
          "x-upsert": "false",
        },
        body: JSON.stringify({ trazabilidad_interacciones: { "1": traza } }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!guardado.ok) throw new Error();
    return Response.json(
      {
        ...salida,
        sesion_id: sesion,
        pregunta_id: "P-" + id,
        archivo_traza: archivo,
        traza_guardada: true,
      },
      { status: respuesta.status },
    );
  } catch {
    return Response.json(
      {
        estado: "error",
        error: "La consulta no pudo guardarse. Vuelva a intentarlo.",
      },
      { status: 502 },
    );
  }
});
