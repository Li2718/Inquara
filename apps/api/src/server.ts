import { buildApp } from "./app";

const app = await buildApp();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST;

await app.listen(host ? { port, host } : { port });
console.log(`Inquara API running at http://localhost:${port}`);
