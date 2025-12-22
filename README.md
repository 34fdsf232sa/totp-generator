# TOTP Generator - Github 登录验证码获取

一个基于浏览器的时间基准一次性密码(TOTP)生成器，用于生成 Github 双因素认证验证码。

## 功能特点

- 🔐 支持生成 TOTP 验证码
- ⏱️ 实时倒计时显示
- 📋 一键复制验证码
- 🎨 简洁美观的界面
- 🌐 纯前端实现，无需后端服务器

## 使用说明

1. 在 **"秘钥"** 输入框中输入你的 Github 秘钥（Base32 格式）
2. 设置验证码位数（默认 6 位）
3. 设置令牌周期（默认 30 秒）
4. 页面会自动生成并更新验证码
5. 点击复制按钮将验证码复制到剪贴板

## 在线使用

直接在浏览器中打开 `index.html` 文件即可使用。

也可以访问在线版本：[TOTP Generator](https://34fdsf232sa.github.io/totp-generator/)

## 本地部署

### 方法 1：直接打开
```bash
# 克隆仓库
git clone https://github.com/34fdsf232sa/totp-generator.git

# 进入目录
cd totp-generator

# 在浏览器中打开 index.html
```

### 方法 2：使用 Web 服务器
```bash
# 使用 Python 启动简单 HTTP 服务器
python -m http.server 8000

# 或使用 Node.js http-server
npx http-server
```

然后在浏览器中访问 `http://localhost:8000`

## 技术栈

- **Vue.js 3.3.2** - 前端框架
- **Bulma 0.9.4** - CSS 框架
- **OTPAuth 9.1.3** - TOTP 算法实现
- **Clipboard.js 2.0.6** - 剪贴板操作

## 文件说明

```
totp-generator/
├── index.html              # 主页面
├── hex-to-base32.html      # 十六进制转 Base32 工具
├── favicon.ico             # 网站图标
├── LICENSE                 # 许可证文件
├── css/
│   └── bulma-0.9.4.min.css # CSS 框架
├── js/
│   ├── app.js              # 主应用逻辑
│   ├── hex-to-base32.js    # 转换工具脚本
│   ├── vue-3.3.2.global.prod.js
│   ├── otpauth-9.1.3.min.js
│   └── clipboard-2.0.6.min.js
└── img/
    └── clippy.svg          # 复制图标
```

## 安全提示

⚠️ **重要提示**：
- 请不要在不信任的网站上输入你的秘钥
- 本工具完全在浏览器本地运行，不会上传任何数据
- 建议在本地部署使用，确保数据安全

## 常见问题

### Q: 如何获取 Github 秘钥？
A: 在设置 Github 双因素认证时，Github 会提供一个 Base32 格式的秘钥字符串。

### Q: 验证码为什么会自动更新？
A: TOTP 验证码基于时间生成，默认每 30 秒更新一次。

### Q: 可以离线使用吗？
A: 可以。下载整个仓库后，无需网络连接即可在本地使用。

## License

本项目采用 GNU General Public License v3.0 许可证。详见 [LICENSE](LICENSE) 文件。

## 联系方式

- Telegram：[@cn2035](https://t.me/cn2035)
- 网站：[https://shop.666200.xyz/](https://shop.666200.xyz/)

## 鸣谢

基于 [jaden/totp-generator](https://github.com/jaden/totp-generator) 项目开发。
