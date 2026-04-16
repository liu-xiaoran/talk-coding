import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { config } from './config.js';
import { handleConnection } from './ws/handler.js';
import { ensureProjectsDir } from './services/project-manager.js';

async function main() {
  await ensureProjectsDir();

  const app = express();

  // 解析 JSON 请求体
  app.use(express.json());

  // 静态文件：生成的页面
  app.use('/projects', express.static(path.resolve(config.projectsDir)));

  // 生产环境：服务前端构建产物
  app.use(express.static(path.resolve('dist/public')));

  // 健康检查
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const server = createServer(app);

  // WebSocket 服务器
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', handleConnection);

  server.listen(config.port, () => {
    console.log(`Talk-Coding server running at http://localhost:${config.port}`);
    console.log(`WebSocket endpoint: ws://localhost:${config.port}/ws`);
    console.log(`Default CLI tool: ${config.defaultTool}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// 全局异常处理
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
