# Guía de desarrollo

## Mapa de archivos

| Archivo | Responsabilidad | Depende de |
| --- | --- | --- |
| `Código.js` | Crea el menú **Writing Tools** mediante `onOpen()`. | Funciones públicas de los tres módulos |
| `WordCounter.js` | Recorre pestañas, aplica reglas y calcula palabras. | `WcCounter.html` |
| `WcCounter.html` | Presenta el total y el desglose por pestaña. | Datos de `WordCounter.js` |
| `TabComparaison.js` | Lee pestañas y relaciona párrafos entre versiones. | `DiffTracker.html` |
| `DiffTracker.html` | Muestra la comparación y su leyenda visual. | `compareDocumentTabs()` |
| `HtmlExport.js` | Convierte elementos de la pestaña activa a HTML. | `Sidebar.html` |
| `Sidebar.html` | Muestra, transforma y copia el HTML generado. | `getCurrentTabHtml()` |
| `appsscript.json` | Configura zona horaria, runtime V8 y registro de errores. | Google Apps Script |

## Entradas públicas

El menú principal llama a estas funciones:

```text
countWordsWithCustomRules()
openParagraphTracker()
openHtmlExportSidebar()
```

Si se cambia uno de esos nombres, también debe actualizarse `Código.js`.

## Flujo local recomendado

Antes de trabajar, descarga la versión actual desde Apps Script:

```powershell
clasp pull
git status
```

Después de editar:

```powershell
clasp push
git add .
git commit -m "Describe el cambio"
git push
```

No subas `.clasp.json`: identifica el proyecto personal de Apps Script y está ignorado por Git.

## Comprobación manual

Antes de publicar un cambio:

1. Abre un Google Doc de prueba.
2. Recarga el documento y confirma que aparece **Writing Tools**.
3. Ejecuta el contador con pestañas normales, anidadas y excluidas.
4. Compara dos pestañas con párrafos iguales, nuevos, movidos, editados y divididos.
5. Exporta una pestaña con encabezados, estilos, enlaces y una tabla.
6. Revisa el registro de ejecución de Apps Script si ocurre un error.

## Convenciones actuales

- Código del servidor: JavaScript compatible con el runtime V8 de Apps Script.
- Interfaces: HTML, CSS y JavaScript incluidos en cada archivo HTML.
- Funciones de menú: nombres estables y descriptivos.
- Comentarios: breves y centrados en reglas no evidentes.
- Datos de demostración: únicamente contenido ficticio.
