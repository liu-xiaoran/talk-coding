import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

/**
 * 创建项目目录
 */
export async function createProjectDir(sessionId: string): Promise<string> {
  const dir = path.resolve(config.projectsDir, sessionId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * 检查项目中是否已生成 index.html
 */
export async function hasIndexHtml(projectDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectDir, 'index.html'));
    return true;
  } catch (err) {
    // 只处理文件不存在的错误，其他错误应该抛出
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

/**
 * 获取生成页面的 URL 路径
 */
export function getPageUrl(sessionId: string): string {
  return `/projects/${sessionId}/index.html`;
}

/**
 * 确保项目根目录存在
 */
export async function ensureProjectsDir(): Promise<void> {
  await fs.mkdir(path.resolve(config.projectsDir), { recursive: true });
}
