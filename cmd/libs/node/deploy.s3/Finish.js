/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2019, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Path     = require('path')
const TimeUnit = require('../TimeUnit')
const Display  = require('../Display')
const Xterm    = require('../Xterm')
const Print    = require('../Print')
const Config   = require(Path.config)

module.exports = closure =>
  Display.title('部署完成') &&
  Print(' '.repeat(3) + '🎉 太棒惹，已經完成部署囉，趕緊去看最新版的吧！' + Display.LN) &&
  Print(' '.repeat(3) + '❗️ 若有設定 CDN 快取的話，請等 Timeout 後再試。' + Display.LN) &&
  Print(' '.repeat(3) + '⏰ 部署耗費時間' + Display.markSemicolon() + Xterm.color.gray(TimeUnit(Config.startAt), true) + Display.LN) &&
  Print(' '.repeat(3) + '🌏 這是您的網址' + Display.markSemicolon() + Xterm.color.blue('https://' + Config.s3.domain + '/' + (Config.s3.prefix ? Config.s3.prefix + '/' : Config.s3.prefix), true).underline() + Display.LN) &&
  Print(Display.LN + Display.LN) &&
  typeof closure == 'function' &&
  closure()
