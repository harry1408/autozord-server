import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Shop settings
  await prisma.shopSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      shopName: 'AutoShop360',
      address: '123 Main Street, Springfield, IL 62701',
      phone: '(555) 555-0100',
      email: 'info@autoshop360.com',
      taxRate: 8.5,
      laborRate: 95,
    },
  });

  // Admin user
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@autoshop360.com' },
    update: {},
    create: {
      id: 'seed-admin-001',
      email: 'admin@autoshop360.com',
      passwordHash: adminHash,
      firstName: 'Alex',
      lastName: 'Johnson',
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Manager user
  const managerHash = await bcrypt.hash('Manager@123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@autoshop360.com' },
    update: {},
    create: {
      id: 'seed-manager-001',
      email: 'manager@autoshop360.com',
      passwordHash: managerHash,
      firstName: 'Sarah',
      lastName: 'Williams',
      role: 'MANAGER',
      isActive: true,
    },
  });

  // Technician users
  const techHash = await bcrypt.hash('Tech@123', 10);
  const tech1User = await prisma.user.upsert({
    where: { email: 'mike.tech@autoshop360.com' },
    update: {},
    create: {
      id: 'seed-tech-user-001',
      email: 'mike.tech@autoshop360.com',
      passwordHash: techHash,
      firstName: 'Mike',
      lastName: 'Torres',
      role: 'TECHNICIAN',
      isActive: true,
    },
  });

  const tech2User = await prisma.user.upsert({
    where: { email: 'lisa.tech@autoshop360.com' },
    update: {},
    create: {
      id: 'seed-tech-user-002',
      email: 'lisa.tech@autoshop360.com',
      passwordHash: techHash,
      firstName: 'Lisa',
      lastName: 'Chen',
      role: 'TECHNICIAN',
      isActive: true,
    },
  });

  // Receptionist
  const recHash = await bcrypt.hash('Rec@123', 10);
  await prisma.user.upsert({
    where: { email: 'reception@autoshop360.com' },
    update: {},
    create: {
      id: 'seed-rec-001',
      email: 'reception@autoshop360.com',
      passwordHash: recHash,
      firstName: 'Jordan',
      lastName: 'Smith',
      role: 'RECEPTIONIST',
      isActive: true,
    },
  });

  // Technician profiles
  const tech1 = await prisma.technician.upsert({
    where: { userId: tech1User.id },
    update: {},
    create: {
      id: 'seed-tech-001',
      userId: tech1User.id,
      specializations: 'Engine, Transmission, Brakes',
      hourlyRate: 75,
      isActive: true,
    },
  });

  const tech2 = await prisma.technician.upsert({
    where: { userId: tech2User.id },
    update: {},
    create: {
      id: 'seed-tech-002',
      userId: tech2User.id,
      specializations: 'Electrical, AC, Diagnostics',
      hourlyRate: 80,
      isActive: true,
    },
  });

  // Sample customers
  const customer1 = await prisma.customer.upsert({
    where: { id: 'seed-cust-001' },
    update: {},
    create: {
      id: 'seed-cust-001',
      firstName: 'Robert',
      lastName: 'Martinez',
      email: 'robert.martinez@email.com',
      phone: '(555) 234-5678',
      address: '456 Oak Ave',
      city: 'Springfield',
      state: 'IL',
      zip: '62702',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 'seed-cust-002' },
    update: {},
    create: {
      id: 'seed-cust-002',
      firstName: 'Jennifer',
      lastName: 'Davis',
      email: 'jennifer.davis@email.com',
      phone: '(555) 345-6789',
      address: '789 Pine Street',
      city: 'Springfield',
      state: 'IL',
      zip: '62703',
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { id: 'seed-cust-003' },
    update: {},
    create: {
      id: 'seed-cust-003',
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david.wilson@email.com',
      phone: '(555) 456-7890',
      address: '321 Maple Drive',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
    },
  });

  // Sample vehicles
  const vehicle1 = await prisma.vehicle.upsert({
    where: { id: 'seed-veh-001' },
    update: {},
    create: {
      id: 'seed-veh-001',
      customerId: customer1.id,
      make: 'Toyota',
      model: 'Camry',
      year: 2019,
      vin: '4T1B11HK5KU123456',
      licensePlate: 'ILL-1234',
      color: 'Silver',
      mileage: 45230,
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { id: 'seed-veh-002' },
    update: {},
    create: {
      id: 'seed-veh-002',
      customerId: customer2.id,
      make: 'Honda',
      model: 'CR-V',
      year: 2021,
      vin: '2HKRW2H83MH123456',
      licensePlate: 'ILL-5678',
      color: 'Blue',
      mileage: 28100,
    },
  });

  const vehicle3 = await prisma.vehicle.upsert({
    where: { id: 'seed-veh-003' },
    update: {},
    create: {
      id: 'seed-veh-003',
      customerId: customer3.id,
      make: 'Ford',
      model: 'F-150',
      year: 2018,
      vin: '1FTEW1EP5JFB12345',
      licensePlate: 'ILL-9012',
      color: 'Black',
      mileage: 67890,
    },
  });

  // Sample suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'seed-sup-001' },
    update: {},
    create: {
      id: 'seed-sup-001',
      name: 'AutoParts Pro',
      contact: 'Tom Green',
      phone: '(800) 555-0101',
      email: 'orders@autopartspro.com',
    },
  });

  // Sample parts
  await prisma.part.upsert({
    where: { id: 'seed-part-001' },
    update: {},
    create: {
      id: 'seed-part-001',
      partNumber: 'OIL-5W30-QT',
      name: 'Motor Oil 5W-30 (1 Qt)',
      description: 'Full synthetic motor oil',
      category: 'Fluids',
      unitCost: 7.5,
      sellingPrice: 12.99,
      quantityOnHand: 48,
      minStock: 12,
      supplierId: supplier1.id,
    },
  });

  await prisma.part.upsert({
    where: { id: 'seed-part-002' },
    update: {},
    create: {
      id: 'seed-part-002',
      partNumber: 'FILTER-OIL-UNIV',
      name: 'Oil Filter (Universal)',
      description: 'Premium oil filter',
      category: 'Filters',
      unitCost: 4.5,
      sellingPrice: 8.99,
      quantityOnHand: 30,
      minStock: 10,
      supplierId: supplier1.id,
    },
  });

  await prisma.part.upsert({
    where: { id: 'seed-part-003' },
    update: {},
    create: {
      id: 'seed-part-003',
      partNumber: 'BRAKE-PAD-FRONT',
      name: 'Brake Pad Set (Front)',
      description: 'Semi-metallic front brake pads',
      category: 'Brakes',
      unitCost: 22.0,
      sellingPrice: 45.0,
      quantityOnHand: 8,
      minStock: 5,
      supplierId: supplier1.id,
    },
  });

  await prisma.part.upsert({
    where: { id: 'seed-part-004' },
    update: {},
    create: {
      id: 'seed-part-004',
      partNumber: 'AIR-FILTER-UNIV',
      name: 'Air Filter (Universal)',
      description: 'High-flow air filter',
      category: 'Filters',
      unitCost: 8.0,
      sellingPrice: 16.99,
      quantityOnHand: 3,
      minStock: 5,
      supplierId: supplier1.id,
    },
  });

  // Sample Repair Orders
  const ro1 = await prisma.repairOrder.upsert({
    where: { id: 'seed-ro-001' },
    update: {},
    create: {
      id: 'seed-ro-001',
      roNumber: 'RO-20260601-0001',
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      status: 'IN_PROGRESS',
      mileageIn: 45230,
      promisedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      customerNotes: 'Car making noise when braking',
      internalNotes: 'Front brake pads worn, rotors need inspection',
    },
  });

  await prisma.laborLine.upsert({
    where: { id: 'seed-labor-001' },
    update: {},
    create: {
      id: 'seed-labor-001',
      repairOrderId: ro1.id,
      description: 'Front Brake Pad Replacement',
      hours: 1.5,
      rate: 95,
      subtotal: 142.5,
    },
  });

  await prisma.partsLine.upsert({
    where: { id: 'seed-parts-001' },
    update: {},
    create: {
      id: 'seed-parts-001',
      repairOrderId: ro1.id,
      partId: 'seed-part-003',
      name: 'Brake Pad Set (Front)',
      partNumber: 'BRAKE-PAD-FRONT',
      quantity: 1,
      unitCost: 22.0,
      sellingPrice: 45.0,
      subtotal: 45.0,
    },
  });

  await prisma.repairOrderTechnician.upsert({
    where: {
      repairOrderId_technicianId: {
        repairOrderId: ro1.id,
        technicianId: tech1.id,
      },
    },
    update: {},
    create: {
      repairOrderId: ro1.id,
      technicianId: tech1.id,
    },
  });

  await prisma.rOStatusHistory.create({
    data: {
      repairOrderId: ro1.id,
      fromStatus: null,
      toStatus: 'ESTIMATE',
      changedById: admin.id,
    },
  }).catch(() => {});

  await prisma.rOStatusHistory.create({
    data: {
      repairOrderId: ro1.id,
      fromStatus: 'ESTIMATE',
      toStatus: 'APPROVED',
      changedById: admin.id,
    },
  }).catch(() => {});

  await prisma.rOStatusHistory.create({
    data: {
      repairOrderId: ro1.id,
      fromStatus: 'APPROVED',
      toStatus: 'IN_PROGRESS',
      changedById: tech1User.id,
    },
  }).catch(() => {});

  const ro2 = await prisma.repairOrder.upsert({
    where: { id: 'seed-ro-002' },
    update: {},
    create: {
      id: 'seed-ro-002',
      roNumber: 'RO-20260610-0002',
      customerId: customer2.id,
      vehicleId: vehicle2.id,
      status: 'COMPLETED',
      mileageIn: 28100,
      mileageOut: 28108,
      customerNotes: 'Oil change and tire rotation',
    },
  });

  await prisma.laborLine.upsert({
    where: { id: 'seed-labor-002' },
    update: {},
    create: {
      id: 'seed-labor-002',
      repairOrderId: ro2.id,
      description: 'Oil Change & Filter',
      hours: 0.5,
      rate: 95,
      subtotal: 47.5,
    },
  });

  await prisma.laborLine.upsert({
    where: { id: 'seed-labor-003' },
    update: {},
    create: {
      id: 'seed-labor-003',
      repairOrderId: ro2.id,
      description: 'Tire Rotation',
      hours: 0.5,
      rate: 95,
      subtotal: 47.5,
    },
  });

  console.log('Seed completed successfully.');
  console.log('');
  console.log('Default accounts:');
  console.log('  Admin:       admin@autoshop360.com     / Admin@123');
  console.log('  Manager:     manager@autoshop360.com   / Manager@123');
  console.log('  Technician:  mike.tech@autoshop360.com / Tech@123');
  console.log('  Receptionist: reception@autoshop360.com / Rec@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
