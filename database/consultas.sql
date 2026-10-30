-- Ejecutar despues de Datamart.sql. Las tablas del equipo no se modifican.
CREATE OR REPLACE FUNCTION public.consultar_ventas(
    p_tipo text,
    p_inicio date DEFAULT NULL,
    p_fin date DEFAULT NULL,
    p_categoria text DEFAULT NULL,
    p_canales text[] DEFAULT NULL,
    p_limite integer DEFAULT 5,
    p_ultimos_tres boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    plantilla text;
    base text;
    consulta text;
    resultado jsonb;
    inicio date;
    fin date;
    meses date[];
BEGIN
    IF p_limite IS NULL OR p_limite NOT BETWEEN 1 AND 20 OR p_inicio > p_fin THEN
        RAISE EXCEPTION 'Periodo o limite invalido';
    END IF;

    SELECT coalesce(p_inicio, min(t.fecha)), coalesce(p_fin, max(t.fecha))
    INTO inicio, fin FROM public.factventas f
    JOIN public.dimtiempo t USING (sk_tiempo);

    IF p_ultimos_tres THEN
        SELECT array_agg(mes ORDER BY mes) INTO meses FROM (
            SELECT DISTINCT date_trunc('month', t.fecha)::date AS mes
            FROM public.factventas f JOIN public.dimtiempo t USING (sk_tiempo)
            WHERE t.fecha BETWEEN inicio AND fin
            ORDER BY mes DESC LIMIT 3
        ) m;
    END IF;

    CASE p_tipo
    WHEN 'ingreso_mes' THEN
        plantilla := 'SELECT to_char(fecha, ''YYYY-MM'') AS mes,
            sum(ingreso_neto) AS ingreso_neto FROM base GROUP BY 1 ORDER BY 1';
    WHEN 'margen_categoria' THEN
        plantilla := 'SELECT categoria, sum(margen_bruto) AS margen_bruto
            FROM base GROUP BY categoria ORDER BY margen_bruto DESC, categoria LIMIT $6';
    WHEN 'ticket_sucursal' THEN
        plantilla := 'SELECT nombre_sucursal,
            round(sum(ingreso_neto) / nullif(count(DISTINCT (sk_sucursal, id_transaccion_dd)), 0), 2)
            AS ticket_promedio FROM base GROUP BY sk_sucursal, nombre_sucursal
            ORDER BY ticket_promedio DESC, nombre_sucursal LIMIT $6';
    WHEN 'caida_segmento' THEN
        plantilla := 'WITH periodos AS (
                SELECT DISTINCT date_trunc(''month'', fecha)::date AS mes FROM base
                ORDER BY mes DESC LIMIT 2
            ), volumen AS (
                SELECT segmento,
                    coalesce(sum(cantidad_vendida) FILTER (WHERE date_trunc(''month'',fecha)::date =
                        (SELECT min(mes) FROM periodos)),0) AS anterior,
                    coalesce(sum(cantidad_vendida) FILTER (WHERE date_trunc(''month'',fecha)::date =
                        (SELECT max(mes) FROM periodos)),0) AS actual
                FROM base WHERE date_trunc(''month'',fecha)::date IN (SELECT mes FROM periodos)
                GROUP BY segmento
            ) SELECT segmento, anterior, actual, actual - anterior AS variacion_unidades,
                (SELECT min(mes) FROM periodos) AS mes_anterior,
                (SELECT max(mes) FROM periodos) AS mes_actual
            FROM volumen WHERE (SELECT count(*) FROM periodos) = 2
            AND actual < anterior ORDER BY variacion_unidades, segmento LIMIT $6';
    WHEN 'ventas_canal' THEN
        plantilla := 'SELECT nombre_canal, sum(ingreso_neto) AS ingreso_neto
            FROM base GROUP BY nombre_canal ORDER BY ingreso_neto DESC, nombre_canal LIMIT $6';
    WHEN 'comparar_canales' THEN
        IF cardinality(p_canales) IS DISTINCT FROM 2
            OR lower(p_canales[1]) = lower(p_canales[2]) THEN
            RAISE EXCEPTION 'Indique dos canales distintos';
        END IF;
        plantilla := 'SELECT nombre_canal, sum(margen_bruto) AS margen_bruto
            FROM base GROUP BY nombre_canal ORDER BY nombre_canal';
    WHEN 'producto_categoria' THEN
        IF nullif(trim(p_categoria), '') IS NULL OR p_inicio IS NULL OR p_fin IS NULL THEN
            RAISE EXCEPTION 'Indique categoria y periodo';
        END IF;
        plantilla := 'SELECT nk_codigo_producto, nombre_producto, sum(ingreso_neto) AS ingreso_neto
            FROM base GROUP BY nk_codigo_producto, nombre_producto
            ORDER BY ingreso_neto DESC, nk_codigo_producto LIMIT $6';
    WHEN 'unidades_producto' THEN
        plantilla := 'SELECT nk_codigo_producto, nombre_producto, sum(cantidad_vendida) AS unidades
            FROM base GROUP BY nk_codigo_producto, nombre_producto
            ORDER BY unidades DESC, nk_codigo_producto LIMIT $6';
    WHEN 'descuento_categoria' THEN
        plantilla := 'SELECT categoria, sum(monto_descuento) AS descuento_total
            FROM base GROUP BY categoria ORDER BY descuento_total DESC, categoria LIMIT $6';
    WHEN 'rentabilidad_sucursal' THEN
        plantilla := 'SELECT nombre_sucursal,
            round(100.0 * sum(margen_bruto) / nullif(sum(ingreso_neto),0),2) AS margen_porcentaje
            FROM base GROUP BY sk_sucursal, nombre_sucursal HAVING sum(ingreso_neto) > 0
            ORDER BY margen_porcentaje DESC, nombre_sucursal LIMIT $6';
    ELSE
        RAISE EXCEPTION 'Consulta fuera del catalogo';
    END CASE;

    base := 'WITH base AS (
        SELECT f.*, t.fecha, p.nk_codigo_producto, p.nombre_producto, p.categoria,
            c.segmento, s.nombre_sucursal, ca.nombre_canal
        FROM public.factventas f
        JOIN public.dimtiempo t USING (sk_tiempo)
        JOIN public.dimproducto p USING (sk_producto)
        JOIN public.dimcliente c USING (sk_cliente)
        JOIN public.dimsucursal s USING (sk_sucursal)
        JOIN public.dimcanal ca USING (sk_canal)
        WHERE t.fecha BETWEEN $1 AND $2
          AND ($3::text IS NULL OR lower(p.categoria) = lower($3))
          AND ($4::text[] IS NULL OR lower(ca.nombre_canal) IN
              (SELECT lower(x) FROM unnest($4::text[]) x))
          AND ($5::date[] IS NULL OR date_trunc(''month'', t.fecha)::date = ANY($5))
    ) ';
    consulta := base || 'SELECT jsonb_build_object(
        ''datos'', (SELECT coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) FROM (' || plantilla || ') r),
        ''meses_con_datos'', (SELECT count(DISTINCT date_trunc(''month'',fecha)) FROM base),
        ''lineas_consultadas'', (SELECT count(*) FROM base))';

    EXECUTE consulta INTO resultado USING inicio, fin, p_categoria, p_canales, meses, p_limite;
    RETURN resultado || jsonb_build_object('sql', consulta,
        'parametros', jsonb_build_object('inicio',inicio,'fin',fin,'categoria',p_categoria,
            'canales',p_canales,'meses',meses,'limite',p_limite));
END;
$$;

REVOKE ALL ON FUNCTION public.consultar_ventas(text,date,date,text,text[],integer,boolean)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_ventas(text,date,date,text,text[],integer,boolean)
    TO service_role;

