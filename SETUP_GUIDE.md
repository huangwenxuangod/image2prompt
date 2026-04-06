# 设置指南

## 前置准备

1. **Clerk 账号**：https://clerk.com
2. **Supabase 账号**：https://supabase.com
3. **火山引擎 ARK API Key**：https://console.volcengine.com/ark

---

## 步骤 1：配置 Clerk

1. 访问 https://clerk.com 创建应用
2. 配置应用名称：`Image2Prompt`
3. 复制以下凭证：
   - Publishable Key
   - Secret Key
4. 配置回调 URL：
   - 开发环境：`http://localhost:3000`
   - 生产环境：你的域名

---

## 步骤 2：配置 Supabase

1. 访问 https://supabase.com 创建项目
2. 复制以下凭证：
   - Project URL
   - Anon/Public Key
   - Service Role Key（可选，用于服务端操作）
3. 在 SQL Editor 中运行以下初始化脚本：

```sql
-- Profiles 表
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

-- Usage 表
create table usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  type text not null,
  count integer default 0,
  period text not null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(user_id, type, period)
);

alter table usage enable row level security;
create policy "Users can view own usage." on usage for select using (auth.uid() = user_id);
create policy "Users can update own usage." on usage for update using (auth.uid() = user_id);

-- Generation History 表
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

-- Style Templates 表
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

## 步骤 3：配置环境变量

复制 `apps/web/.env.example` 为 `apps/web/.env.local`，填入你的凭证：

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Volcengine ARK
VOLC_ARK_API_KEY=ea3d...
```

---

## 步骤 4：启动开发服务器

```bash
# 根目录安装依赖
bun install

# 启动 Web 端
cd apps/web
bun run dev

# 启动插件端（新终端）
cd apps/extension
bun run dev
```

Web 端将在 http://localhost:3000 启动

---

## 步骤 5：配置插件与 Web 端通信

1. 打开浏览器，访问 http://localhost:3000
2. 点击登录，完成 Clerk 认证
3. 认证成功后，Token 将通过 postMessage 传递给插件
4. 插件存储 Token 后即可正常使用

---

## 开发命令

```bash
# 根目录
bun install          # 安装所有依赖
bun run build        # 构建所有项目

# Web 端
cd apps/web
bun run dev          # 启动开发服务器
bun run build        # 生产构建

# 插件端
cd apps/extension
bun run dev          # 启动开发服务器
bun run build        # 生产构建
```
