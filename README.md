# 舒尔特方格练习

一个轻量的纯静态舒尔特方格练习网页，支持 3×3、4×4、5×5，带完成评价、三套清新主题、每日打卡和本地记录。

## 本地使用

直接用浏览器打开 `index.html` 即可使用，不需要安装依赖。

## GitHub Pages 部署

1. 在 GitHub 新建一个仓库，比如 `schulte-grid-site`。
2. 把本文件夹中的 `index.html`、`styles.css`、`app.js`、`README.md` 上传到仓库根目录。
3. 进入仓库的 `Settings` → `Pages`。
4. 在 `Build and deployment` 中选择 `Deploy from a branch`。
5. Branch 选择 `main`，文件夹选择 `/root`，点击 `Save`。
6. 等待 GitHub Actions 完成后，页面会出现在 `https://你的用户名.github.io/schulte-grid-site/`。

数据会保存在当前浏览器的 `localStorage` 中，不会上传到服务器。换设备或清理浏览器数据后，打卡记录会重新开始。
