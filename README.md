# CFDI Batch

Descarga masiva de CFDI (XML y PDF) del [SAT México](https://portalcfdi.facturaelectronica.sat.gob.mx).

Basado en la extensión original de [Eduardo Aranda Hernández](https://github.com/eduardoarandah/DescargaMasivaCFDIChrome), actualizada y mejorada.

> **Créditos y derechos**: Este proyecto es un fork del trabajo original de [Ing. Eduardo Aranda Hernández](https://eduardoarandah.github.io/). Todos los derechos sobre el concepto y código original le pertenecen a él. Si esta extensión te ha sido útil, considera [hacerle una donación](https://eduardoarandah.github.io/).

---

## Instalación

1. Descarga o clona este repositorio
2. Abre Chrome y ve a `chrome://extensions/`
3. Activa **Developer mode** (interruptor arriba a la derecha)
4. Click en **Load unpacked**
5. Selecciona la carpeta `cfdi-batch`

Para actualizar después de cambios: click en el botón **↺** en la tarjeta de la extensión.

---

## Cómo usar

1. Ve al portal del SAT: `https://portalcfdi.facturaelectronica.sat.gob.mx`
2. Inicia sesión y busca tus facturas (filtrando por mes y año)
3. Click en el ícono de la extensión
4. Click en **Descargar PDF** (o XML según necesites)
5. Los archivos se descargan automáticamente uno por uno

### Descarga de múltiples meses

No tienes que esperar a que termine un mes para iniciar el siguiente:

1. Busca enero → click **Descargar PDF** → empieza a descargar
2. Sin esperar, busca febrero → click **Descargar PDF** → se agrega a la cola
3. La extensión termina enero completo y luego sigue con febrero automáticamente

### Organización por carpetas

Los archivos se guardan automáticamente en subcarpetas por año y mes dentro de tu carpeta de descargas:

```
Descargas/
  2024/
    01/
      CB671D07-...-99E6-BCF44D197088.pdf
      34299D36-...-A4D9-390C78A65DE3.pdf
    02/
      ...
    03/
      ...
```

---

## Comportamiento de la cola

- La cola corre en el **background** — cerrar el popup NO cancela las descargas
- El ícono de la extensión muestra cuántos archivos faltan en la cola
- Al terminar, el ícono muestra **OK** en verde
- **Limpiar cola** resetea todo

### Progreso por mes

El popup muestra un desglose en tiempo real por cada mes encolado:

```
45 / 200 descargados
155 restantes en cola

Enero 2024     45 / 100  ████████░░
Febrero 2024    0 / 100  ░░░░░░░░░░
```

- Cada mes tiene su propia barra de progreso
- Al completarse un mes, su fila se pone en verde
- El desglose se oculta automáticamente cuando no hay cola activa

---

## Cambios respecto al original

| | Original (v0.23) | CFDI Batch (v0.24) |
|---|---|---|
| Manifest | v2 (obsoleto) | v3 |
| Downloads | Corren en el popup — cerrar = cancelar | Corren en background — siempre persisten |
| Multi-mes | Hay que esperar a que termine cada mes | Se pueden encolar varios meses sin esperar |
| Carpetas | Todo en la raíz de Descargas | Subcarpetas por `año/mes/` automáticamente |
| Progreso | Solo visible con el popup abierto | Badge en el ícono siempre visible |
| Desglose | Sin desglose | Progreso por mes con barra visual |

---

## Pendiente

- [ ] Persistencia de cola (guardar en storage para reanudar tras reinicio del navegador)
