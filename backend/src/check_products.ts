import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { Product } from './models/Product';

async function listProducts() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(Product);
        const products = await repo.find();
        console.log("PRODUCTS IN DATABASE:");
        console.log(JSON.stringify(products, null, 2));
        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

listProducts();
