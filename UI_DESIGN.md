# Web UI 设计规范

> 2026 极简设计风格 + HeroUI v3 + Tailwind CSS v4

---

## 设计原则

### 1. 极致简洁（Less is More）
- 每一个元素都必须有存在的理由
- 去掉所有非必要的装饰
- 留白是设计的一部分

### 2. 视觉一致性
- 颜色统一（黑白色系为主）
- 圆角统一（12px/16px）
- 间距统一（4px/8px/16px/24px）
- 阴影统一（微阴影）

### 3. 清晰的信息层级
- 标题 > 副标题 > 正文 > 辅助文字
- 通过字号、字重、颜色区分
- 避免过多颜色干扰

### 4. 即时反馈
- 悬停状态明确
- 点击有微缩放反馈
- 加载状态清晰

---

## 颜色系统

### 主色调
```css
--neutral-50: #f9fafb
--neutral-100: #f3f4f6
--neutral-200: #e5e7eb
--neutral-300: #d1d5db
--neutral-400: #9ca3af
--neutral-500: #6b7280
--neutral-600: #4b5563
--neutral-700: #374151
--neutral-800: #1f2937
--neutral-900: #111827
```

### 功能色（克制使用）
```css
--primary-blue: #2563eb
--success-green: #10b981
--error-red: #ef4444
--warning-amber: #f59e0b
```

### 只在以下场景使用彩色
- 主按钮（蓝色）
- 成功提示（绿色）
- 错误提示（红色）
- 警告提示（琥珀色）

---

## 圆角系统

```
xs: 6px   - 小标签、小按钮
sm: 8px   - 次要组件
md: 12px  - 主要卡片、主要按钮（最常用）
lg: 16px  - 重点强调
xl: 20px  - 极少使用
```

**规则**：尽量统一使用 12px 圆角

---

## 间距系统（4px 基数）

```
xs: 4px   - 内部微调
sm: 8px   - 紧凑元素间距
md: 16px  - 标准间距（最常用）
lg: 24px  - 区块间距
xl: 32px  - 页面级间距
```

---

## 阴影系统（微阴影）

```css
/* 卡片阴影 */
--shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.06);

/* 按钮悬停阴影 */
--shadow-button-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.08);

/* 下拉框阴影 */
--shadow-dropdown: 0 4px 12px 0 rgba(0, 0, 0, 0.1);
```

---

## 字体系统

### 字重
```
light: 300   - 极少使用
regular: 400 - 正文
medium: 500  - 小标题
semibold: 600 - 页面标题、重要按钮
bold: 700     - 极少使用
```

### 字号
```
xs: 12px     - 辅助文字、标签
sm: 14px     - 次要文字
base: 16px   - 正文（最常用）
lg: 18px     - 小标题
xl: 20px     - 卡片标题
2xl: 24px    - 页面标题
```

---

## 组件设计规范

### Button 按钮

#### 主按钮（Primary）
```tsx
<Button
  color="primary"
  radius="lg"
  className="h-11 px-6 font-medium shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
>
  立即生成
</Button>
```

#### 次要按钮（Secondary）
```tsx
<Button
  variant="bordered"
  radius="lg"
  className="h-11 px-6 font-medium hover:bg-gray-50 transition-colors"
>
  查看历史
</Button>
```

#### 幽灵按钮（Ghost）
```tsx
<Button
  variant="light"
  radius="lg"
  className="h-10 px-4 font-medium hover:bg-gray-100 transition-colors"
>
  取消
</Button>
```

#### 图标按钮（Icon Only）
```tsx
<Button
  isIconOnly
  variant="light"
  radius="lg"
  className="w-10 h-10 hover:bg-gray-100 transition-colors"
>
  <Trash2 className="w-4 h-4" />
</Button>
```

### Card 卡片

#### 标准卡片
```tsx
<Card className="border border-gray-200 rounded-xl shadow-sm">
  <CardHeader className="pb-3">
    <h3 className="text-base font-semibold text-gray-900">卡片标题</h3>
  </CardHeader>
  <CardBody className="pt-0">
    <p className="text-sm text-gray-600">卡片内容</p>
  </CardBody>
</Card>
```

#### 可点击卡片
```tsx
<Card
  className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all"
  isPressable
>
  <CardBody className="p-4">
    卡片内容
  </CardBody>
</Card>
```

### Input 输入框

