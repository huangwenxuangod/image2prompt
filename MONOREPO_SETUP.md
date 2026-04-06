# Monorepo 项目设置指南

## 当前状态

✅ **已完成：**
- Turborepo Monorepo 目录结构
- `apps/extension/` - 浏览器插件（从原目录迁移）
- `apps/web/` - Next.js 15 Web 应用（已初始化）
- `packages/shared/` - 共享包（待填充）
- `packages/ui/` - 共享 UI 组件（待填充）
- Root package.json + turbo.json 配置

## 下一步操作

### 1. 配置环境变量

复制 `apps/web/.env.local.example` 为 `apps/web/.env.local`，并填入：

```env
# Clerk Auth (从 clerk.com 获取)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase (从 supabase.com 获取)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 火山引擎 ARK API Key
VOLC_ARK_API_KEY=
```

### 2. 设置 Clerk

1. 访问 [clerk.com](https://clerk.com) 创建应用
2. 获取 Publishable Key 和 Secret Key
3. 配置回调 URL：`http://localhost:3000`

### 3. 设置 Supabase

1. 访问 [supabase.com](https://supabase.com) 创建项目
2. 运行 SQL 初始化脚本（见 `ARCHITECTURE.md`）
3. 获取 Project URL 和 Anon Key

### 4. 开发命令

```bash
# 根目录安装所有依赖
bun install

# 同时开发 extension 和 web
bun run dev

# 单独开发插件
bun run dev:extension

# 单独开发 Web
bun run dev:web

# 构建所有
bun run build
```

### 5. Web 端待实现功能

- [ ] Clerk Middleware 配置
- [ ] Supabase Client 封装
- [ ] 登录页面
- [ ] Dashboard 布局（Header + Tabs）
- [ ] API Routes：`/api/ark/analyze`
- [ ] API Routes：`/api/ark/generate`
- [ ] API Routes：`/api/history`
- [ ] 生成历史页面
- [ ] 风格模板页面

### 6. 插件端待改造

- [ ] 移除 API Key 配置界面
- [ ] 添加 Clerk 登录入口
- [ ] API 调用改为请求 Web 端
- [ ] 历史同步到 Supabase
