# GitHub 自动发布和更新清单

项目已经配置好 GitHub Actions。仓库连接到 GitHub 后，每次推送版本标签都会自动完成：

1. 检查标签版本是否等于 `package.json` 的版本，例如 `v0.1.53`。
2. 运行 `npm run check`。
3. 打包 Windows 安装包和 zip。
4. 创建或更新 GitHub Release。
5. 自动生成仓库根目录的 `update.json`。

软件设置里的更新清单地址固定填写：

```text
https://raw.githubusercontent.com/<用户名>/<仓库名>/main/update.json
```

## 第一次连接 GitHub

先准备 GitHub 账号和 GitHub CLI：

1. 打开 `https://github.com/signup` 注册 GitHub 账号。
2. 打开 PowerShell，安装 GitHub CLI：

```powershell
winget install --id GitHub.cli -e --source winget
```

3. 安装完成后关闭 PowerShell，重新打开，再登录 GitHub：

```powershell
gh auth login
```

登录时按这个选：

```text
GitHub.com
HTTPS
Yes, authenticate Git with your GitHub credentials
Login with a web browser
```

然后按提示复制验证码、打开浏览器授权。

## 创建仓库并推送

登录完成后，可以直接用 GitHub CLI 创建仓库并推送：

```powershell
gh repo create product-image-studio --private --source . --remote origin --push
```

如果想让别人也能访问安装包，把 `--private` 改成 `--public`。

也可以在 GitHub 网页新建一个公开仓库，然后在本地执行：

```powershell
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

如果已经有 `origin`，改成：

```powershell
git remote set-url origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

## 发布新版

确认 `package.json` 里的版本号已经改好后执行：

```powershell
git add .
git commit -m "Release v0.1.53"
git tag v0.1.53
git push origin main
git push origin v0.1.53
```

GitHub Actions 跑完后，`update.json` 会自动更新。以后软件启动时会读取这个地址，发现新版本就弹出更新提醒。
