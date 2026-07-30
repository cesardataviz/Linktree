# cesardataviz · links

Landing tipo Linktree con analítica propia en tiempo real. Next.js 16 + Supabase + Vercel. Sin suscripciones, sin plantillas cerradas.

- **Landing pública** (`/`) — estática, servida desde la CDN de Vercel. Modo día/noche, diseñada para móvil.
- **Panel privado** (`/dashboard`) — visitas, clics, ranking de botones y origen del tráfico, actualizándose por WebSocket.
- **Tracking propio** — cada visita y cada clic van a tu base de datos. Los datos son tuyos.

---

## Puesta en marcha (30–40 min)

Sigue los pasos en orden. Cada uno depende del anterior.

### Paso 1 · Crear el proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) y crea una cuenta (plan gratuito).
2. **New project**. Elige una región cercana a tu audiencia — para Perú, `South America (São Paulo)`.
3. Guarda la contraseña de la base de datos que te genera (no la necesitarás para esto, pero perderla es un fastidio). **Guárdala en un gestor de contraseñas, nunca en un archivo del proyecto.**
4. Espera ~2 minutos a que termine de aprovisionar.

### Paso 2 · Crear las tablas

1. En Supabase, ve a **SQL Editor → New query**.
2. Abre [`supabase/schema.sql`](supabase/schema.sql) de este repo y **antes de ejecutarlo cambia el correo** en la sección 2:
   ```sql
   insert into public.admins (email) values ('tu@correo.com')
   ```
   Debe ser exactamente el correo con el que vas a entrar al panel, en minúsculas.
3. Pega todo el archivo y pulsa **Run**. Debe decir `Success`.

> El archivo es idempotente: si te equivocas, corriges y lo vuelves a ejecutar sin romper nada.

### Paso 3 · Conectar las claves

1. En Supabase: **Project Settings → API**.
2. Copia los tres valores a tu archivo `.env.local`:

   | En Supabase | En `.env.local` |
   |---|---|
   | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
   | `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

3. Reinicia el servidor (`Ctrl+C` y `npm run dev`). Next solo lee las variables al arrancar.

> ⚠️ La `service_role` key se salta todas las reglas de seguridad. Nunca la pongas en una variable que empiece por `NEXT_PUBLIC_`, nunca la compartas y nunca la subas al repo. `.env.local` está en `.gitignore`.

### Paso 4 · Personalizar tu perfil

Todo lo editable vive en un solo archivo: [`src/config/profile.ts`](src/config/profile.ts).

Busca los comentarios `// TODO:` y reemplaza:

- **WhatsApp** — tu número con código de país, sin `+` ni espacios: `https://wa.me/51987654321`
- **LinkedIn**, **YouTube**, **Instagram** — las URLs reales de tus perfiles

> El campo `id` de cada enlace es la clave con la que se guardan los clics. Cambia `label` y `href` cuando quieras, pero **no cambies un `id`** una vez tengas métricas: las históricas quedarían huérfanas.

### Paso 5 · Probar en local

```bash
npm run dev
```

1. Abre <http://localhost:3000>. Prueba el botón día/noche y pulsa algún enlace.
2. Ve a <http://localhost:3000/login>, pon tu correo y pulsa enviar.
3. Abre el enlace que llega al correo → deberías caer en `/dashboard` con tus primeras métricas.

Si el panel dice *"No se pudieron cargar las métricas"*, no ejecutaste el Paso 2. Si dice *"Sin acceso"*, el correo de la tabla `admins` no coincide con el que usaste.

### Paso 6 · Desplegar en Vercel

1. Sube el código a GitHub:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/cesardataviz-links.git
   git push -u origin main
   ```
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo. Detecta Next.js solo.
3. **Antes de desplegar**, en *Environment Variables*, añade las cuatro:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → tu dominio real, **sin barra final** (ej. `https://cesardataviz.vercel.app`)
4. **Deploy**.

### Paso 7 · Autorizar el dominio en Supabase (crítico)

Sin este paso los magic links te devolverán a `localhost` y no podrás entrar en producción.

En Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://tu-dominio.vercel.app`
- **Redirect URLs**: añade estas dos entradas:
  - `https://tu-dominio.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (para seguir desarrollando en local)

---

## Cómo leer tus métricas

| Métrica | Qué te dice |
|---|---|
| **Visitas** | Cuánta gente abrió la landing |
| **Clics** | Cuántas veces pulsaron algún botón |
| **Conversión** | `clics ÷ visitas`. Por debajo del 20 % suele significar que el botón importante no destaca o que la bio no convence |
| **Ranking de botones** | Dónde va realmente la atención. Si WhatsApp gana, tu audiencia quiere hablar; si YouTube gana, quiere aprender |
| **¿Por dónde te encuentran?** | Origen del tráfico: `tiktok.com`, `linkedin.com`, `directo`… |

### Medir campañas con UTM

Añade `?utm_source=` a tus enlaces y el panel los separa automáticamente:

```
https://tu-dominio.vercel.app/?utm_source=tiktok-bio
https://tu-dominio.vercel.app/?utm_source=linkedin-post
```

Así sabes qué publicación concreta te trajo la gente, no solo qué red.

---

## Arquitectura y decisiones

```
src/
├── config/profile.ts        ← lo único que editas a diario
├── app/
│   ├── page.tsx             landing (estática, en la CDN)
│   ├── api/track/route.ts   recibe visitas y clics
│   ├── login/               magic link
│   ├── auth/callback/       canje del código por sesión
│   └── dashboard/           panel (protegido)
├── components/
├── lib/
│   ├── supabase/            3 clientes: browser, server, admin
│   └── tracking.ts          sendBeacon
└── proxy.ts                 refresco de sesión (Next 16: NO middleware.ts)
supabase/schema.sql          tablas, RLS, vistas
```

**Por qué el tracking pasa por `/api/track` y no escribe directo en Supabase.** La tabla `events` no tiene ninguna política de inserción, así que el navegador no puede escribir en ella. Todas las escrituras entran por nuestro endpoint, que valida el evento y comprueba el `link_id` contra una allowlist antes de guardarlo. Si el navegador pudiera escribir directo, cualquiera podría inflar tus métricas con un bucle de peticiones.

**Por qué `sendBeacon` y no `fetch`.** Un clic en un enlace externo dispara una navegación que cancela peticiones a medias. `sendBeacon` entrega el evento en segundo plano con garantía del navegador, incluso mientras la página se descarga.

**Por qué el clic no se intercepta.** Los botones son etiquetas `<a>` normales, sin `preventDefault`. El enlace sigue funcionando sin JavaScript, se puede abrir en pestaña nueva y copiar la URL. Si la analítica falla, el visitante llega igual a su destino.

**Por qué RLS y no confiar en la clave anónima.** La `anon key` viaja en el JavaScript del navegador: es pública por diseño. Lo único que impide que un desconocido lea tus métricas con ella son las políticas de Row Level Security. Las vistas usan `security_invoker = on` precisamente para que también las respeten.

**Por qué el `proxy.ts` solo cubre `/dashboard`, `/login` y `/auth`.** Los tutoriales suelen ponerlo en todo el sitio. Aquí sería un error: la landing es estática y no necesita sesión, así que ejecutar una función de servidor en cada visita costaría dinero sin aportar nada. Además, así cualquier problema con Supabase queda confinado al panel y nunca puede tumbar tu landing pública.

### Notas de Next.js 16

Este proyecto usa Next 16, que trae cambios que rompen la mayoría de guías de Supabase que hay online:

- `middleware.ts` → **`proxy.ts`**, y la función se llama `proxy`. El archivo antiguo simplemente no se ejecuta.
- `cookies()` y `headers()` son **asíncronos** obligatoriamente. `await cookies()`.
- `params` y `searchParams` son Promesas.
- Turbopack es el compilador por defecto.
- `next lint` ya no existe; se usa `eslint` directamente (`npm run lint`).

---

## Siguientes pasos cuando crezca

Ideas en orden de utilidad, no de dificultad:

1. **Rate limiting en `/api/track`** — hoy el endpoint es público y sin límite. Con tráfico real, añade [Vercel KV](https://vercel.com/docs/storage/vercel-kv) o Upstash para limitar por IP.
2. **Dominio propio** — en Vercel → *Domains*. Recuerda actualizar `NEXT_PUBLIC_SITE_URL` y las Redirect URLs de Supabase.
3. **Filtro de fechas en el panel** — las vistas SQL ya agregan por día; falta la UI.
4. **Geo y dispositivo** — Vercel entrega el país en las cabeceras del request gratis; el user-agent te da móvil vs escritorio. Las columnas se añaden a `events` y se rellenan en `route.ts`.
5. **Imagen Open Graph dinámica** — para que al compartir el enlace salga una tarjeta con tu foto y marca.

---

## Comandos

```bash
npm run dev      # desarrollo en http://localhost:3000
npm run build    # build de producción (verifica tipos)
npm run start    # servir el build localmente
npm run lint     # ESLint
```
