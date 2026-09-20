import { PrismaClient, Role, Priority, TaskStatus, ActivityType } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const d=(days:number)=>new Date(Date.now()+days*86400000);
async function main(){
  await prisma.notification.deleteMany(); await prisma.activity.deleteMany(); await prisma.task.deleteMany(); await prisma.project.deleteMany(); await prisma.client.deleteMany(); await prisma.refreshSession.deleteMany(); await prisma.user.deleteMany();
  const passwordHash=await bcrypt.hash('Password123!',12);
  const users=await Promise.all([
    prisma.user.create({data:{name:'Admin User',email:'admin@velozity.dev',passwordHash,role:Role.ADMIN}}),
    prisma.user.create({data:{name:'Ravi Sharma',email:'pm1@velozity.dev',passwordHash,role:Role.PROJECT_MANAGER}}),
    prisma.user.create({data:{name:'Priya Mehta',email:'pm2@velozity.dev',passwordHash,role:Role.PROJECT_MANAGER}}),
    prisma.user.create({data:{name:'Dev One',email:'dev1@velozity.dev',passwordHash,role:Role.DEVELOPER}}),
    prisma.user.create({data:{name:'Dev Two',email:'dev2@velozity.dev',passwordHash,role:Role.DEVELOPER}}),
    prisma.user.create({data:{name:'Dev Three',email:'dev3@velozity.dev',passwordHash,role:Role.DEVELOPER}}),
    prisma.user.create({data:{name:'Dev Four',email:'dev4@velozity.dev',passwordHash,role:Role.DEVELOPER}})
  ]);
  const [admin,pm1,pm2,d1,d2,d3,d4]=users;
  const clients=await Promise.all([1,2,3].map(i=>prisma.client.create({data:{name:`Client ${i}`,company:`Client Company ${i}`,email:`client${i}@example.com`}})));
  const projects=await Promise.all([
    prisma.project.create({data:{name:'Atlas Website',description:'Corporate website rebuild',creatorId:pm1.id,clientId:clients[0].id}}),
    prisma.project.create({data:{name:'Nova Mobile App',description:'Cross-platform mobile delivery',creatorId:pm1.id,clientId:clients[1].id}}),
    prisma.project.create({data:{name:'Orbit CRM',description:'Internal CRM modernization',creatorId:pm2.id,clientId:clients[2].id}})
  ]);
  const devs=[d1,d2,d3,d4]; const statuses=[TaskStatus.TODO,TaskStatus.IN_PROGRESS,TaskStatus.IN_REVIEW,TaskStatus.DONE,TaskStatus.TODO,TaskStatus.IN_PROGRESS]; const priorities=[Priority.HIGH,Priority.MEDIUM,Priority.CRITICAL,Priority.LOW,Priority.HIGH,Priority.MEDIUM];
  for(let p=0;p<projects.length;p++){
    for(let i=0;i<6;i++){
      await prisma.task.create({data:{projectId:projects[p].id,title:`${projects[p].name} Task ${i+1}`,description:'Seeded assessment task',assignedDeveloperId:devs[(p+i)%4].id,status:(i===0?TaskStatus.OVERDUE:(i===1&&p===1?TaskStatus.OVERDUE:statuses[i])),priority:priorities[i],dueDate:i<2?d(-2-i):d(i+1)}});
    }
  }
  const tasks=await prisma.task.findMany();
  for(const task of tasks.slice(0,12)){
    const actor=task.assignedDeveloperId===d1.id?d1:pm1;
    await prisma.activity.create({data:{projectId:task.projectId,taskId:task.id,actorId:actor.id,type:ActivityType.TASK_STATUS_CHANGED,message:`${actor.name} updated ${task.title} to ${task.status}`,metadata:{status:task.status}}});
  }
  await prisma.notification.create({data:{userId:d1.id,message:'You have been assigned a new task.'}});
  await prisma.notification.create({data:{userId:pm1.id,message:'A task you own is ready for review.'}});
  console.log('Seed complete:',{admin:admin.email,projects:projects.length,tasks:tasks.length});
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
