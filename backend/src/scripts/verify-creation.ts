import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AppDataSource } from '../config/typeorm.config';
import { ProductionRequest } from '../models/ProductionRequest';
import { User } from '../models/User';
import { Team } from '../models/Team';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

async function main() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Connected.');

    const userRepo = AppDataSource.getRepository(User);
    const teamRepo = AppDataSource.getRepository(Team);
    const prodRepo = AppDataSource.getRepository(ProductionRequest);

    // Get a user and a team
    const user = await userRepo.findOne({ where: {} });
    const team = await teamRepo.findOne({ where: {} });

    if (!user || !team) {
      console.error('No user or team found to test with.');
      return;
    }

    console.log(`Testing with User: ${user.name} (ID: ${user.id}) and Team: ${team.name}`);

    // Create a request
    const newRequest = prodRepo.create({
      name: 'Test Request from Script',
      requestDate: new Date(),
      department: team.name,
      contactPerson: user.name,
      assignedTeam: team.name,
      assignedUserId: user.id,
      deliveryDate: new Date(),
      observations: 'Test observation',
      stage: 'request'
    });

    console.log('Saving request...');
    const savedRequest = await prodRepo.save(newRequest);
    console.log('Request saved successfully:', savedRequest);
    console.log('AssignedUserId:', savedRequest.assignedUserId);

    if (savedRequest.assignedUserId !== user.id) {
      console.error('MISMATCH: AssignedUserId is not what was expected.');
    } else {
      console.log('VERIFICATION SUCCESSFUL: AssignedUserId matched.');
    }

    // Clean up
    await prodRepo.remove(savedRequest);
    console.log('Test request deleted.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
