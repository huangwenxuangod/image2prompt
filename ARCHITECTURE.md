# AI Image Generator - 完整架构设计

> 全栈项目：Monorepo 架构，包含 Web 端、浏览器插件端、共享包

---

## 技术栈总览

| 层级 | 技术选型 |
|------|----------|
| **框架** | Next.js 15 (App Router) |
| **认证** | Clerk Auth |
| **数据库** | Supabase PostgreSQL |
| **存储** | Supabase Storage |
| **样式** | Tailwind CSS v4 + HeroUI v3 |
| **插件** | WXT + React 19 |
| **语言** | TypeScript 6.x (strict mode) |
| **工具链** | Bun 1.x + Biome |

---

## Monorepo 目录结构

```
image2prompt/
├── apps/
│   ├── web/                    # Next.js Web 应用
│   │   ├── app/
│   │   │   ├── (auth)/         # Clerk 认证路由
│   │   │   ├── dashboard/      # 用户仪表板
│   │   │   ├── api/            # API Routes（代理 + 业务逻辑）
│   │   │   └── layout.tsx
│   │   └── package.json
│   │
│   └── extension/              # WXT 浏览器插件（从当前目录迁移）
│       ├── entrypoints/
│       │   ├── background.ts
│       │   ├── popup/
│       │   └── content/
│       └── package.json
│
├── packages/
│   ├── shared/                 # 共享类型、组件、工具
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   │
│   └── ui/                     # 共享 UI 组件（HeroUI + Tailwind）
│       ├── components/
│       └── index.ts
│
├── package.json                # root package.json
├── turbo.json                  # Turborepo 配置
└── CLAUDE.md
```

---

## Supabase 数据库设计

### 1. Users 表（由 Clerk 管理）
Clerk 自动同步用户到 Supabase `auth.users` 表。

### 2. Profiles 表（用户资料）
```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  username text,
  avatar_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);
```

### 3. Usage 表（使用量统计）
```sql
create table usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  type text not null, -- 'image_analysis', 'image_generation'
  count integer default 0,
  period text not null, -- '2024-01' (YYYY-MM)
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(user_id, type, period)
);

alter table usage enable row level security;
create policy "Users can view own usage." on usage for select using (auth.uid() = user_id);
create policy "Users can update own usage." on usage for update using (auth.uid() = user_id);
```

### 4. Generation History 表（生成历史）
```sql
create table generation_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  prompt text not null,
  size text not null,
  image_data_url text not null,
  style_analysis jsonb,
  source_page_url text,
  created_at timestamp default now()
);

alter table generation_history enable row level security;
create policy "Users can view own history." on generation_history for select using (auth.uid() = user_id);
create policy "Users can insert own history." on generation_history for insert with check (auth.uid() = user_id);
create policy "Users can delete own history." on generation_history for delete using (auth.uid() = user_id);
```

### 5. Style Templates 表（风格模板）
```sql
create table style_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  name text not null,
  style_analysis jsonb not null,
  preview_image_url text,
  is_public boolean default false,
  created_at timestamp default now()
);

alter table style_templates enable row level security;
create policy "Users can view own templates." on style_templates for select using (auth.uid() = user_id or is_public = true);
create policy "Users can insert own templates." on style_templates for insert with check (auth.uid() = user_id);
create policy "Users can update own templates." on style_templates for update using (auth.uid() = user_id);
create policy "Users can delete own templates." on style_templates for delete using (auth.uid() = user_id);
```

---

## API Routes 设计（Next.js）

### `app/api/ark/analyze` - 图片分析代理
- **Method**: POST
- **Auth**: Required
- **Body**: `{ imageUrl: string, imageAlt: string }`
- **Response**: `{ prompt: string, styleAnalysis: ImageStyleAnalysis }`
- **逻辑**:
  - 验证用户额度
  - 调用火山引擎 ARK 视觉模型
  - 记录使用量
  - 返回结果

### `app/api/ark/generate` - 图像生成代理
- **Method**: POST
- **Auth**: Required
- **Body**: `{ prompt: string, size: ImageSize, styleAnalysis?: ImageStyleAnalysis }`
- **Response**: `{ dataUrl: string }`
- **Logic**:
  - 验证用户额度
  - 调用火山引擎 ARK Seedream
  - 保存到 Supabase Storage
  - 记录到 generation_history
  - 记录使用量
  - 返回结果

### `app/api/history` - 生成历史 CRUD
- **GET**: 获取用户历史列表
- **DELETE**: 删除单条历史

### `app/api/templates` - 风格模板 CRUD
- **GET**: 获取用户模板列表
- **POST**: 创建新模板
- **PUT**: 更新模板
- **DELETE**: 删除模板

### `app/api/usage` - 使用量统计
- **GET**: 获取当前周期使用量

---

## 额度控制策略

### 免费用户
- 图片分析：50 次/月
- 图片生成：20 次/月

### 付费用户（未来）
- 图片分析：无限
- 图片生成：按需计费

### 实现方式
- Supabase `usage` 表记录
- API Routes 中间件检查
- Redis 缓存（可选，高性能）

---

## 浏览器插件改造

### 改动点
1. **移除 API Key 设置** - 不需要用户输入
2. **添加登录入口** - Popup 中添加 Clerk 登录按钮
3. **API 调用改向 Web 端** - 从直接调用 ARK 改为调用 Next.js API
4. **历史同步** - 生成历史同步到 Supabase

### 插件认证流程
1. 用户点击 Popup 中的「登录」
2. 打开 Web 端 OAuth 页面
3. 完成登录后，插件获得 session token
4. 后续 API 请求携带 token

---

## 初始化步骤

### 1. 创建 Turborepo Monorepo
```bash
npx create-turbo@latest image2prompt-monorepo
cd image2prompt-monorepo
```

### 2. 初始化 Web 端（Next.js）
```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --app --use-bun --yes
cd web
bun add @clerk/nextjs @supabase/supabase-js @heroui/react lucide-react
```

### 3. 迁移插件端
```bash
# 复制当前插件到 apps/extension
```

### 4. 创建共享包
```bash
mkdir packages/shared
mkdir packages/ui
```

---

## 环境变量

### Web 端 `.env.local`
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# 火山引擎 ARK
VOLC_ARK_API_KEY=ea3d...
```

---

## 部署方案

### Web 端
- Vercel 自动部署

### Supabase
- Supabase 云服务

### 浏览器插件
- Chrome Web Store 手动发布

---

## 待确认事项

- [ ] 具体的额度策略（免费额度数值）
- [ ] 是否需要付费功能（Stripe 集成）
- [ ] 插件端登录体验细节
- [ ] 是否需要风格模板分享功能
