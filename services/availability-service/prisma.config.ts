require("dotenv").config();

module.exports = {
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.AVAILABILITY_DB,
  },
};
