// instead of inisializing prisma client in every file we need it, we can just import this file and use the same instance of prisma clientimport { PrismaClient } from '@prisma/client';

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
