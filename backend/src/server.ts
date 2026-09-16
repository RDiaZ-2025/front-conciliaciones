import 'reflect-metadata';
import { validateEnv } from './config/env.config';

process.env.TZ = 'America/Bogota';

// Cargar y validar variables de entorno antes de importar otros módulos
validateEnv();

import app from './app';
import { AppDataSource } from './config/typeorm.config';
import { azureServiceBusSchedulerService } from './services/azure_service_bus_scheduler.service';
import { NocNewsSchedulerService } from './services/noc_news_scheduler.service';

const PORT = process.env.PORT || 22741;

// Función para iniciar el servidor
const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos con TypeORM
    try {
      await AppDataSource.initialize();
      console.log('✅ Base de datos conectada');

      // Iniciar receptor de Azure Service Bus para agendamientos de noticias
      const nocNewsSchedulerService = new NocNewsSchedulerService();
      azureServiceBusSchedulerService.startListener(async (scheduleId: string) => {
        console.log(`⚡ [Scheduler Auto-Trigger] Disparando generación automática para: ${scheduleId}`);
        await nocNewsSchedulerService.executeSchedule(scheduleId);
      });
    } catch (error) {
      console.error('❌ Error conectando a la base de datos (iniciando servidor sin DB):', error);
    }

    // Iniciar el servidor
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`);
      console.log(`📝 Ambiente: ${process.env.NODE_ENV}`);
    });

    // Manejo de cierre graceful
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor...`);
      server.close(async () => {
        console.log('✅ Servidor HTTP cerrado');
        try {
          await azureServiceBusSchedulerService.close();
          if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('✅ Conexión TypeORM cerrada');
          }
          process.exit(0);
        } catch (error) {
          console.error('❌ Error cerrando TypeORM / Service Bus:', error);
          process.exit(1);
        }
      });
    };

    // Escuchar señales de cierre
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejo de errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('❌ Excepción no capturada:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promesa rechazada no manejada en:', promise, 'razón:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();