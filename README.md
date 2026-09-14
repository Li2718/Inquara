# Inquara

个人 AI 思考画布。把对话放在无限画布上，从回答中的一段文字继续追问，让思考展开为相互连接的分支。

https://github.com/user-attachments/assets/8745dac8-3035-46c8-a021-bdb3b50a5e50

- **分支追问**：选中回答文字创建新对话，并保留来源上下文。
- **自由组织**：拖动、折叠和自动整理节点，梳理问题之间的关系。
- **持续积累**：保存多个画布及其对话，支持中文和英文界面。

## 本地运行

需要 Node.js 24+ 和已启动的 Docker（含 Compose）。

```bash
npm ci
cp .env.dev.example .env.dev
cp docker-compose.dev.example.yml docker-compose.dev.yml
```

将 `.env.dev` 中的 `SESSION_SECRET` 设置为至少 32 个字符的随机值，然后运行：

```bash
npm run db:generate
npm run dev
```

首次启动会启动 PostgreSQL、Redis 并应用数据库迁移。按终端输出的地址打开应用，默认是 `http://localhost:3000`。

默认使用模拟 AI 回复。接入真实模型时，在 `.env.dev` 中设置 `AI_PROVIDER=openai-compatible`，并配置 `OPENAI_COMPATIBLE_BASE_URL`、`OPENAI_COMPATIBLE_API_KEY` 和 `OPENAI_COMPATIBLE_MODEL`。

## 技术与文档

TypeScript · Next.js · React Flow · Fastify · PostgreSQL · Prisma · Redis

[系统架构](docs/architecture.md) · [部署说明](docs/deployment.md) · [测试规范](docs/testing-standards.md)
