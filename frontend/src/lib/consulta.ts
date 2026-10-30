import katex from "katex";
import "katex/dist/katex.min.css";
const buscar = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const formulario = buscar<HTMLFormElement>("formulario");
const pregunta = buscar<HTMLTextAreaElement>("pregunta");
const enviar = buscar<HTMLButtonElement>("enviar");
const estado = buscar("estado");
const tabla = buscar("tabla");
const sugerencias =
  document.querySelectorAll<HTMLButtonElement>("[data-pregunta]");
const dinero = (n: number) =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
  }).format(n);
const fecha = (f: string) =>
  new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(f + "T00:00:00Z"));
const etiquetas: Record<string, string> = {
  mes: "Mes",
  ingreso_neto: "Ingreso neto (USD)",
  margen_bruto: "Margen bruto (USD)",
  nombre_canal: "Canal",
  categoria: "Categoría",
  nombre_sucursal: "Sucursal",
  ticket_promedio: "Ticket promedio (USD)",
  segmento: "Segmento",
  anterior: "Unidades anteriores",
  actual: "Unidades actuales",
  variacion_unidades: "Variación",
  mes_anterior: "Mes anterior",
  mes_actual: "Mes actual",
  nombre_producto: "Producto",
  nk_codigo_producto: "Código",
  unidades: "Unidades",
  descuento_total: "Descuento (USD)",
  margen_porcentaje: "Margen (%)",
};
const formulas: Record<string, string> = {
  ingreso_mes: String.raw`\text{Ingreso neto} = \text{Ingreso bruto} - \text{Descuentos}`,
  margen_categoria: String.raw`\text{Margen bruto} = \text{Ingreso neto} - \text{Costo total}`,
  ticket_sucursal: String.raw`\text{Ticket promedio} = \frac{\text{Ingreso neto}}{\text{Transacciones distintas}}`,
  caida_segmento: String.raw`\Delta Q = Q_{\text{mes actual}} - Q_{\text{mes anterior}}`,
  ventas_canal: String.raw`\text{Ventas del canal} = \sum \text{Ingreso neto del canal}`,
  comparar_canales: String.raw`\text{Margen del canal} = \sum (\text{Ingreso neto} - \text{Costo total})`,
  producto_categoria: String.raw`\text{Ventas del producto} = \sum \text{Ingreso neto del producto}`,
  unidades_producto: String.raw`\text{Unidades vendidas} = \sum \text{Cantidad vendida}`,
  descuento_categoria: String.raw`\text{Descuento total} = \sum \text{Monto de descuento}`,
  rentabilidad_sucursal: String.raw`\text{Margen porcentual} = \frac{\text{Margen bruto}}{\text{Ingreso neto}} \times 100\%`,
};
const formatear = (valor: unknown, columna: string) => {
  if (typeof valor === "number")
    return new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: [
        "ingreso_neto",
        "margen_bruto",
        "ticket_promedio",
        "descuento_total",
        "margen_porcentaje",
      ].includes(columna)
        ? 2
        : 0,
      maximumFractionDigits: 2,
    }).format(valor);
  if (typeof valor === "string" && columna === "mes")
    return new Intl.DateTimeFormat("es-VE", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(valor + "-01T00:00:00Z"));
  if (
    typeof valor === "string" &&
    ["mes_anterior", "mes_actual"].includes(columna)
  )
    return fecha(valor);
  return String(valor ?? "—");
};

function mostrarTabla(filas: Record<string, unknown>[]) {
  tabla.replaceChildren();
  if (!filas.length) return;
  const elemento = document.createElement("table");
  const encabezado = elemento.createTHead().insertRow();
  const columnas = Object.keys(filas[0]);
  for (const columna of columnas) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = etiquetas[columna] || columna.replaceAll("_", " ");
    encabezado.append(th);
  }
  const cuerpo = elemento.createTBody();
  for (const fila of filas) {
    const tr = cuerpo.insertRow();
    for (const columna of columnas)
      tr.insertCell().textContent = formatear(fila[columna], columna);
  }
  tabla.append(elemento);
}

