import { ServiceBusClient, ServiceBusSender, ServiceBusReceiver, ServiceBusMessage } from '@azure/service-bus';
import Long from 'long';
import WebSocket from 'ws';

export class AzureServiceBusSchedulerService {
    private client: ServiceBusClient | null = null;
    private sender: ServiceBusSender | null = null;
    private receiver: ServiceBusReceiver | null = null;
    private queueName: string;
    private isListening = false;
    private lastError: string | null = null;
    private detectedVarName: string | null = null;
    private triggerCallback: ((scheduleId: string) => Promise<void>) | null = null;

    constructor() {
        this.queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME || 'noc-news-schedules';
        this.initClient();
    }

    private getConnectionString(): string | null {
        const candidateKeys = [
            'AZURE_SERVICE_BUS_CONNECTION_STRING',
            'CUSTOMCONNSTR_AZURE_SERVICE_BUS_CONNECTION_STRING',
            'SERVICEBUSCONNSTR_AZURE_SERVICE_BUS_CONNECTION_STRING',
            'SERVICE_BUS_CONNECTION_STRING',
            'CUSTOMCONNSTR_SERVICE_BUS_CONNECTION_STRING',
            'SERVICEBUSCONNSTR_SERVICE_BUS_CONNECTION_STRING',
            'AZURE_SERVICEBUS_CONNECTIONSTRING',
            'CUSTOMCONNSTR_AZURE_SERVICEBUS_CONNECTIONSTRING',
            'SERVICEBUS_CONNECTION_STRING'
        ];

        for (const key of candidateKeys) {
            const val = process.env[key];
            if (val && val.trim() !== '') {
                this.detectedVarName = key;
                return val.trim();
            }
        }

        this.detectedVarName = null;
        return null;
    }

    private initClient(): boolean {
        const connectionString = this.getConnectionString();
        this.queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME || 'noc-news-schedules';

        if (!connectionString) {
            console.log('ℹ️ [Azure Service Bus] No se configuró ninguna variable de Connection String para Service Bus.');
            return false;
        }

        try {
            this.client = new ServiceBusClient(connectionString, {
                webSocketOptions: {
                    webSocket: WebSocket as any
                }
            });
            this.sender = this.client.createSender(this.queueName);
            this.lastError = null;
            console.log(`✅ [Azure Service Bus] Cliente inicializado sobre WebSockets (puerto 443 vía ws) usando variable '${this.detectedVarName}' para cola '${this.queueName}'`);
            return true;
        } catch (error: any) {
            this.lastError = error?.message || String(error);
            console.error('❌ [Azure Service Bus] Error inicializando cliente:', error);
            this.client = null;
            this.sender = null;
            return false;
        }
    }

    private ensureSender(): ServiceBusSender | null {
        if (this.sender) return this.sender;
        if (this.initClient() && this.sender) {
            return this.sender;
        }
        return null;
    }

    /**
     * Programa un mensaje en Azure Service Bus para ser entregado en la fecha y hora exacta.
     * @param scheduleId ID del agendamiento a ejecutar
     * @param executeAt Fecha y hora de ejecución (Date)
     * @returns Número de secuencia del mensaje programado (string) o null si Service Bus no está configurado.
     */
    async scheduleExecution(scheduleId: string, executeAt: Date): Promise<string | null> {
        const sender = this.ensureSender();
        if (!sender) {
            console.warn(`⚠️ [Azure Service Bus] No se puede agendar ${scheduleId}: sender no disponible. Variable detectada: ${this.detectedVarName}, Error: ${this.lastError}`);
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

            const sequenceNumbers = await sender.scheduleMessages(message, scheduledTime);
            const seqNumberStr = sequenceNumbers[0].toString();
            this.lastError = null;
            console.log(`⏰ [Azure Service Bus] Mensaje programado para agendamiento ${scheduleId} a las ${scheduledTime.toISOString()} (SequenceNumber: ${seqNumberStr})`);
            return seqNumberStr;
        } catch (error: any) {
            this.lastError = `scheduleMessages error: ${error?.message || error}`;
            console.error(`❌ [Azure Service Bus] Error programando mensaje para agendamiento ${scheduleId}:`, error);
            return null;
        }
    }

    /**
     * Cancela un mensaje programado en Azure Service Bus usando su SequenceNumber.
     * @param sequenceNumberStr Número de secuencia en string
     */
    async cancelScheduledExecution(sequenceNumberStr: string | null | undefined): Promise<void> {
        const sender = this.ensureSender();
        if (!sender || !sequenceNumberStr) {
            return;
        }

        try {
            const sequenceNumber = Long.fromString(sequenceNumberStr);
            await sender.cancelScheduledMessages(sequenceNumber);
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
        this.triggerCallback = onTrigger;
        if (!this.client) {
            this.initClient();
        }

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
                            if (this.triggerCallback) {
                                await this.triggerCallback(scheduleId);
                            }
                        } catch (err) {
                            console.error(`❌ [Azure Service Bus] Error ejecutando agendamiento ${scheduleId} desde mensaje:`, err);
                        }
                    }
                },
                processError: async (args) => {
                    this.lastError = `receiver error: ${args.error?.message || args.error}`;
                    console.error(`❌ [Azure Service Bus] Error en el receptor de la cola ${this.queueName}:`, args.error);
                }
            });

            console.log(`👂 [Azure Service Bus] Receptor escuchando activamente mensajes en la cola: ${this.queueName}`);
        } catch (error: any) {
            this.lastError = `startListener error: ${error?.message || error}`;
            console.error('❌ [Azure Service Bus] Error iniciando receptor:', error);
        }
    }

    /**
     * Devuelve el estado de diagnóstico de la conexión para monitoreo (/health).
     */
    getStatus() {
        let wsModuleStatus = 'unknown';
        try {
            wsModuleStatus = typeof WebSocket === 'function' ? 'loaded' : 'not_a_function';
        } catch (e: any) {
            wsModuleStatus = `error: ${e?.message || e}`;
        }

        return {
            hasConnectionString: !!this.getConnectionString(),
            detectedEnvVar: this.detectedVarName,
            queueName: this.queueName,
            clientInitialized: !!this.client,
            senderReady: !!this.sender,
            receiverListening: this.isListening,
            wsModuleStatus,
            lastError: this.lastError
        };
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
