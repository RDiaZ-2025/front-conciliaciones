import { AppDataSource } from '../config/typeorm.config';
import { ProductionService } from '../services/production.service';

const productionService = new ProductionService();

async function testSubmission() {
    await AppDataSource.initialize();
    
    // Exact values from frontend click event
    const values = {
        test1: 'Michael QA',
        test2: 'michael.velasco.amaya@gmail.com',
        test3: '',
        campo_1783301903276: '',
        campo_1783348303562: '',
        campo_1783348375809: '',
        campo_1783348449386: '', // Nombre del cliente (Required, but we try with empty string)
        campo_1783348479831: '123123123',
        campo_1783348535315: '',
        campo_1783348640381: 'asdasd',
        campo_1783348720950: 'asd',
    };
    
    try {
        console.log('Intentando simular con payload idéntico al front...');
        const submission = await productionService.createSubmission(2, 91, values);
        console.log('¡Éxito! Solicitud creada:', submission);
    } catch (error) {
        console.error('¡ERROR AL CREAR SOLICITUD!');
        console.error(error);
    }
    
    await AppDataSource.destroy();
}

testSubmission().catch(console.error);
