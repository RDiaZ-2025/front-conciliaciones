import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { ClaroPreset } from '../../public/ClaroPreset';



import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor';
import { DialogService } from 'primeng/dynamicdialog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: ClaroPreset,
        options: {
          darkModeSelector: '.my-app-dark'
        }
      },
      translation: {
        startsWith: 'Comienza con',
        contains: 'Contiene',
        notContains: 'No contiene',
        endsWith: 'Termina con',
        equals: 'Igual a',
        notEquals: 'Diferente de',
        noFilter: 'Sin filtro',
        lt: 'Menor que',
        lte: 'Menor o igual que',
        gt: 'Mayor que',
        gte: 'Mayor o igual que',
        is: 'Es',
        isNot: 'No es',
        before: 'Antes',
        after: 'Después',
        dateIs: 'Fecha es',
        dateIsNot: 'Fecha no es',
        dateBefore: 'Fecha es anterior',
        dateAfter: 'Fecha es posterior',
        clear: 'Limpiar',
        apply: 'Aplicar',
        matchAll: 'Coincidir todo',
        matchAny: 'Coincidir cualquiera',
        addRule: 'Agregar regla',
        removeRule: 'Eliminar regla',
        accept: 'Aceptar',
        reject: 'Rechazar',
        choose: 'Seleccionar',
        upload: 'Subir',
        cancel: 'Cancelar',
        fileSizeTypes: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
        monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        today: 'Hoy',
        weekHeader: 'Sm',
        firstDayOfWeek: 1,
        dateFormat: 'dd/mm/yy',
        weak: 'Débil',
        medium: 'Medio',
        strong: 'Fuerte',
        passwordPrompt: 'Escriba una contraseña',
        emptyFilterMessage: 'No se encontraron resultados',
        searchMessage: '{0} resultados disponibles',
        selectionMessage: '{0} elementos seleccionados',
        emptySelectionMessage: 'No hay elementos seleccionados',
        emptySearchMessage: 'No se encontraron resultados',
        emptyMessage: 'No hay registros disponibles',
        aria: {
          trueLabel: 'Verdadero',
          falseLabel: 'Falso',
          nullLabel: 'No seleccionado',
          pageLabel: 'Página {page}',
          firstPageLabel: 'Primera página',
          lastPageLabel: 'Última página',
          nextPageLabel: 'Siguiente página',
          previousPageLabel: 'Página anterior',
          selectAll: 'Seleccionar todo',
          unselectAll: 'Deseleccionar todo',
          selectRow: 'Seleccionar fila',
          unselectRow: 'Deseleccionar fila',
          expandRow: 'Expandir fila',
          collapseRow: 'Colapsar fila'
        }
      }
    }),
    // CoreDialogService
    DialogService
  ]
};
