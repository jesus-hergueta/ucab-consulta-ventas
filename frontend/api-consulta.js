export async function api(request, env) {
  if (request.method !== "POST")
    return Response.json({ error: "Use POST." }, { status: 405 });
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  if (!env.ASISTENTE_TOKEN || !env.ASISTENTE_URL)
    return Response.json(
      { error: "El asistente no esta configurado." },
      { status: 503 },
    );
  let entrada;
  try {
    if (Number(request.headers.get("Content-Length")) > 10000)
      throw new Error();
    entrada = await request.json();
    if (
      typeof entrada.pregunta !== "string" ||
      !entrada.pregunta.trim() ||
      entrada.pregunta.length > 1500
    )
      throw new Error();
  } catch {
    return Response.json(
      { error: "Escriba una pregunta de hasta 1500 caracteres." },
      { status: 400 },
    );
  }
  const cookie = request.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)sesion=(SES-[a-f0-9-]+)\.(\d{13})(?:;|$)/);
  const sesion = cookie?.[1] || "SES-" + crypto.randomUUID();
  const inicio = cookie?.[2] || String(Date.now());
  try {
    const remoto = await fetch(env.ASISTENTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + env.ASISTENTE_TOKEN,
      },
      body: JSON.stringify({
        pregunta: entrada.pregunta,
        sesion_id: sesion,
        fecha_inicio_sesion: new Date(Number(inicio)).toISOString(),
      }),
      signal: AbortSignal.timeout(60000),
    });
    const datos = await remoto.json();
    return Response.json(datos, {
      status: remoto.status,
      headers: {
        "Set-Cookie": `sesion=${sesion}.${inicio}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "No se pudo conectar con el asistente. Vuelva a intentarlo." },
      { status: 502 },
    );
  }
}
