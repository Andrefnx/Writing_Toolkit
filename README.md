# Writing Toolkit

![Estado: en desarrollo](https://img.shields.io/badge/estado-en%20desarrollo-f59e0b)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=googleappsscript&logoColor=white)
![Google Docs](https://img.shields.io/badge/Google%20Docs-4285F4?logo=googledocs&logoColor=white)

![Portada de Writing Toolkit](docs/assets/writing-toolkit-cover.svg)

Writing Toolkit es una colección experimental de herramientas complementarias para escribir y revisar textos dentro de Google Docs. Agrega un menú propio al documento para contar palabras con reglas personalizadas, comparar versiones guardadas en pestañas y convertir contenido a HTML.

> [!IMPORTANT]
> El proyecto todavía está en desarrollo. No reemplaza las funciones nativas de Google Docs ni una revisión editorial, ortográfica o humana. Está pensado como apoyo para organizar, escribir y revisar borradores.

## Funciones

| Herramienta | Para qué sirve |
| --- | --- |
| **Count Words** | Cuenta las palabras del documento y muestra un desglose por pestaña. Excluye encabezados y permite omitir pestañas auxiliares. |
| **Compare Document Tabs** | Compara dos pestañas por párrafos y señala contenido nuevo, eliminado, modificado, movido o dividido. |
| **Export to HTML** | Convierte la pestaña activa a HTML y permite copiar el resultado desde una barra lateral. |

## Muestra

Las imágenes de demostración usan texto público inspirado en *The Little Prince* y contenido ficticio preparado para el README. No contienen borradores privados ni textos personales.

### Conteo de palabras

![Demo pública del contador de palabras](docs/assets/word-count-demo.svg)

El contador presenta el total del documento y el desglose por pestaña para revisar rápidamente la distribución del borrador.

### Comparación de versiones

![Demo pública de comparación de pestañas](docs/assets/compare-demo.svg)

La comparación enfrenta una versión original y una revisión, destacando párrafos modificados, movidos, divididos, nuevos o eliminados.

## Instalación

Writing Toolkit funciona como un proyecto de Apps Script vinculado a un documento de Google Docs. Instálalo primero en un documento de prueba.

### Opción 1: instalación manual

1. Abre el documento de Google Docs donde quieras utilizar el toolkit.
2. Ve a **Extensiones → Apps Script**.
3. Copia los archivos del repositorio al proyecto manteniendo estos nombres:
   - `Código.gs` ← contenido de `Código.js`
   - `WordCounter.gs` ← contenido de `WordCounter.js`
   - `TabComparaison.gs` ← contenido de `TabComparaison.js`
   - `HtmlExport.gs` ← contenido de `HtmlExport.js`
   - `WcCounter.html`
   - `DiffTracker.html`
   - `Sidebar.html`
4. Guarda el proyecto.
5. Regresa al documento y vuelve a cargar la página.
6. Aparecerá el menú **Writing Tools** en la barra superior.
7. Ejecuta una herramienta y concede los permisos solicitados por Google la primera vez.

### Opción 2: instalación con clasp

Requiere Node.js 20 o superior, Git y la herramienta oficial `clasp`.

```powershell
git clone https://github.com/Andrefnx/Writing_Toolkit.git
cd Writing_Toolkit
npm install -g @google/clasp
clasp login
```

Después crea o abre un documento de prueba, entra en **Extensiones → Apps Script**, copia el **ID de secuencia de comandos** y crea un archivo local `.clasp.json`:

```json
{
  "scriptId": "PEGA_AQUI_TU_ID",
  "rootDir": ""
}
```

Envía los archivos con:

```powershell
clasp push
```

> [!WARNING]
> `clasp push` reemplaza los archivos del proyecto de Apps Script conectado. Utiliza primero un documento de prueba o un proyecto vacío.

## Cómo usarlo

### Contar palabras

1. Abre **Writing Tools → Count Words**.
2. Espera a que termine el análisis.
3. Revisa el total y el desglose de cada pestaña.

Reglas actuales:

- omite completamente las pestañas llamadas `Scenes`, `CUT` y `Originals`;
- en una pestaña llamada `Draft`, cuenta sus pestañas hijas, no el contenido del contenedor;
- excluye títulos, subtítulos y encabezados;
- incluye encabezados de página, pies de página y notas al pie;
- separa palabras por espacios, guiones y rayas.

Estas reglas todavía están definidas directamente en `WordCounter.js`.

### Comparar pestañas

1. Guarda la versión original y la revisada en dos pestañas del mismo documento.
2. Abre **Writing Tools → Compare Document Tabs**.
3. Selecciona la pestaña de origen a la izquierda.
4. Selecciona la versión revisada a la derecha.
5. Pulsa **Compare**.

La vista utiliza colores y relaciones de párrafos para mostrar texto eliminado, texto nuevo, párrafos movidos o divididos, modificaciones, reescrituras y párrafos que permanecen iguales. La comparación es heurística y los resultados deben revisarse antes de tomar decisiones editoriales.

### Exportar a HTML

1. Activa la pestaña que quieres exportar.
2. Abre **Writing Tools → Export to HTML**.
3. Revisa el HTML generado en la barra lateral.
4. Pulsa **Copy HTML**.

Actualmente conserva encabezados, alineación, negrita, cursiva, subrayado, tachado, enlaces y tablas básicas. También permite transformar texto pegado manualmente en párrafos HTML.

## Estructura del proyecto

```text
Writing_Toolkit/
├── Código.js
├── WordCounter.js
├── WcCounter.html
├── TabComparaison.js
├── DiffTracker.html
├── HtmlExport.js
├── Sidebar.html
├── appsscript.json
└── docs/
    ├── DEVELOPMENT.md
    └── assets/
        ├── writing-toolkit-cover.svg
        ├── word-count-demo.svg
        └── compare-demo.svg
```

## Estado y limitaciones

- Proyecto en desarrollo activo.
- No existe todavía una versión estable.
- La interfaz está principalmente en inglés.
- Las reglas del contador aún no se configuran desde la interfaz.
- La comparación puede producir coincidencias imperfectas en textos muy reescritos.
- La exportación HTML no reproduce todo el formato posible de Google Docs.
- No hay instalación automática ni publicación como complemento de Google Workspace.

## Desarrollo

Consulta `docs/DEVELOPMENT.md` para conocer la función de cada archivo y el flujo recomendado con `clasp` y Git.

## Autor

Desarrollado por Andrea Henríquez como herramienta complementaria para escritura y revisión en Google Docs.
