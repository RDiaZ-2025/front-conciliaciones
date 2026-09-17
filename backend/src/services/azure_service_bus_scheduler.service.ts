import { ServiceBusClient, ServiceBusSender, ServiceBusReceiver, ServiceBusMessage } from '@azure/service-bus';
import Long from 'long';
import WebSocket from 'ws';

export class AzureServiceBusSchedulerService {
    private client: ServiceBusClient | null = null;
    private sender: ServiceBusSender | null = null;
    private receiver: ServiceBusReceiver | null = null;
    private queueName: string;
    private isListening = false;

    constructor() {
        const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
        this.queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME || 'noc-news-schedules';

        if (connectionString && connectionString.trim() !== '') {
            try {
                // En entornos de producción restringidos (como el sandbox de Azure App Service con Windows/iisnode),
                // el puerto TCP 5671 nativo de AMQP está bloqueado por el firewall del sandbox.
                // Forzamos AMQP sobre WebSockets (puerto 443 estándar HTTPS/WSS) usando el paquete 'ws'
                // para garantizar conectividad total en Node.js 20+.
                this.client = new ServiceBusClient(connectionString, {
                    webSocketOptions: {
                        webSocket: WebSocket as any
                    }
                });
                this.sender = this.client.createSender(this.queueName);
                console.log(`✅ [Azure Service Bus] Cliente inicializado sobre WebSockets (puerto 443 vía ws) para la cola: ${this.queueName}`);
            } catch (error) {
                console.error('❌ [Azure Service Bus] Error inicializando cliente:', error);
                this.client = null;
                this.sender = null;
            }
        } else {
            console.log('ℹ️ [Azure Service Bus] No se configuró AZURE_SERVICE_BUS_CONNECTION_STRING. El agendamiento autónomo en la nube permanecerá inactivo hasta configurar el .env.');
        }
    }

    /**
     * Programa un mensaje en Azure Service Bus para ser entregado en la fecha y hora exacta.
     * @param scheduleId ID del agendamiento a ejecutar
     * @param executeAt Fecha y hora de ejecución (Date)
     * @returns Número de secuencia del mensaje programado (string) o null si Service Bus no está configurado.
     */
    async scheduleExecution(scheduleId: string, executeAt: Date): Promise<string | null> {
        if (!this.sender) {
            return null;
        }

        try {
            // Aseguramos que la fecha sea futura
            const now = new Date();
            const scheduledTime = executeAt.getTime() <= now.getTime() 
                ? new Date(now.getTime() + 1000) // 1 segundo en el futuro si ya venció
                : executeAt;

            const message: ServiceBusMessage = {
                body: { scheduleId },
                contentType: 'application/json',
                messageId: `noc-sched-${scheduleId}-${scheduledTime.getTime()}`
            };

            const sequenceNumbers = await this.sender.scheduleMessages(message, scheduledTime);
            const seqNumberStr = sequenceNumbers[0].toString();
            console.log(`⏰ [Azure Service Bus] Mensaje programado para agendamiento ${scheduleId} a las ${scheduledTime.toISOString()} (SequenceNumber: ${seqNumberStr})`);
            return seqNumberStr;
        } catch (error) {
            console.error(`❌ [Azure Service Bus] Error programando mensaje para agendamiento ${scheduleId}:`, error);
            return null;
        }
    }

    /**
     * Cancela un mensaje programado en Azure Service Bus usando su SequenceNumber.
     * @param sequenceNumberStr Número de secuencia en string
     */
    async cancelScheduledExecution(sequenceNumberStr: string | null | undefined): Promise<void> {
        if (!this.sender || !sequenceNumberStr) {
            return;
        }

        try {
            const sequenceNumber = Long.fromString(sequenceNumberStr);
            await this.sender.cancelScheduledMessages(sequenceNumber);
            console.log(`🗑️ [Azure Service Bus] Mensaje programado cancelado (SequenceNumber: ${sequenceNumberStr})`);
        } catch (error: any) {
            // Si el mensaje ya fue entregado o no existe, no rompemos el flujo
            console.warn(`⚠️ [Azure Service Bus] No se pudo cancelar el mensaje programado ${sequenceNumberStr}: ${error?.message || error}`);
        }
    }

    /**
     * Inicia el receptor AMQP en segundo plano para procesar los mensajes cuando Azure los entrega.
     * @param onTrigger Callback que ejecuta el agendamiento (recibe scheduleId)
     */
    startListener(onTrigger: (scheduleId: string) => Promise<void>): void {
        if (!this.client || this.isListening) {
            return;
        }

        try {
            this.receiver = this.client.createReceiver(this.queueName);
            this.isListening = true;

            this.receiver.subscribe({
                processMessage: async (message) => {
                    const body = message.body;
                    const scheduleId = body?.scheduleId;

                    if (scheduleId) {
                        console.log(`⚡ [Azure Service Bus] Mensaje entregado por Azure para agendamiento: ${scheduleId}`);
                        try {
                            await onTrigger(scheduleId);
                        } catch (err) {
                            console.error(`❌ [Azure Service Bus] Error ejecutando agendamiento ${scheduleId} desde mensaje:`, err);
                        }
                    }
                },
                processError: async (args) => {
                    console.error(`❌ [Azure Service Bus] Error en el receptor de la cola ${this.queueName}:`, args.error);
                }
            });

            console.log(`👂 [Azure Service Bus] Receptor escuchando activamente mensajes en la cola: ${this.queueName}`);
        } catch (error) {
            console.error('❌ [Azure Service Bus] Error iniciando receptor:', error);
        }
    }

    /**
     * Cierra de manera ordenada todas las conexiones AMQP con Azure Service Bus.
     */
    async close(): Promise<void> {
        try {
            if (this.receiver) {
                await this.receiver.close();
                this.receiver = null;
            }
            if (this.sender) {
                await this.sender.close();
                this.sender = null;
            }
            if (this.client) {
                await this.client.close();
                this.client = null;
            }
            this.isListening = false;
            console.log('✅ [Azure Service Bus] Conexiones cerradas correctamente');
        } catch (error) {
            console.error('❌ [Azure Service Bus] Error cerrando conexiones:', error);
        }
    }
}

export const azureServiceBusSchedulerService = new AzureServiceBusSchedulerService();
