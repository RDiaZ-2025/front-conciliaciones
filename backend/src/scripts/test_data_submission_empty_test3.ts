import { AppDataSource } from '../config/typeorm.config';
import { ProductionService } from '../services/production.service';

const productionService = new ProductionService();

async function testSubmission() {
    await AppDataSource.initialize();
    
    // We send test3 as empty string (or not sent)
    const values = {
        test1: 'Luisa Fajardo',
        test2: 'luisa.fajardo@claro.com.co',
        test3: '', // empty
        campo_1783348449386: 'Cliente de Prueba',
        campo_1783348479831: '123123123',
        campo_1783348535315: 'Descripción',
        campo_1783348640381: 'asdasd',
        campo_1783348720950: 'asd',
    };
    
    try {
        console.log('Intentando simular con test3 vacío...');
        const submission = await productionService.createSubmission(2, 46, values);
        console.log('¡Éxito! Solicitud creada:', submission);
    } catch (error) {
        console.error('¡ERROR AL CREAR SOLICITUD!');
        console.error(error);
    }
    
    await AppDataSource.destroy();
}

testSubmission().catch(console.error);
