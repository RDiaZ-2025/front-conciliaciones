import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

import app from './app';
import { AppDataSource } from './config/typeorm.config';

const PORT = process.env.PORT || 8246;

// Función para iniciar el servidor
const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos con TypeORM
    await AppDataSource.initialize();

    // Iniciar el servidor
    const server = app.listen(PORT, () => {
      // Server started
    });

    // Manejo de cierre graceful
    const gracefulShutdown = async (signal: string): Promise<void> => {
      
      server.close(async () => {
        
        try {
          await AppDataSource.destroy();
          process.exit(0);
        } catch (error) {
          console.error('❌ Error cerrando TypeORM:', error);
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