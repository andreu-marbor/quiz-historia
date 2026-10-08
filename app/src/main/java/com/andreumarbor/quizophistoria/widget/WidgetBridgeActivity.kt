/*
 * §13.3 · Puente entre la web y el widget de la racha.
 *
 * La web vive dentro de Chrome y no puede escribir en las `SharedPreferences`
 * de la app, así que manda un `intent://` con la racha como extras. Esta
 * actividad es el receptor: valida el dato, lo guarda y manda al widget que se
 * repinte. Transparente y `noHistory`: solo vive el tiempo de guardar.
 *
 * Es `exported="true"` (la abre Chrome desde la web), así que TODO lo que llega
 * se valida antes de tocar nada: el daño de un intent malicioso sería solo
 * cosmético (un número falso en el widget), pero igual no se cree nada.
 *
 * Las fuentes viven en `android/widget/` y se copian a `app/` con
 * `node scripts/aplicar-widget.mjs` (nunca a mano: `app/` es generado).
 */
package com.andreumarbor.quizophistoria.widget

import android.app.Activity
import android.content.Context
import android.os.Bundle

class WidgetBridgeActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val validado = validar(
            intent.getStringExtra(EXTRA_RACHA),
            intent.getStringExtra(EXTRA_ULTIMO_DIA),
        )
        if (validado != null) {
            getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE)
                .edit()
                .putInt(CLAVE_RACHA, validado.first)
                .putString(CLAVE_ULTIMO_DIA, validado.second)
                .apply()
            WidgetRachaProvider.actualizarTodos(this)
        }

        finish()
    }

    companion object {
        const val PREFERENCIAS = "widget_racha"
        const val CLAVE_RACHA = "racha"
        const val CLAVE_ULTIMO_DIA = "ultimoDia"

        private const val EXTRA_RACHA = "racha"
        private const val EXTRA_ULTIMO_DIA = "ultimoDia"

        /** `YYYY-MM-DD`: mismo formato que la web (`fechaLocal()` de persistencia). */
        private val FORMATO_FECHA = Regex("^\\d{4}-\\d{2}-\\d{2}$")

        /**
         * Valida los extras del intent: entero 0–9999 y fecha `YYYY-MM-DD`
         * (o vacía, que significa «sin último día»). Devuelve `null` si el
         * intent no sirve para nada.
         */
        fun validar(racha: String?, ultimoDia: String?): Pair<Int, String>? {
            val numero = racha?.trim()?.toIntOrNull() ?: return null
            if (numero < 0 || numero > 9999) return null
            val fecha = ultimoDia?.trim().orEmpty()
            if (fecha.isNotEmpty() && !FORMATO_FECHA.matches(fecha)) return null
            return numero to fecha
        }
    }
}
