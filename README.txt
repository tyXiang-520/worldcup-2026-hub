=== 世界杯赛事信息与互动预测平台 ===
Web 全栈开发课程大作业

---
一、GitHub 仓库地址
---
https://github.com/tyXiang-520/worldcup-2026-hub

如仓库为私有，请邀请助教账号：sunshinezxf@hotmail.com

---
二、技术栈
---
前端：Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
后端：Midway.js 4 + Koa + TypeScript
数据库：Node.js 内置 SQLite
工程化：npm workspaces + Docker Compose + GitHub Actions

---
三、Docker 启动
---
1. 将种子数据 CSV 文件放入 scripts/ 目录（见后文"数据文件说明"）
2. 在项目根目录执行：
   docker compose -f infra/compose.yaml up -d
3. 访问 http://localhost:3000

---
四、数据文件说明
---
后端启动时会从 scripts/ 目录读取以下 CSV 初始化数据库：

必需文件：
  teams_xhs.csv              — 48支球队（含Logo URL）
  matches_xhs.csv             — 104场比赛（比分+时间+阶段）
  players_new.csv             — 球员基础信息
  match_events_new.csv        — 比赛进球事件
  player_tournament_stats_new.csv — 球员赛事统计

可选文件（有则显示更丰富数据）：
  lineups_xhs.csv             — 阵容头信息
  lineup_players_xhs.csv      — 阵容球员明细
  player_ratings_xhs.csv      — 球员评分
  final_lineups.csv           — 决赛阵容
  final_lineup_players.csv    — 决赛阵容球员
  final_events.csv            — 决赛事件
  goals_xhs.csv               — 射手榜
  assists_xhs.csv             — 助攻榜
  scorers_xhs.csv             — 原始射手/助攻数据

数据库文件自动创建在 backend/data/course-demo.sqlite，通过 Docker Volume 持久化。

数据来源优先级：小红书 > 购买数据 > openfootball

---
五、功能清单
---
1. 赛事数据展示
   - 赛程列表（按日期分组 + 按阶段筛选 + 104场比赛含一句话总结）
   - 比赛详情（赛况事件时间轴 + 阵容 + 球员评分 + 讨论区）
   - 球队详情（基本信息 + 赛事统计 + 球员列表 + 比赛列表）
   - 球员详情（基本信息 + 赛事数据）

2. 数据统计
   - 晋级图（1/16决赛到决赛树状结构）
   - 射手榜 Top 10（进球数降序）
   - 助攻榜 Top 10（助攻数降序）
   - 积分榜（12组完整排名）

3. 用户系统
   - 注册/登录（用户名+密码，JWT令牌7天有效）
   - 隐私设置（排行榜可见 + 预测记录可见）

4. 竞猜预测（复盘模式）
   - 任意已结束比赛提交胜平负预测 + 精准比分预测
   - 即时揭晓真实比分和得分
   - 预测历史查看

5. 排行榜
   - 总积分榜 Top 100 + 个人排名 + 百分位反馈
   - 隐私设置过滤

6. 社区讨论
   - 比赛评论区（两层回复结构 + 最新/最热排序 + 预测正确标签）
   - 球队圈子（48支球队 + 发帖功能）

7. 管理后台（/admin）
   - 仅 admin 用户可访问
   - 比分结果录入 + 摘要编辑

---
六、已知限制
---
1. 射手榜/助攻榜数据为英文名（后续版本中文化）
2. 比赛阵容仅覆盖关键淘汰赛（决赛、半决赛、季军赛等）
3. 比赛事件中黄牌/红牌仅覆盖部分比赛
4. 小组赛无阵容和评分数据
5. 复盘模式不支持修改预测；不支持赛前实时预测
6. 不支持 OAuth 第三方登录
7. 不支持邮件验证和密码找回
