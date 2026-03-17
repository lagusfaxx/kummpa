import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

const server = app.listen(env.API_PORT, () => {
  console.log(`API listening on http://localhost:${env.API_PORT}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}. Closing resources...`);
  server.close((error) => {
    if (error) {
      console.error("Error while closing HTTP server:", error);
      process.exit(1);
      return;
    }

    prisma
      .$disconnect()
      .then(() => {
        process.exit(0);
      })
      .catch((disconnectError) => {
        console.error("Error while disconnecting Prisma:", disconnectError);
        process.exit(1);
      });
  });
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
