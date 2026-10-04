# Model Scout · 模型能力探测

> 在浏览器里实时探测任意 OpenAI / Anthropic 兼容上游的模型能力参数。

---

## 它探测什么

| 参数             | 探测方式                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| **最大输出 token** | 从大到小爬阶梯（`128k → 64k → 32k → 16k → 8k → 4k`），第一次成功即认定下限；失败时从上游报错文本里正则提取精确上限                |
| **是否支持思考**     | 发 `reasoning_effort`（OpenAI 兼容）或 `thinking.budget_tokens`（Anthropic），看响应里有没有 reasoning 痕迹 |
| **思考档位**       | 支持思考时，逐档发请求验证（`minimal` / `low` / `medium` / `high` / `xhigh` / `max`），只列出真正被接受的档位        |

---

## 特点

- **零依赖**：前端 HTML 文件承载全部 UI 与探测逻辑，服务端只有 `server.mjs`
- **双协议**：OpenAI 兼容 与 Anthropic 兼容共用一套界面
- **本地中转**：服务端只做一件事——转发请求，绕开浏览器 CORS
- **可复制**：每个模型的最大输出值旁有 ⧉ 按钮，一键复制

---

## 工作原理

```
浏览器  ──►  本地 Node 服务 (server.mjs)  ──►  上游 API
                ▲
                └── 只做一件事：转发请求，绕开 CORS
```

- **纯前端**：所有 UI 与探测逻辑在一个 HTML 文件里
- **本地中转**：`server.mjs` 是个零依赖的 Node HTTP 服务，只负责把请求转发给上游
- **无数据落盘**：Key 只在单次转发里用掉，不写日志、不写文件、不进数据库

---

## 运行

### 前置要求

- `Node.js ≥ 18`

### 部署

```bash
git clone https://github.com/lnrh1/model-scout.git
```

### 启动

```bash
cd model-scout
node server.mjs
```

默认端口 `5190`，启动后会打印访问地址。打开浏览器访问：

```
http://localhost:5190
```

### 更换端口

```bash
SCOUT_PORT=8080 node server.mjs
```

---

## 安全

### Key 会经过谁

```
浏览器（你的 Key）──► 本机 Node 服务（转发）──► 上游 API
```

Node 服务**跑在你自己机器上**，只监听 `127.0.0.1`，外部无法访问。

---

## 目录结构

```
.
├── server.mjs            # 本地 Node 服务（静态托管 + 转发）
├── package.json
├── LICENSE
├── README.md
└── public/
    ├── index.html        # 全部 UI 与探测逻辑
    └── favicon.svg       # 图标
```

---

## 使用

1. 启动服务
2. 打开 `http://localhost:5190`
3. 选一个快捷提供商，或手动填 Base URL
4. 填入 **API Key**
5. 点「获取模型」
6. 勾选要探测的模型 → 点「探测所选」
7. 查看结果

探测采用 2 并发。

---

## 已知限制

- **输出上限的粒度取决于上游报错** —— 上游报错里没有数字时，只能给出「≥ 某值」的下限
- **Anthropic 的思考档位暂只标记 `budget`** —— Anthropic 新版自适应思考模型通过 `thinking.effort` 指定档位，旧模型通过 `budget_tokens` 数值控制，两套机制混探会复杂化，暂统一按 `budget` 标记

---

## 许可证

本项目基于 MIT License 开源。

Copyright © 2025 lnrh1
