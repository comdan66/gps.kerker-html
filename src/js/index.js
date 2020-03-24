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

const Marker = function(parentEl) {
  if (!(this instanceof Marker)) return new Marker(parentEl)
  
  this.top      = 0
  this.left     = 0
  this.width    = 0
  this.height   = 0
  this.map      = null
  this.html     = null
  this.click    = null
  this.class    = null
  this.position = null
  this.css      = {}

  this.parentEl = !(parentEl instanceof HTMLElement) ? parentEl instanceof Vue ? parentEl.$el : document.body : parentEl
  this.pixel    = null

  this.$$ = new Vue({
    data: this, methods: this,
    computed: {
      className () { return this.class },
      style () { return this.pixel && this.$el ? {
        ...this.css,
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
    closeLoading (func) { return !this.hide ? (this.hide = true, setTimeout(_ => (this.display = false, typeof func == 'function' && func()), 300)) : null },
  },
  template: El(`
    div#loading => *if=display   :class={hide: hide}
      span => *text='初始中…'`)
})

API.key = {
  url: window.API_URL + 'event/key',
  format: response => typeof response == 'object' && Array.isArray(response) && response.length,
}

API.event = {
  url: id => window.API_URL + 'event/' + id,
  format: response => typeof response == 'object',
}

Load.main({
  data: {
    map: null,
    token: null,
    error: null,
    zoomShow: false,
    speedsShow: false,
    speedsClick: false,
    data: null,
    lastZoom: null,
    idleTimer: null,
    markersData: [],
    polylinesData: [],
    liveTimer: null,
    nowMarker: null,
    colors: ['#f5c801', '#fbbb03', '#fcab0a', '#fc9913', '#fb871d', '#fa7226', '#f95d30', '#f94739', '#f93748', '#f72b5e']
  },
  mounted () {
    this.token = window.location.search.replace(/^\?/, '').split('&').map(t => t.trim()).shift()

    return this.token
      ? API('key').done(keys => GoogleMap.init(keys, _ => {
        this.map = new google.maps.Map(
          this.$refs.map, {
            zoom: 15,
            center: new google.maps.LatLng(25.0329694, 121.5654177),
            clickableIcons: false,
            disableDefaultUI: true,
            gestureHandling: 'greedy'
          })
        this.map.mapTypes.set('ms', new google.maps.StyledMapType([{stylers: [{gamma: 0}, {weight: 0.75}] }, {featureType: 'all', stylers: [{ visibility: 'on' }]}, {featureType: 'administrative', stylers: [{ visibility: 'on' }]}, {featureType: 'landscape', stylers: [{ visibility: 'on' }]}, {featureType: 'poi', stylers: [{ visibility: 'on' }]}, {featureType: 'road', stylers: [{ visibility: 'simplified' }]}, {featureType: 'road.arterial', stylers: [{ visibility: 'on' }]}, {featureType: 'transit', stylers: [{ visibility: 'on' }]}, {featureType: 'water', stylers: [{ color: '#b3d1ff', visibility: 'on' }]}, {elementType: "labels.icon", stylers:[{ visibility: 'off' }]}]));
        this.map.setMapTypeId('ms');
        
        this.map.addListener('idle', _ => {
          if (this.map.zoom === this.lastZoom) return
          else this.lastZoom = this.map.zoom
          clearTimeout(this.idleTimer)
          this.idleTimer = setTimeout(this.fetch, 300)
        });

        this.zoomShow = true

        this.get(_ => {
          if (this.signals.length >= 2) {
            var bounds = new google.maps.LatLngBounds();
            for (var i in this.signals) bounds.extend(new google.maps.LatLng(this.signals[i].lat, this.signals[i].lng));
            this.map.fitBounds(bounds);
          } else if (this.signals.length == 1) {
            this.map.setCenter(new google.maps.LatLng(this.signals[0].lat, this.signals[0].lng))
            this.map.setZoom(15)
          }
          
          $('title').text(this.data.title + ' - ' + $('title').text())
          this.data.live && (this.liveTimer = setInterval(this.get, 3000))
        })
      }))
      .fail(error => this.error = typeof error == 'object' && typeof error.responseJSON == 'object' && typeof error.responseJSON.messages == 'object' && Array.isArray(error.responseJSON.messages) && error.responseJSON.messages.length ? error.responseJSON.messages.join(', ') : 'ʕ•ᴥ•ʔ 您沒有權限看喔！')
      .send()
    : Load.closeLoading(_ => this.error = 'ʕ•ᴥ•ʔ 您沒有權限看喔！')
  },
  computed: {
    status () { return this.data ? this.data.status : null },
    length () { return this.data ? this.data.length : null },
    elapsed () {
      if (!this.data) return null
      let elapsed = this.data.elapsed
      if (elapsed === 0)
        return '瞬間…'

      var units = []

      var contitions = [
        { base: 60, format: '秒' },
        { base: 60, format: '分鐘' },
        { base: 24, format: '小時' },
        { base: 30, format: '天' },
        { base: 12, format: '個月' },
      ]

      for (var i in contitions) {
        var dataUnit = elapsed % contitions[i].base
        
        if (dataUnit != 0)
          units.push(dataUnit + contitions[i].format)

        elapsed = Math.floor(elapsed / contitions[i].base)
        if (elapsed < 1)
          break
      }

      if (elapsed > 0)
        units.push(elapsed + '年')

      if (units.length < 1)
        units.push(elapsed + '秒')

      return units.reverse().join(' ')
    },
    updateAt () {
      if (!this.data) return null
      
      var range = new Date().getTime() / 1000 - this.data.updateAt, formats = [{base: 10, format: '剛剛'}, {base: 6, format: '不到 1 分鐘'}, {base: 60, format: ' 分鐘前'}, {base: 24, format: ' 小時前'}, {base: 30, format: ' 天前'}, {base: 12, format: ' 個月前'}], unit = 1, tmp = 0

      for (var i = 0; i < formats.length; i++, unit = tmp) {
        tmp = formats[i].base * unit;
        if (range < tmp) return (i > 1 ? parseInt(range / unit, 10) : '') + formats[i].format
      }

      return parseInt(range / unit, 10) + ' 年前'
    },
    signals () {
      return this.data ? this.data.signals.map(signal => {
        signal.speedLevel = this.speedLevel(signal.speed)
        signal.courseLevel = Math.round(signal.course / 10)
        return signal
      }) : []
    },
    speeds () {
      let speeds = this.data ? this.data.signals.map(signal => signal.speed).filter(speed => speed > 0) : []
      let max = null, min = null
      for (var i in speeds) {
        if (max === null || speeds[i] > max) max = Math.ceil(speeds[i])
        if (min === null || speeds[i] < min) min = Math.ceil(speeds[i])
      }

      let newSpeeds = []
      let unit = Math.round((max - min) / 9)
      unit = unit < 1 ? 1 : unit
      for (var i = min; i < max; i += unit) newSpeeds.push(i);
      newSpeeds.length < 10 && newSpeeds.push(max)

      return newSpeeds
    },
    polylines: {
      set (vals) {
        if (!Array.isArray(vals)) return
        this.polylinesData.forEach(polyline => polyline instanceof google.maps.Polyline && polyline.setMap(null))
        this.polylinesData = []

        for (var i = 1; i < vals.length; i++)
          this.polylinesData.push(new google.maps.Polyline({
            map: this.map,
            strokeWeight: 5,
            strokeColor: this.colors[vals[i - 1].speedLevel],
            path: [new google.maps.LatLng(vals[i - 1].lat, vals[i - 1].lng), new google.maps.LatLng(vals[i].lat, vals[i].lng)]
          }));
      },
      get () {
        return this.polylinesData
      }
    },
    markers: {
      set (vals) {
        if (!Array.isArray(vals)) return
        this.markersData.forEach(marker => marker instanceof Marker && marker.setMap(null))
        this.markersData = vals.map(val => {
          let marker = Marker()
          marker.map = this.map
          marker.position = new google.maps.LatLng(val.lat, val.lng)
          marker.css    = { backgroundColor: this.colors[val.speedLevel] }
          marker.class  = ['marker', 'course-' + val.courseLevel]
          marker.width  = 14
          marker.height = 14
          return marker
        })
      },
      get () {
        return this.markersData
      }
    }
  },
  methods: {
    fetch () {
      this.markerCluster(this.signals, this.map.zoom, 1, true, markers => {
        this.markers = markers.map(markers => markers[0])
        this.polylines = markers.map(markers => markers[0])
      })
      if (this.nowMarker === null) {
        this.nowMarker = Marker()
        this.nowMarker.width = 44
        this.nowMarker.height = (44 + 5)
        this.nowMarker.top = -(44 + 5) / 2
        this.nowMarker.class = 'nowMarker'
        this.nowMarker.html = '<div><span style="background-image: url(/img/icon2-64-tiny.png)"></span></div>'
      }
      if (!this.signals.length) {
        this.nowMarker.map = null
        this.nowMarker.position = null
      } else {
        this.nowMarker.map = this.map
        this.nowMarker.position = new google.maps.LatLng(this.signals[this.signals.length - 1].lat, this.signals[this.signals.length - 1].lng)
      }
    },
    speedLevel (speed) {
      for (var i in this.speeds) if (speed <= this.speeds[i]) return parseInt(i, 10)
      return 0
    },
    zoomIn () { return this.map.setZoom(this.map.zoom + 1) },
    zoomOut () { return this.map.setZoom(this.map.zoom - 1) },
    get (func) {
      return API('event', this.token)
        .done(data => {
          this.data = data
          this.fetch()
          data.live || clearInterval(this.liveTimer)
          typeof func == 'function' && func()
        })
        .fail(error => this.error = typeof error == 'object' && typeof error.responseJSON == 'object' && typeof error.responseJSON.messages == 'object' && Array.isArray(error.responseJSON.messages) && error.responseJSON.messages.length ? error.responseJSON.messages.join(', ') : 'ʕ•ᴥ•ʔ 您沒有權限看喔！')
        .okla(Load.closeLoading)
        .send()
    },
    markerCluster (objs, zoom, unit, isLine, func) {
      if (!objs.length)
        return func && func([]) || []

      var ts = {},
          ns = [],
          tl = isLine ? objs.length - 1 : objs.length

      for (var i = 0; i < objs.length; i++) {
        if (typeof ts[i] !== 'undefined')
          continue

        ts[i] = true
        var t = [objs[i]]

        for (var j = i + 1; j < tl; j++) {
          if (typeof ts[j] !== 'undefined')
            if (isLine) break
            else continue

          var d = Math.max(Math.abs(objs[i].lat - objs[j].lat), Math.abs(objs[i].lng - objs[j].lng))

          if (30 / Math.pow(2, zoom) / unit <= d)
            if (isLine) break
            else continue

          ts[j] = true
          t.push(objs[j])
        }
        ns.push(t)
      }

      ts = null
      return func && func(ns) || ns
    },
  },
  template: El(`
    main#main
      div#error => *if=error   *text=error
      template => *else
        div#map => ref=map

        label#at => :class={ show: false }
        div#updateAt => :class={ show: updateAt !== null }   *text=updateAt
        div#length => :class={ show: length !== null }   *text=length
        div#elapsed => :class={ show: elapsed !== null }   *text=elapsed
        div#status => :class={ show: status }   :status=status

        div#zoom => :class={ show: zoomShow }
          label => @click=zoomIn
          label => @click=zoomOut
        div#speeds => :class={ show: speeds.length, click: speedsClick }   @click=speedsClick=!speedsClick   :n=speeds.length
          b => *for=(speed, i) in speeds   :key=i   *text=speed   :style={backgroundColor: colors[i]}
        `)
})
