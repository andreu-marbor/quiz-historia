/*
 * §13.3 · Widget de la racha en la pantalla de inicio.
 *
 * Lee lo que guardó `WidgetBridgeActivity` en `SharedPreferences` y repinta el
 * RemoteViews: cifra grande + «días», o «—» + «Juega hoy». No necesita red:
 * todo vive en el dispositivo, así que funciona igual sin conexión.
 *
 * **La misma regla que `avanzarRacha()` en la web:** si hace más de un día que
 * no hay actividad la racha está rota y NO se enseña un número viejo (se
 * mostraría «5 días» una semana después de dejar de jugar).
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
        // `updatePeriodMillis="0"`: esto solo salta al añadir el widget o al
        // reencender el dispositivo, el resto de veces lo llamamos nosotros.
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
            val racha = prefs.getInt(WidgetBridgeActivity.CLAVE_RACHA, 0)
            val ultimoDia = prefs.getString(WidgetBridgeActivity.CLAVE_ULTIMO_DIA, "").orEmpty()
            val vigente = rachaVigente(racha, ultimoDia)

            val vistas = RemoteViews(context.packageName, R.layout.widget_racha)
            if (vigente != null) {
                vistas.setTextViewText(R.id.widget_valor, vigente.toString())
                vistas.setTextViewText(R.id.widget_etiqueta, context.getString(R.string.widget_dias))
            } else {
                vistas.setTextViewText(R.id.widget_valor, context.getString(R.string.widget_sin_racha))
                vistas.setTextViewText(R.id.widget_etiqueta, context.getString(R.string.widget_juega))
            }

            // Tocar el widget abre la app (mismo lanzador que el icono).
            vistas.setOnClickPendingIntent(R.id.widget_fondo, abrirApp(context))
            manager.updateAppWidget(id, vistas)
        }

        /**
         * Racha en pie, o `null` si está rota: misma regla que `avanzarRacha()`
         * de la web (hoy o ayer → sigue; dos o más días sin jugar → a cero).
         */
        private fun rachaVigente(racha: Int, ultimoDia: String): Int? {
            if (racha <= 0 || ultimoDia.isEmpty()) return null
            val dias = diasDe(ultimoDia) ?: return null
            return if (dias <= 1) racha else null
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
