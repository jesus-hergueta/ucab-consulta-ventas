# Consulta de ventas

Aplicación en Astro para consultar ventas mediante preguntas en español. La función de Supabase interpreta la pregunta, ejecuta una consulta parametrizada y guarda su trazabilidad.

- `frontend`: interfaz y endpoint de Vercel.
- `supabase`: interpretación, consultas al Data Mart y persistencia de trazas.
- `database`: esquema, consultas y permisos.
- `bdoo`: clases y persistencia local en TinyDB.
- `datos`: seis CSV con los datos de demostración.

Para instalar el frontend, ejecutar `npm ci` dentro de `frontend`. `npm run build` compila la interfaz. Para trabajar con el endpoint local, usar `npx vercel dev` con las variables de `.env.example` configuradas.

En Supabase, ejecutar `Datamart.sql`, `permisos.sql`, `consultas.sql` y `trazas.sql`. Importar primero los CSV de dimensiones y al final `FactVentas.csv`. Las fechas vacías de fin de vigencia representan `NULL`.

La Edge Function requiere los secretos indicados en `supabase/functions/.env.example`. El servidor de Vercel usa `ASISTENTE_URL` y el mismo `ASISTENTE_TOKEN`. Las claves no se incluyen en el repositorio.

Al conectar el repositorio en Vercel, usar `frontend` como Root Directory.

La versión web conserva cada traza como un JSON privado en Supabase Storage, con estructura compatible con TinyDB. Storage no ejecuta TinyDB. El modelo local de objetos permanece en `bdoo`.

Aplicación: https://ucab-consulta-ventas.vercel.app
