# Manual de Despliegue y Publicación: voc-backend

Este documento describe los pasos necesarios para desplegar manualmente una nueva versión del proyecto **voc-backend** en Azure App Service.

## Prerrequisitos
* Node.js instalado en el entorno local.
* Acceso al [Portal de Azure](https://portal.azure.com/) con permisos sobre el recurso `voc-backend`.

---

## 1. Generación del Artefacto (Local)

1.  Abre tu terminal.
2.  Accede a la carpeta del proyecto:
    ```bash
    cd backend
    ```
3.  Ejecuta el comando de compilación:
    ```bash
    npm run build
    ```
4.  Ubica la carpeta generada **`dist`**.
5.  Comprime el contenido de dicha carpeta en un archivo llamado **`dist.zip`**.

> **Nota:** Asegúrate de comprimir los archivos necesarios para producción.

---

## 2. Acceso a Azure App Service

1.  Ingresa a [https://portal.azure.com/](https://portal.azure.com/).
2.  Busca y selecciona el App Service: **`voc-backend`**.

---

## 3. Acceso a la Consola Kudu

1.  En el menú lateral izquierdo, busca la sección **Herramientas de desarrollo**.
2.  Selecciona **Herramientas avanzadas**.
3.  Haz clic en el enlace **Ir** (Go). Se abrirá una nueva pestaña.

---

## 4. Carga de Archivos

1.  En la barra superior de la nueva ventana (Kudu), selecciona:
    * **Debug Console** > **CMD**.
2.  Navega a través de las carpetas haciendo clic en la lista:
    * `site` > `wwwroot`
3.  Arrastra el archivo **`dist.zip`** desde tu ordenador hacia la parte derecha de la lista de archivos (donde indica "Drag & Drop").
4.  El sistema subirá y **descomprimirá automáticamente** el archivo. Espera a que finalice la carga.

---

## 5. Reinicio del Servicio

1.  Regresa a la pestaña del **Portal de Azure**.
2.  Ve a la sección **Información general** (Overview) en el menú lateral.
3.  Haz clic en el botón **Reiniciar** (Restart) en la barra superior.
4.  Confirma la acción.

**El despliegue ha finalizado.**