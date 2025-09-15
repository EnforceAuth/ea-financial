import { Elysia } from "elysia";

const appName = "Consumer Accounts API";
const app = new Elysia().get("/", () => appName).listen(3000);

console.log(
  `🦊 ${appName} is running at ${app.server?.hostname}:${app.server?.port}`,
);
