# 教学总站（Teaching Hub）

课程导航总站：一个入口页 + 各课程平台页面的发布副本，同时支持**本地离线使用**和 **GitHub Pages 在线访问**。

## 结构

| 文件 | 说明 |
|---|---|
| `index.html` | 总站导航页 |
| `scratch/index.html` | Scratch 图形化课程体系预览页副本（自包含，403KB） |
| `mixly/` | 米思齐工作区总控台副本（界面可看，"资料接收服务"等功能仅本地可用） |

## 访问方式

- **在线**：https://1luohua1.github.io/teaching-hub/
- **本地**：双击 `index.html`

## 同步更新

源页面有更新后，重新复制副本并推送：

```powershell
Copy-Item "d:\小项目\scrach\Scratch\00_最终交付\scratch课程体系预览.html" "d:\小项目\教学总站\scratch\index.html" -Force
Copy-Item "d:\小项目\mixly\工作区总控台\static\*" "d:\小项目\教学总站\mixly\" -Force
cd d:\小项目\教学总站
git add -A; git commit -m "同步页面副本"; git push
```

Pages 会在一两分钟内自动更新。
