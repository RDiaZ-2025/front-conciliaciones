import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

import app from './app';
import { connectDB, closeDB } from './config/database';

const PORT = process.env.PORT || 8246;

// Función para iniciar el servidor
const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos
    console.log('🔄 Conectando a la base de datos...');
    await connectDB();
    console.log('✅ Base de datos conectada exitosamente');

    // Iniciar el servidor
    const server = app.listen(PORT, () => {
      console.log('🚀 Servidor iniciado exitosamente');
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    // Manejo de cierre graceful
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor...`);
      
      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');
        
        try {
          await closeDB();
          console.log('✅ Conexión a base de datos cerrada');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error cerrando la base de datos:', error);
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