for (const boton of sugerencias) {
  boton.addEventListener("click", () => {
    pregunta.value = boton.dataset.pregunta || "";
    pregunta.focus();
  });
}
pregunta.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter")
    formulario.requestSubmit();
});
formulario.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (enviar.disabled) return;
  const texto = pregunta.value.trim();
  if (!texto) {
    pregunta.focus();
    return;
  }
  enviar.disabled = true;
  pregunta.readOnly = true;
  sugerencias.forEach((b) => (b.disabled = true));
  formulario.setAttribute("aria-busy", "true");
  estado.textContent = "Consultando…";
  try {
    const peticion = await fetch("/api/pregunta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta: texto }),
    });
    const r = await peticion.json();
    if (!peticion.ok)
      throw new Error(r.error || "No se pudo completar la consulta.");
    buscar("resultado").hidden = false;
    const filas = r.resultado_consulta?.datos_raw || [];
    const tipo = r.interpretacion?.consulta;
    const primera = filas[0];
    let resumen = (r.respuesta_agente?.texto || r.texto || r.error || "").split(
      "\nPeriodo consultado:",
    )[0];
    if (filas.length) {
      if (tipo === "ingreso_mes")
        resumen = `Ingreso neto del período: ${dinero(filas.reduce((s: number, f: Record<string, number>) => s + f.ingreso_neto, 0))}.`;
      if (tipo === "margen_categoria")
        resumen = `${filas.length} categorías ordenadas de mayor a menor margen bruto.`;
      if (tipo === "ticket_sucursal")
        resumen = `La sucursal con el ticket promedio más alto es ${primera.nombre_sucursal}: ${dinero(primera.ticket_promedio)}.`;
      if (tipo === "ventas_canal")
        resumen = `El canal con mayor ingreso neto es ${primera.nombre_canal}: ${dinero(primera.ingreso_neto)}.`;
      if (tipo === "comparar_canales")
        resumen = "Comparación del margen bruto de los canales seleccionados.";
      if (tipo === "producto_categoria")
        resumen = `${primera.nombre_producto} lidera el ingreso neto de la categoría: ${dinero(primera.ingreso_neto)}.`;
      if (tipo === "unidades_producto")
        resumen = `${primera.nombre_producto} encabeza las ventas en unidades.`;
      if (tipo === "descuento_categoria")
        resumen = `${primera.categoria} acumula el mayor monto de descuentos.`;
      if (tipo === "rentabilidad_sucursal")
        resumen = `${primera.nombre_sucursal} tiene el margen porcentual más alto: ${formatear(primera.margen_porcentaje, "margen_porcentaje")}%.`;
    }
    buscar("respuesta").textContent = resumen;
    const p = r.consulta_analitica?.parametros;
    const contexto = [];
    if (p?.inicio && p?.fin)
      contexto.push(`${fecha(p.inicio)} — ${fecha(p.fin)}`);
    if (p?.categoria) contexto.push(p.categoria);
    if (p?.canales) contexto.push(p.canales.join(" / "));
    if (p?.meses)
      contexto.push(
        "Meses: " + p.meses.map((m: string) => fecha(m)).join(", "),
      );
    buscar("periodo").textContent = contexto.join(" · ");
    mostrarTabla(filas);
    const formula = buscar("formula");
    formula.replaceChildren();
    formula.hidden = !formulas[tipo];
    if (formulas[tipo])
      katex.render(formulas[tipo], formula, {
        displayMode: true,
        throwOnError: false,
      });
    buscar("advertencias").textContent = r.respuesta_agente?.advertencias || "";
    buscar("evidencia").textContent = JSON.stringify(
      {
        pregunta: texto,
        interpretacion: r.interpretacion,
        fuente: r.fuente_dato,
        consulta: r.consulta_analitica,
        validacion: r.regla_validacion,
        sesion: r.sesion_id,
        registro: r.pregunta_id,
      },
      null,
      2,
    );
    buscar<HTMLDetailsElement>("detalle-datos").open = false;
    estado.textContent =
      r.estado === "aclarar"
        ? "Completa tu pregunta con el dato solicitado."
        : "";
  } catch (error) {
    estado.textContent =
      error instanceof Error
        ? error.message
        : "No se pudo consultar. Vuelve a intentarlo.";
  } finally {
    enviar.disabled = false;
    pregunta.readOnly = false;
    sugerencias.forEach((b) => (b.disabled = false));
    formulario.removeAttribute("aria-busy");
  }
});
