import prisma from "./prismaClient.js";

async function test() {
  const users = await prisma.user.findMany();
  console.log(users);
}

test();
