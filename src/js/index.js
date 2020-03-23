/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2019, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

window.El = str => {
  var KV = (k, v) => (k = k.replace(/^\*/, 'v-'), k = k.replace(/^@/, 'v-on:'),[k, v.replace(/"/g, "'")]),
  splitOnce = (line, regex) => {
    var match = line.match(regex)
    return match
      ? (regex = line.indexOf(match[0]), [line.substring(0, regex).trim(), line.substring(regex + match[0].length).trim()])
      : [line.trim(), '']
  },

  els = [], tmp = {}, lines = str.split("\n").filter(t => t.trim().length).map(line => {
    var space = line.search(/\S|$/), tokens = splitOnce(line, /\s+=\>\s+/), el = tokens.shift(), id = el.indexOf('#'), cl = el.indexOf('.'), attrs = ''
    tokens = tokens.shift()

    i = id != -1 || cl != -1 ? id == -1 || cl == -1 ? id != -1 ? id : cl : Math.min(id, cl) : -1

    if (i >= 0) {
      attrs = el.substr(i)
      el = el.substr(0, i)
    }

    if (attrs) {
      attrs = attrs.replace(/#/g, '   #').replace(/\./g, '   .')
      tokens = tokens + attrs
    }

    tokens = tokens.split(/\s{3,}/).map(b => {
      if (b === '*else') return ['v-else', null]

      b[0] === '#' && b.indexOf('=') == -1 && (b = 'id=' + b.substr(1))
      b[0] === '.' && b.indexOf('=') == -1 && (b = 'class=' + b.substr(1).replace('.', ' '))

      b = [b.substr(0, (b.indexOf('='))), b.substr((b.indexOf('=')) + 1)].map(c => c.trim()).filter(c => c.length)
      var k = b.slice(0, 1).join('='), v = b.slice(1).join('=')

      return k && v ? KV(k, v) : null
    }).filter(b => b)

    attrs = {}
    for (var i in tokens)
      attrs[tokens[i][0]] = tokens[i][0] == 'class' && attrs[tokens[i][0]]
        ? attrs[tokens[i][0]] + ' ' + tokens[i][1]
        : tokens[i][1]
    
    tokens = ''
    for (var i in attrs)
      tokens += ' ' + i + (attrs[i] !== null ? '="' + attrs[i] + '"' : '')

    return {
      el: el,
      space: space,
      tokens: tokens,
      children: [],
      toString () {
        return el[0] !== '|'
          ?'area,base,br,col,command,embed,hr,img,input,keygen,link,meta,param,source,track,wbr'.split(/,/).indexOf(this.el) != -1
            ? '<' + this.el + tokens + ' />'
            : '<' + this.el + tokens + '>' + this.children.map(child => child.toString()).join('') + '</' + this.el + '>'
          : el.substr(1).trim()
      }
    }
  })

  for (var i = 0; i < lines.length; i++) {
    var parent = tmp[lines[i].space - 2]
    parent
      ? lines[i].space > parent.space && parent.children.push(lines[i])
      : els.push(lines[i])
    tmp[lines[i].space] = lines[i]
  }

  return els.map(t => t.toString()).join('')
}

const Marker = function(map, parentEl) {
  if (!(this instanceof Marker)) return new Marker(map, parentEl)
  
  this.top      = 0
  this.left     = 0
  this.width    = 0
  this.height   = 0
  this.map      = map || null // google maps obj
  this.html     = null // html str
  this.click    = null // () => {}
  this.class    = null // 'str', {name: true}, ['str'], ['str', {name: true}]
  this.position = null // map position

  // private setting
  this.parentEl = !(parentEl instanceof HTMLElement) ? parentEl instanceof Vue ? parentEl.$el : document.body : parentEl
  this.pixel    = null

  this.$$ = new Vue({
    data: this, methods: this,
    computed: {
      className () { return this.class },
      style () { return this.pixel && this.$el ? {
        position: 'absolute', display: 'inline-block',
        top: (this.pixel.y - (this.height || this.$el.offsetHeight) / 2) + this.top + 'px',
        left: (this.pixel.x - (this.width || this.$el.offsetWidth) / 2) + this.left + 'px',
        width: this.width + 'px',
        height: this.height + 'px' } : { display: 'none' } },
      on () { return this.click ? { click: this.click.bind(this) } : {} }
    },
    watch: {
      map: function() { return this.setMap(this.map) }.bind(this),
      position: function() { return this.draw() }.bind(this)
    },
    template: El(`div => :class=className   :style=style   *html=html   *on=on`)
  })
}

const GoogleMap = {
  callback: null, inited: false,
  base () {
    if (this.inited) return
    else this.inited = true

    void (_ => {
      Marker.prototype = Object.create(google.maps.OverlayView.prototype)
      Object.assign(Marker.prototype, {
        draw () { this.$$.pixel = this.$$.$el && this.$$.position ? this.getProjection().fromLatLngToDivPixel(this.$$.position) : null },
        onAdd () { this.$$.$el || this.parentEl.appendChild(this.$$.$mount().$el), this.getPanes().overlayImage.appendChild(this.$$.$el) },
        remove () { this.$$.$el && this.$$.$el.parentNode.removeChild(this.$$.$el), this.$$.$el = null }
      })
    })()

    this.callback && this.callback()
  },
  init (keys, closure) {
    window.gmc = _ => $(window).trigger('gm')
    $(window).bind('gm', _ => GoogleMap.base())

    this.callback = closure
    keys = keys[Math.floor((Math.random() * keys.length))]

    $.getScript('https://maps.googleapis.com/maps/api/js?' + (keys ? 'key=' + keys + '&' : '') + 'language=zh-TW&libraries=visualization&callback=gmc', _ => GoogleMap.base())
  }
}

const API = function(name, ...options) {
  if (!(this instanceof API)) return new API(name, ...options)
  var dones = [], fails = [], oklas = [], befores = [], formats = [], headers = null, setting = API, type = 'GET', tokens = (typeof name == 'string' ? name.trim() : '').split('.').filter(t => t.length)
  var runFormat = r => formats.length ? typeof (formats = formats.reduce((a, b) => b.call(API, a.call(API, r)))) == 'function' && formats.call(API, r) : true
  var runFail = r => fails.length && typeof (fails = fails.reduce((a, b) => b.call(API, a.call(API, r)))) == 'function' && fails.call(API, r)

  this.done    = func => typeof func == 'function' && dones.push(func)   && this || this
  this.fail    = func => typeof func == 'function' && fails.push(func)   && this || this
  this.okla    = func => typeof func == 'function' && oklas.push(func)   && this || this
  this.before  = func => typeof func == 'function' && befores.push(func) && this || this
  this.format  = func => typeof func == 'function' && formats.push(func) && this || this
  this.headers = val => typeof val == 'object' && (headers = val) && this || this
  this.type    = val => typeof val == 'string' && val && (type = val) && this || this
  this.send    = (...appends) => setting
    ? $.ajax({
      ...typeof setting.params != 'function' ? typeof setting.params == 'string' ? { url: setting.params } : setting.params : setting.params.call(API, ...options, ...appends),
      ...typeof setting != 'string' ? typeof setting.url != 'function' ? typeof setting.url == 'string' ? { url: setting.url } : {} : { url: setting.url.call(API, ...options, ...appends) } : { url: setting },
      ...typeof setting.data != 'function' ? typeof setting.data == 'string' ? { data: setting.data } : {} : { data: setting.data.call(API, ...options, ...appends) },
      type: type.toUpperCase(),
      headers: { ...headers },
      beforeSend: befores.length ? r => typeof (befores = befores.reduce((a, b) => b.call(API, a.call(API, r)))) == 'function' && befores.call(API, r) : null })
      .done(dones.length ? r => runFormat(r) ? typeof (dones = dones.reduce((a, b) => b.call(API, a.call(API, r)))) == 'function' && dones.call(API, r) : runFail('format 驗證格式有錯！') : null)
      .fail(runFail)
      .complete(oklas.length ? r => typeof (oklas = oklas.reduce((a, b) => b.call(API, a.call(API, r)))) == 'function' && oklas.call(API, r) : null)
    : console.error('找不到 ' + (name ? '「' + name + '」這隻' : '') + 'API，請檢查設定！')
  if (tokens.length) for (var i in tokens) setting = setting !== null && typeof setting[tokens[i]] != 'undefined' ? setting[tokens[i]] : null 
  else setting = null
  setting && this.done(setting.done).fail(API.Fail).fail(setting.fail).okla(setting.okla).before(setting.before).format(setting.format)
}

const Load = new Vue({
  data: { display: true, hide: true },
  methods: {
    main (func) { return $(() => this.mount(func)) },
    mount (func) { return this.$el || document.body.appendChild(this.$mount().$el), setTimeout(_ => (this.hide = false, setTimeout(_ => document.body.appendChild(new Vue(func).$mount().$el), 300)), 300) },
    closeLoading (func) { return this.hide = true, setTimeout(_ => (this.display = false, typeof func == 'function' && func()), 300) },
  },
  template: El(`
    div#loading => *if=display   :class={hide: hide}
      span => *text='初始中…'`)
})

API.key = {
  url: 'http://dev.api-gps.kerker.tw/api/f2e/event/key',
  format: response => typeof response == 'object' && Array.isArray(response) && response.length,
  done: response => response.shift()
}

API.event = {
  url: 'http://dev.api-gps.kerker.tw/api/f2e/event/1',
  format: response => typeof response == 'object',
}

Load.main({
  data: {
    error: null
  },
  mounted () {
    API('key').done(_ => API('event')
      .done(r => {
        console.error(r);
        
      })
      .fail(error => this.error = typeof error == 'object' && typeof error.responseJSON == 'object' && typeof error.responseJSON.messages == 'object' && Array.isArray(error.responseJSON.messages) && error.responseJSON.messages.length ? error.responseJSON.messages.join(', ') : 'ʕ•ᴥ•ʔ 您沒有權限看喔！')
      .okla(Load.closeLoading)
      .send())
    .fail(error => this.error = typeof error == 'object' && typeof error.responseJSON == 'object' && typeof error.responseJSON.messages == 'object' && Array.isArray(error.responseJSON.messages) && error.responseJSON.messages.length ? error.responseJSON.messages.join(', ') : 'ʕ•ᴥ•ʔ 您沒有權限看喔！')
    .send()
  },
  template: El(`
    main#main
      div#error => *if=error   *text=error
      div#map
      div#zoom.show
        label
        label
      label#at.show
      div#updateAt.show
      div#elapsed.show
      div#length.show
      div#stops.show
      div#speeds.show.click => :n=3
        b => *text=1
        b => *text=1
        b => *text=1
      div#status.show => :status='no-signal'
        `)
})



// $(_ => {

//   const main = new Vue({

//   });
  
//   // GoogleMap.init([''], _ => {

//   //   var mapPanelVm = new Vue({
//   //     el: '#map-panel',
//   //     date: {
//   //       map: null
//   //     },
//   //     mounted () {

//   //       this.map = new google.maps.Map(
//   //         this.$refs.map, {
//   //           zoom: 14,
//   //           center: new google.maps.LatLng(23.77133806905457, 120.70937982351438),
//   //           clickableIcons: false,
//   //           disableDefaultUI: true,
//   //           gestureHandling: 'greedy'
//   //         })

//   //     } 
//   //   })

//   // })
// })