```tsx
<Input
  radius="lg"
  classNames={{
    input: "h-11 text-base",
    inputWrapper: "border-gray-300 hover:border-gray-400 focus-within:border-blue-500",
  }}
  placeholder="请输入..."
/>
```

### Select 选择器

```tsx
<Select radius="lg">
  <SelectTrigger className="h-11 border-gray-300 hover:border-gray-400">
    <SelectValue />
  </SelectTrigger>
  <SelectPopover>
    <ListBox>
      <ListBoxItem>选项一</ListBoxItem>
      <ListBoxItem>选项二</ListBoxItem>
    </ListBox>
  </SelectPopover>
</Select>
```

### Tabs 标签页

```tsx
<Tabs radius="lg" classNames={{ tabList: "bg-gray-100 p-1" }}>
  <Tab key="generate" className="data-[selected=true]:bg-white data-[selected=true]:shadow-sm">
    生成图片
  </Tab>
  <Tab key="history" className="data-[selected=true]:bg-white data-[selected=true]:shadow-sm">
    历史记录
  </Tab>
  <Tab key="templates" className="data-[selected=true]:bg-white data-[selected=true]:shadow-sm">
    风格模板
  </Tab>
</Tabs>
```

---

## 页面布局设计

### Dashboard 布局（单页应用）

```
┌─────────────────────────────────────────────────────────┐
│  Logo          [Tabs: 生成 | 历史 | 模板]    [用户头像] │ ← Header (64px)
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │              Main Content Area                  │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Header 头部 (64px)
- **左侧**: Logo + 产品名称
- **中间**: Tabs 标签页（生成/历史/模板）
- **右侧**: 用户头像/登录按钮

### 主内容区域
- **最大宽度**: 800px（居中）
- **左右边距**: 24px
- **顶部边距**: 32px

---

## 各 Tab 页面设计

### Tab 1: 生成图片（默认）

```
┌─────────────────────────────────────┐
│  [风格模板选择]（可选，展开收起）│
├─────────────────────────────────────┤
│                                     │
│  [文本输入区域]                    │
│  (textarea, 提示：输入你想生成的…)  │
│                                     │
├─────────────────────────────────────┤
│  [尺寸选择]  [主按钮: 立即生成]    │
└─────────────────────────────────────┘
```

### Tab 2: 历史记录

```
┌─────────────────────────────────────┐
│  生成历史                    [清空] │
├─────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌───    │
│  │  图片   │ │  图片   │ │ ...    │
│  │ 卡片1   │ │ 卡片2   │ │        │
│  └─────────┘ └─────────┘ └───    │
│                                     │
│  [加载更多...]（如果有）            │
└─────────────────────────────────────┘
```

### Tab 3: 风格模板

```
┌─────────────────────────────────────┐
│  我的模板                [+ 新建] │
├─────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌───    │
│  │  模板   │ │  模板   │ │ ...    │
│  │  卡片1   │ │ 卡片2   │ │        │
│  └─────────┘ └─────────┘ └───    │
│                                     │
│  ─────────────────────────────────  │
│  社区模板（公开）                   │
│  ┌─────────┐ ┌─────────┐ ┌───    │
│  │  模板   │ │  模板   │ │ ...    │
│  └─────────┘ └─────────┘ └───    │
└─────────────────────────────────────┘
```

---

## 响应式设计

### 断点
```
sm: 640px   - 小屏手机
md: 768px   - 大屏手机/小平板
lg: 1024px  - 平板/小笔记本
xl: 1280px  - 笔记本/桌面
```

### 移动端适配
- Header Tabs 改为 Icon Only
- 卡片单列布局
- 字体适当缩小

---

## 动效设计

### 悬停（Hover）
- 按钮：背景色变化 + 阴影加强
- 卡片：阴影加强 + 边框加深
- 过渡时长：150ms

### 点击（Active）
- 微缩放：scale(0.98)
- 过渡时长：100ms

### 加载（Loading）
- 旋转动画：1s linear infinite
- 简洁的 Spinner，不要复杂

---

## 禁止事项

❌ 不要使用渐变色背景（最多用于装饰元素）
❌ 不要使用超过 2 种彩色（主色 + 1个功能色）
❌ 不要使用过多圆角变化（尽量统一 12px）
❌ 不要使用复杂阴影（微阴影即可）
❌ 不要添加不必要的装饰性元素
❌ 不要使用粗边框（1px 足够）
