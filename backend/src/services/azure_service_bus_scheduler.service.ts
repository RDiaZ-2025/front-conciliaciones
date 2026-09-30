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
        const queue = process.env.AZURE_SERVICE_BUS_QUEUE_NAME?.trim();
        if (!queue) {
            throw new Error('La variable de entorno AZURE_SERVICE_BUS_QUEUE_NAME es requerida y no está configurada o es inválida.');
        }
        this.queueName = queue;
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
        const queue = process.env.AZURE_SERVICE_BUS_QUEUE_NAME?.trim();
        if (!queue) {
            throw new Error('La variable de entorno AZURE_SERVICE_BUS_QUEUE_NAME es requerida y no está configurada o es inválida.');
        }
        this.queueName = queue;

        const connectionString = this.getConnectionString();
        if (!connectionString) {
            throw new Error('La variable de entorno AZURE_SERVICE_BUS_CONNECTION_STRING es requerida y no está configurada o es inválida.');
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
            throw error;
        }
    }

    private ensureSender(): ServiceBusSender {
        if (this.sender) return this.sender;
        this.initClient();
        if (this.sender) {
            return this.sender;
        }
        throw new Error(`[Azure Service Bus] Sender no disponible para cola '${this.queueName}'. Error: ${this.lastError}`);
    }

    async scheduleExecution(scheduleId: string, executeAt: Date): Promise<string> {
        const sender = this.ensureSender();
        try {

            const now = new Date();
            const scheduledTime = executeAt.getTime() <= now.getTime()
                ? new Date(now.getTime() + 1000)
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
            throw error;
        }
    }

    async cancelScheduledExecution(sequenceNumberStr: string | null | undefined): Promise<void> {
        if (!sequenceNumberStr) {
            return;
        }
        const sender = this.ensureSender();

        try {
            const sequenceNumber = Long.fromString(sequenceNumberStr);
            await sender.cancelScheduledMessages(sequenceNumber);
            console.log(`🗑️ [Azure Service Bus] Mensaje programado cancelado (SequenceNumber: ${sequenceNumberStr})`);
        } catch (error: any) {

            console.warn(`⚠️ [Azure Service Bus] No se pudo cancelar el mensaje programado ${sequenceNumberStr}: ${error?.message || error}`);
        }
    }

    startListener(onTrigger: (scheduleId: string) => Promise<void>): void {
        this.triggerCallback = onTrigger;
        if (!this.client) {
            this.initClient();
        }

        if (!this.client) {
            throw new Error('No se pudo inicializar el cliente de Azure Service Bus para el receptor.');
        }

        if (this.isListening) {
            return;
        }

        try {
            this.receiver = this.client.createReceiver(this.queueName);
            this.isListening = true;

            this.receiver.subscribe({
                processMessage: async (message: any) => {
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
                processError: async (args: any) => {
                    this.lastError = `receiver error: ${args.error?.message || args.error}`;
                    console.error(`❌ [Azure Service Bus] Error en el receptor de la cola ${this.queueName}:`, args.error);
                }
            });

            console.log(`👂 [Azure Service Bus] Receptor escuchando activamente mensajes en la cola: ${this.queueName}`);
        } catch (error: any) {
            this.lastError = `startListener error: ${error?.message || error}`;
            console.error('❌ [Azure Service Bus] Error iniciando receptor:', error);
            throw error;
        }
    }

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
