import { AppDataSource } from '../config/typeorm.config';
import { User } from '../models/User';

const TARGET_EMAILS = [
  'michael.velasco.amaya@gmail.com',
  'ener28@hotmail.com'
];

async function setAdminRole() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);

  for (const email of TARGET_EMAILS) {
    const user = await repo.findOne({ where: { email } });

    if (!user) {
      console.log(`❌ Usuario no encontrado: ${email}`);
      continue;
    }

    const prevRole = user.role;
    user.role = 'admin';
    await repo.save(user);

    console.log(`✅ Rol actualizado para ${email}: '${prevRole}' → 'admin'`);
  }

  await AppDataSource.destroy();
  console.log('\n✅ Proceso finalizado.');
}

setAdminRole().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
