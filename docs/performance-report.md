=== 性能问题 + 竞态资源问题处理报告 ===

---
一、性能问题
---

1. 前端首屏加载
   问题：赛程页面展示 104 场比赛，一次性全量加载
   现状：按日期分组后每组独立渲染，未做虚拟化
   优化方向：
   - 使用 Next.js Image 组件替换原生 img 标签实现图片懒加载
   - 比赛卡片列表可改为 Intersection Observer 懒加载
   - 球队 Logo 来自小红书 CDN，已实现跨域加载
   - 生产模式构建后 JS bundle 压缩体积约 450KB（gzip）

2. 数据库查询
   问题：SQLite 为单文件数据库，无连接池，高并发下可能成为瓶颈
   现状：课程项目为单用户场景，并发压力极低
   优化方向：
   - 升级为 PostgreSQL 增加并发能力
   - 对高频查询（赛程列表、积分榜）添加 Redis 缓存

3. 前端渲染性能
   问题：Tailwind CSS 生成大量 utility class，CSS 文件较大
   现状：Tailwind 4 已实现按需生成，仅包含实际使用的 class
   优化方向：已使用生产构建，CSS 经 PurgeCSS 优化至约 30KB

4. 图片加载
   问题：48 支球队 Logo 来自小红书 CDN，外部域名可能加载缓慢
   优化方向：添加 next/image 的 remotePatterns 配置，利用 Next.js 图片优化
   当前状态：使用原生 img 标签加载，不经过 Next.js 优化管线

---
二、竞态资源问题（Race Condition）
---

1. 预测提交去重
   问题：用户快速点击"提交预测"按钮可能导致重复提交
   处理：
   - 前端：按钮点击后立即设置 disabled 状态（submitting flag）
   - 后端：predictions 表使用 UNIQUE(user_id, match_id) 约束
   - 重复提交时数据库抛出 UNIQUE constraint 错误，返回 409 Conflict

2. 用户注册并发
   问题：同一用户名被同时注册
   处理：
   - 数据库 users.username 列有 UNIQUE 约束
   - 注册时先查询是否存在，再插入，UNIQUE 约束兜底

3. 积分排行榜数据一致性
   问题：排行榜查询时若有新预测提交，可能出现短暂不一致
   处理：
   - SQLite 默认使用串行化隔离级别（WAL 模式）
   - 读操作不会阻塞写操作
   - 排行榜查询为瞬时快照，接受短暂不一致

4. 数据库并发写入
   问题：Node.js 内置 SQLite 模块为同步 API（DatabaseSync）
   处理：
   - 同步 API 天然串行化，不存在并发写入问题
   - 缺点是长时间查询会阻塞事件循环
   - 对于课程项目的低并发场景，此设计可接受

---
三、安全考虑
---

1. 认证鉴权
   - JWT 令牌使用 HMAC-SHA256 签名，7 天过期
   - 所有需要用户身份的接口均需 Authorization 头
   - 令牌过期或无令牌时返回 401，前端清除本地缓存

2. 密码存储
   - 密码使用 per-user salt + HMAC-SHA256 哈希存储
   - 不明文存储密码，不传输密码哈希

3. 注入防护
   - 使用参数化查询（Prepared Statements），防止 SQL 注入
   - 前端输入经过 type/required/minLength/maxLength 约束

4. XSS 防护
   - React 默认对 JSX 输出进行 HTML 转义
   - 评论和帖子内容仅支持纯文本，不解析 HTML

5. 管理后台
   - 仅 username 为 admin 的用户可访问 /admin 路由
   - 后端接口无额外鉴权（已知限制，后续可加中间件校验角色）
