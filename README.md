# EduSoho Video Shortcuts

为 [EduSoho](http://www.edusoho.com/) 课程回看平台（v21.1.6）做的油猴（Tampermonkey）脚本，用键盘快捷键加速看课：快进、回退、倍速、暂停，看视频不再手点进度条。

## 功能

| 快捷键 | 效果 |
| --- | --- |
| `→` 单击 | 快进 5 秒 |
| `←` 单击 | 回退 5 秒 |
| `→` 长按 | 2x 倍速（松手恢复原速） |
| `空格` | 暂停 / 播放 |

附加细节：

- 操作时屏幕右下角有可视化提示；长按倍速时屏幕中上方显示「2x 倍速中」。
- 焦点在输入框 / 搜索框 / 评论框时不劫持按键，避免打字误触。
- 兼容云播放器、弹层播放器（跨 iframe / shadow DOM 查找 `<video>`）。
- 全屏状态下提示框仍然可见。

## 安装

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox 均可）。
2. 点击下方链接，油猴会自动弹出安装窗口：

   [点击安装 edusoho-video-shortcuts.user.js](https://github.com/RuFrost-gif/edusoho-video-shortcuts/raw/main/edusoho-video-shortcuts.user.js)

3. 打开课程页面，直接使用。

> 如果上面的链接失效（仓库名/用户名尚未确定），也可以手动安装：打开 Tampermonkey 控制面板 →「添加新脚本」→ 删除模板 → 把 `edusoho-video-shortcuts.user.js` 全部内容粘贴进去 → Ctrl+S 保存。

## 适用站点

脚本默认只匹配以下域名（`@match`）：

- `http://ftsitisi.aijdjy.com/*`
- `https://ftsitisi.aijdjy.com/*`

如果你用的是其他 EduSoho 站点，把脚本头部 `@match` 改成你的域名即可。

## 自定义

脚本顶部有几个常量可以直接改：

```js
var STEP = 5;            // 单次快进/回退秒数
var FAST_RATE = 2;       // 长按右方向键的倍速
var LONG_PRESS_MS = 400; // 判定为「长按」的时长（毫秒）
```

## 已知限制

- 只作用于 EduSoho 平台；视频须为标准 HTML5 `<video>`（EduSoho 云播放器符合）。
- 未登录页面无播放器，脚本会静默无效果（属正常）。
- 本脚本不含任何密钥 / token，可安全公开使用。

## License

[MIT](LICENSE)
