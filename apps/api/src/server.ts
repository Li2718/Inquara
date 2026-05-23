import { buildApp } from "./app";

const app = await buildApp();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
console.log(`Inquara API running at http://localhost:${port}`);
