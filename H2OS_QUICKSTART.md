# H2OS 快速启动

H2OS 是 Hermes Agent 上面的一层伴侣产品界面。它复用 Hermes 的 Profile、Gateway、记忆和 Skills，不另外实现 Agent 循环。

## 本地运行

需要 Python 3.11、[uv](https://docs.astral.sh/uv/)、Node.js 22 和 npm。

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO

uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[all]"

npm ci --ignore-scripts
npm run build --workspace web

hermes dashboard
```

打开终端中显示的 Dashboard 地址，进入「我的伴侣」：

1. 创建伴侣，选择模型并填写该模型服务的 API Key。
2. 进入伴侣详情，点击「扫码连接微信」。
3. 用微信扫码并在手机上确认。H2OS 会把凭据保存到该伴侣的独立 Hermes Profile，并启动对应 Gateway。
4. 扫码的微信账号会自动成为唯一 owner 和 Home Channel。去微信给 iLink Bot 发第一条消息，伴侣会直接回复。

## 终端运行微信伴侣

前端只用于创建和管理，微信消息由 Hermes Gateway 运行。创建伴侣后，可以完全从终端连接和运行：

```bash
hermes companion list
hermes companion connect-weixin <伴侣名或 Profile>
hermes companion run <伴侣名或 Profile>
```

`run` 会在前台运行该伴侣的 Profile Gateway。只要这个进程在运行，网页关闭后仍可以在微信中聊天。

Windows 请在 WSL2 中执行上述命令，或参考 Hermes 主 README 的 Windows 安装方式。

## 微信连接的边界

- 连接的是微信 iLink Bot 身份，不是自动操作用户的个人微信号。
- 当前主要支持私聊。普通微信群通常无法邀请 `@im.bot` 身份，iLink 也通常不会投递普通群消息。
- Dashboard 只接收二维码内容和登录状态；微信 token 不会返回浏览器。

## 让其他人使用

最简单、最安全的方式是：每个人从 GitHub 克隆后，在自己的电脑或服务器上运行。他们的 API Key、微信 token、记忆和聊天数据都保存在各自的 `~/.hermes` 中。

不要把一个公开 Dashboard 直接当作多租户 SaaS。Hermes Profile 用于数据和运行配置隔离，但不是用户身份验证边界。如果要提供公网服务，应至少做到：

- 每个用户或伴侣使用独立容器和独立持久化目录。
- Dashboard 前增加登录、授权、HTTPS 和请求限速。
- 不共享 `HERMES_HOME`、`.env`、Gateway 进程或伴侣 Profile 目录。
- 为 API Key 和微信 token 使用专用 Secret Store，并配置备份与删除策略。

## 开发验证

```bash
scripts/run_tests.sh tests/h2os tests/gateway/test_weixin.py
npm run build --workspace web
```
