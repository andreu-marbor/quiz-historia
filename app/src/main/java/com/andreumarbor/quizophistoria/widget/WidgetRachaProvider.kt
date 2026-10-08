/*
 * §13.3 · Widget de la racha en la pantalla de inicio.
 *
 * Lee lo que guardó `WidgetBridgeActivity` en `SharedPreferences` y repinta el
 * RemoteViews: cifra grande + «días», o «—» + «Juega hoy». No necesita red:
 * todo vive en el dispositivo, así que funciona igual sin conexión.
 *
 * **Recordatorio diario, no vitrina:** la cifra solo sale si la última
 * actividad es de **hoy**. Si fue ayer (la racha sigue viva en la web) o hace
 * más, se enseña «—» + «Juega hoy»: el widget empuja a jugar, y desde luego
 * nunca un número viejo («5 días» una semana después de dejar de jugar).
 * La web sí sigue mostrando la racha mientras no pasen dos días: es la
 * pantalla de Progreso (el récord) y este es el recordatorio de hoy.
 *
 * Las fuentes viven en `android/widget/` y se copian a `app/` con
 * `node scripts/aplicar-widget.mjs` (nunca a mano: `app/` es generado).
 */
package com.andreumarbor.quizophistoria.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import com.andreumarbor.quizophistoria.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import kotlin.math.roundToInt

class WidgetRachaProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        // `updatePeriodMillis="1800000"` (30 min, el mínimo que acepta Android):
        // sin este refresco esto solo saltaría al añadir el widget, al
        // reencender y al actualizar la app, y «Juega hoy» no llegaría a
        // pintarse al pasar la medianoche hasta que el alumno abriera la app.
        for (id in appWidgetIds) pintar(context, appWidgetManager, id)
    }

    companion object {

        /** Repinta todos los widgets de este proveedor (lo llama el puente). */
        fun actualizarTodos(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, WidgetRachaProvider::class.java))
            for (id in ids) pintar(context, manager, id)
        }

        private fun pintar(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs =
                context.getSharedPreferences(WidgetBridgeActivity.PREFERENCIAS, Context.MODE_PRIVATE)

            // `contains` = «¿ha llegado algún envío del puente?». Un móvil con la
            // app recién instalada —o recién actualizada, la primera vez que
            // corre el puente— todavía no tiene nada guardado: en ese caso no se
            // miente, se enseña «Abre la app» en vez de un «Juega hoy» falso.
            val sincronizado = prefs.contains(WidgetBridgeActivity.CLAVE_RACHA)
            val racha = prefs.getInt(WidgetBridgeActivity.CLAVE_RACHA, 0)
            val ultimoDia = prefs.getString(WidgetBridgeActivity.CLAVE_ULTIMO_DIA, "").orEmpty()

            val sinRacha = context.getString(R.string.widget_sin_racha)
            val (valor, etiqueta) = when {
                !sincronizado -> sinRacha to context.getString(R.string.widget_abre)
                else -> {
                    val vigente = rachaVigente(racha, ultimoDia)
                    if (vigente != null) vigente.toString() to context.getString(R.string.widget_dias)
                    else sinRacha to context.getString(R.string.widget_juega)
                }
            }

            val vistas = RemoteViews(context.packageName, R.layout.widget_racha)
            vistas.setTextViewText(R.id.widget_valor, valor)
            vistas.setTextViewText(R.id.widget_etiqueta, etiqueta)

            // Tocar el widget abre la app (mismo lanzador que el icono).
            vistas.setOnClickPendingIntent(R.id.widget_fondo, abrirApp(context))
            manager.updateAppWidget(id, vistas)
        }

        /**
         * Cifra que se enseña, o `null` para «Juega hoy».
         *
         * **Solo si la última actividad es de hoy** (`dias == 0`): el widget es
         * el empujón del día, no el récord. Si la última partida fue ayer, la
         * racha sigue viva en la web, pero aquí toca jugar → «Juega hoy».
         */
        private fun rachaVigente(racha: Int, ultimoDia: String): Int? {
            if (racha <= 0 || ultimoDia.isEmpty()) return null
            val dias = diasDe(ultimoDia) ?: return null
            return if (dias == 0) racha else null
        }

        /**
         * Días naturales transcurridos desde `fecha` (`YYYY-MM-DD`) hasta hoy.
         * `Locale.ROOT` a propósito: el patrón es numérico y debe leer exactamente
         * lo que escribe la web, sin calendario ni dígitos localizados.
         */
        private fun diasDe(fecha: String): Int? {
            val formato = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { isLenient = false }
            val pasada = runCatching { formato.parse(fecha) }.getOrNull() ?: return null

            fun medianoche(calendario: Calendar): Calendar {
                calendario.set(Calendar.HOUR_OF_DAY, 0)
                calendario.set(Calendar.MINUTE, 0)
                calendario.set(Calendar.SECOND, 0)
                calendario.set(Calendar.MILLISECOND, 0)
                return calendario
            }

            val hoy = medianoche(Calendar.getInstance())
            val otro = medianoche(Calendar.getInstance().apply { time = pasada })
            // Redondea, no trunca: con el horario de verano un día son 23 o 25 h.
            return ((hoy.timeInMillis - otro.timeInMillis) / 86_400_000.0).roundToInt()
        }

        private fun abrirApp(context: Context): PendingIntent {
            val lanzador =
                context.packageManager.getLaunchIntentForPackage(context.packageName)
                    ?: Intent(Intent.ACTION_MAIN).apply {
                        addCategory(Intent.CATEGORY_LAUNCHER)
                        setPackage(context.packageName)
                    }
            lanzador.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

            var banderas = PendingIntent.FLAG_UPDATE_CURRENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                banderas = banderas or PendingIntent.FLAG_IMMUTABLE
            }
            return PendingIntent.getActivity(context, 0, lanzador, banderas)
        }
    }
}
