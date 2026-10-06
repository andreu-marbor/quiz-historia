/**
 * Mini-ayudante de pruebas (sin frameworks), patrón de `tres-en-raya/pruebas/`.
 * Cada `comprobar` imprime el resultado; `finalizar` sale con código 1 si algo falló.
 */

let fallos = 0;
let comprobaciones = 0;

export function seccion(titulo: string): void {
  console.log(`\n${titulo}`);
}

export function comprobar(condicion: boolean, mensaje: string): void {
  comprobaciones++;
  if (condicion) {
    console.log(`  ✅ ${mensaje}`);
  } else {
    fallos++;
    console.error(`  ❌ ${mensaje}`);
  }
}

/** Comprueba que al menos un elemento de la lista contiene el fragmento. */
export function incluye(lista: readonly string[], fragmento: string, mensaje: string): void {
  comprobar(
    lista.some((elemento) => elemento.includes(fragmento)),
    `${mensaje} (se buscó "${fragmento}")`,
  );
}

/** Muestra los errores encontrados cuando una comprobación falla. */
export function mostrarSiHay(errores: readonly string[]): void {
  for (const error of errores) console.error(`      → ${error}`);
}

export function finalizar(): void {
  if (fallos === 0) {
    console.log(`\n🎉 TODO OK (${comprobaciones} comprobaciones)`);
    return;
  }
  console.error(`\n💥 ${fallos} fallo(s) de ${comprobaciones} comprobaciones`);
  process.exit(1);
}
