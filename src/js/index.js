/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2019, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

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
    template: '<div :class="className" :style="style" v-html="html" v-on="on"></div>'
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


$(_ => {

})