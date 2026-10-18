# 教学总站（Teaching Hub）

课程导航总站：一个入口页 + 各课程平台页面，同时支持**本地离线使用**和 **GitHub Pages 在线访问**。

## 分工（两个维护者，各管各的，互不交叉）

| 维护者 | 负责内容 | 上线方式 |
|---|---|---|
| 总站侧 AI（Scratch 侧） | `index.html` 导航页、`scratch/` 页面、本 README | 每日 12:30 自动同步 |
| 米思齐侧 AI（Mixly 侧） | `mixly/` 页面 | 每日 13:00 自动上传（其侧脚本） |

规则：各自的定时脚本只写自己名下的路径；推送前先 `git pull --rebase`；不要手改对方路径下的文件。

## 结构

| 文件 | 归属 | 说明 |
|---|---|---|
| `index.html` | 总站侧 | 导航页 |
| `scratch/index.html` | 总站侧 | Scratch 课程体系预览页（自包含，403KB） |
| `mixly/` | 米思齐侧 | 米思齐工作区总控台（"资料接收服务"等功能仅本地可用） |

## 访问方式

- **在线**：https://1luohua1.github.io/teaching-hub/
- **本地**：双击 `index.html`

## 同步更新（总站侧自己的页面）

```powershell
Copy-Item "d:\小项目\scrach\Scratch\00_最终交付\scratch课程体系预览.html" "d:\小项目\教学总站\scratch\index.html" -Force
Set-Location "d:\小项目\教学总站"
git pull --rebase origin main; git add -A; git -c user.name=1luohua1 -c user.email=1luohua1@users.noreply.github.com commit -m "sync scratch page"; git push
```

米思齐侧的上传流程见其侧文档，总站侧不代管。
