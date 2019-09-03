/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 - 2019, Ginkgo
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

var _mKeys = ['AIzaSyBF02Xytwx2peyWWpiUwkQDgng_FYmnBaA'];
var _mDefaultPosition = { lat: 23.77133806905457, lng: 120.70937982351438 };
var _gInited = false;
var _mInited = false;
var _mFunc = null;
var _mMap = null;
var _myMarker = null;
var _nowMarker = null;
var _idleTimer = null;
var _lastZoom = null;
var _intervalTimer = null;

var _signals = [];
var _signalMarkers = [];

var _stops = [];
var _stopMarkers = [];

var _polylines = [];

var _isGetting = false;
var _colors = ['#f5c801', '#fbbb03', '#fcab0a', '#fc9913', '#fb871d', '#fa7226', '#f95d30', '#f94739', '#f93748', '#f72b5e'];
// var _getDataTime = 3 * 1000;
var _getDataTime = 64 * 1000;

window.gmc = function() { $(window).trigger('gm'); };
function time() { return new Date().getTime(); }
function OAM(t) { this._div=null, this._option=Object.assign({className:"",top:0,left:0,width:32,height:32,html:"",map:null,position:null,css:{}},t),this._option.map&&this.setMap(this._option.map)}
function iOM() { OAM.prototype=new google.maps.OverlayView,Object.assign(OAM.prototype,{setPoint:function(){ if (!this._div) return; if(!this._option.position) return this._div.style.left="-999px",void(this._div.style.top="-999px"); if (!this.getProjection()) return;var t=this.getProjection().fromLatLngToDivPixel(this._option.position);t&&(this._div.style.left=t.x-this._option.width/2+this._option.left+"px",this._div.style.top=t.y-this._option.height/2+this._option.top+"px")},draw:function(){this.setPoint()},onAdd: function() {for(var t in this._div=document.createElement("div"),this._div.style.position="absolute",this._div.className=this._option.className,this._div.style.width=this._option.width+"px",this._div.style.height=this._option.height+"px",this._div.innerHTML=this._option.html,this._option.css)"width"!=t&&"height"!=t&&"top"!=t&&"left"!=t&&"bottom"!=t&&"right"!=t&&(this._div.style[t]=this._option.css[t]);var i=this;google.maps.event.addDomListener(this._div,"click",function(t){t.stopPropagation&&t.stopPropagation(),google.maps.event.trigger(i,"click")}),this.getPanes().overlayImage.appendChild(this._div)},remove:function(){return this._div&&(this._div.parentNode.removeChild(this._div),this._div=null),this},setHtml:function(t){this._option.html=t;return this._div&&(this._div.innerHTML=this._option.html),this}
  ,getClassName:function(){
  return this._option.className
},setClassName:function(t){
  this._option.className=t;
  return this._div&&(this._div.className=this._option.className),this
},
setPosition:function(t){return this.map&&(this._option.position=t,this.setPoint()),this},getPosition:function(){return this._option.position}})}
function genLatLng(t) { return new google.maps.LatLng(t[0].lat, t[0].lng); }
function markerRemove(t) { t.map && t.setMap(null); return null; }
function filterNotNull(t) { return t !== null; }
function array1D2D(l, c) { var arr = []; for (var i = 0; i < l.length; i++) if (typeof arr[parseInt(i / c, 10)] == 'undefined') arr[parseInt(i / c, 10)] = [l[i]]; else arr[parseInt(i / c, 10)][i % c] = l[i]; return arr; }
function googleMapsCallback() { if (_mInited) return; else _mInited = true; _mDefaultPosition = genLatLng([_mDefaultPosition]); _mFunc && _mFunc(); }
function googleInit() { if (_gInited) return; else _gInited = true; $(window).bind('gm', googleMapsCallback); var key = _mKeys[Math.floor((Math.random() * _mKeys.length))]; $.getScript('https://maps.googleapis.com/maps/api/js?' + (key ? 'key=' + key + '&' : '') + 'language=zh-TW&libraries=visualization&callback=gmc', googleMapsCallback); return true; }

function cluster(oris, zoom, unit, lineStyle, closure) {
  if (!oris.length)
    return closure ? closure([]) : [];

  var tmps = {};
  var news = [];
  
  for (var i = 0; i < oris.length; i++) {
    if (typeof tmps[i] !== 'undefined')
      continue;

    tmps[i] = true;
    var tmp = [oris[i]];

    for (var j = i + 1; j < oris.length; j++) {
      if (typeof tmps[j] !== 'undefined')
        if (lineStyle)
          break;
        else
          continue;

      var distance = Math.max(Math.abs(oris[i].lat - oris[j].lat), Math.abs(oris[i].lng - oris[j].lng));

      if (30 / Math.pow(2, zoom) / unit <= distance)
        if (lineStyle)
          break;
        else
          continue;

      tmps[j] = true;
      tmp.push(oris[j]);
    }

    news.push(tmp);
  }

  tmps = null;
  return closure ? closure(news) : news;
}


$(function() {
  var $body = $('body');
  var $map = $('#map');

  var Params = {
    val: {},
    init: function() {
      window.location.search.replace(/^\?/, '').split('&').forEach(function(val) {
        var splitter = val.split('=');
        if (splitter.length != 2) return;
        var k = decodeURIComponent(splitter[0]), v = decodeURIComponent(splitter[1]);
        if (k.slice (-2) == '[]')
          if (!this.val[k = k.slice(0, -2)])
            this.val[k] = [v];
          else this.val[k].push(v);
          else this.val[k] = v;
      }.bind(this));

      this.val.bo = typeof this.val.bo !== 'undefined' && this.val.bo.length ? this.val.bo : null;
      return this;
    }
  }.init();

  var Storage = {
    exist: function() { return typeof Storage !== 'undefined' && typeof JSON !== 'undefined'; },
    set: function(key, val) { if (!this.exist()) return false; try { localStorage.setItem(key, val === undefined ? null : JSON.stringify(val)); return true; } catch(error) { return false; } },
    get: function(key) { if (!this.exist()) return false; val = localStorage.getItem(key); return JSON.parse(val); }
  };

  var Geo = {
    key: 'gps.kerker.tw',
    ttl: 10 * 60 * 1000,
    data: {},
    timeout: 5 * 1000,
    fail: null,
    get: function(cb0, cb1, cb2) {
      var val = Storage.get(Geo.key);
      if (val && typeof val === 'object' && typeof val.t === 'number' && typeof val.v === 'object' && val.t + Geo.ttl > time()) return cb1 && cb1(Geo.data = val.v);
      setTimeout(function() { if (Geo.fail === false) return; else Geo.fail = true; return cb2 && cb2(); }, Geo.timeout);
      return navigator.geolocation.getCurrentPosition(function(position) {
        if (Geo.fail === true) return; else Geo.fail = false;
        Geo.data = { lat: position.coords.latitude, lng: position.coords.longitude, acc: position.coords.accuracy };
        Storage.set(Geo.key, { t: time(), v: Geo.data});
        cb0 && cb0(Geo.data);
        cb1 && cb1(Geo.data);
      }, cb2, { enableHighAccuracy: true });
    }
  };

  var Loading = {
    $el: null,
    $el2: null,
    timer: null,
    init: function() { if (Loading.$el !== null) return; Loading.$el = $('<div />').attr('id', 'loading').appendTo($body); Loading.$el2 = $('<span />').appendTo(Loading.$el); },
    remove: function() { if (Loading.$el !== null) Loading.$el.remove(); if (Loading.$el2 !== null) Loading.$el2.remove(); },
    show: function(message, closure) { Loading.init(); Loading.$el2.text(message); Loading.$el.addClass('show'); return Loading.timer = setTimeout(function() { Loading.$el.addClass('ani'); setTimeout(function() { clearTimeout(Loading.timer); Loading.timer = null; }, 300); closure && closure(); }, 100); },
    hide: function(closure) { var tmp = function() { clearTimeout(Loading.timer); Loading.timer = null; Loading.$el.removeClass('ani'); return setTimeout(function() { Loading.$el.removeClass('show'); Loading.remove(); closure && closure(); }, 300); }; if (Loading.timer !== null) setTimeout(tmp, 500); else tmp(); }
  };

  var Zoom = {
    $el: null,
    $el2: null,
    $el3: null,
    init: function() {
      if (Zoom.$el !== null) return;
      Zoom.$el = $('<div />').attr('id', 'zoom').appendTo($body);
      Zoom.$el2 = $('<label />').attr('id', 'zoomIn').click(function() { _mMap.setZoom(_mMap.zoom + 1); }).appendTo(Zoom.$el);
      Zoom.$el3 = $('<label />').attr('id', 'zoomOut').click(function() { _mMap.setZoom(_mMap.zoom - 1); }).appendTo(Zoom.$el);
    },
    show: function(closure) {
      Zoom.init();
      return setTimeout(function() {
        Zoom.$el.addClass('show');
        return closure && closure();
      }, 100);
    },
  };

  var GeoAt = {
    $el: null,
    init: function() {
      if (GeoAt.$el !== null) return;
      return GeoAt.$el = $('<label />').attr('id', 'at').click(function() {
        if (_myMarker === null) _myMarker = new OAM({ map: _mMap, width: 16, height: 16, className: 'myMarker', html: "" });
        _myMarker.setPosition(new google.maps.LatLng(Geo.data.lat, Geo.data.lng));

        if (_signalMarkers.length) {
          var b = new google.maps.LatLngBounds();
          b.extend(_myMarker.getPosition());
          for (var j in _signalMarkers) b.extend(_signalMarkers[j].getPosition());
          _mMap.fitBounds(b);
        } else {
          _mMap.setOptions({ center: _myMarker.getPosition() });
        }
      }).appendTo($body);
    },
    show: function(closure) {
      return Geo.get(null, function() {
        GeoAt.init();
        return setTimeout(function() {
          GeoAt.$el.addClass('show');
          return closure && closure();
        }, 100);
      }, closure);
    }
  };

  var UpdateAt = {
    $el: null,
    init: function() {
      return UpdateAt.$el === null ? UpdateAt.$el = $('<div />').attr('id', 'updateAt').appendTo($body) : UpdateAt.$el.empty();
    },
    data: function(data) {
      return UpdateAt.init().text(data);
    },
    show: function(closure) {
      return setTimeout(function() {
        UpdateAt.$el.addClass('show');
        return closure && closure();
      }, 100);
    }
  };

  var Elapsed = {
    $el: null,
    init: function() {
      return Elapsed.$el === null ? Elapsed.$el = $('<div />').attr('id', 'elapsed').appendTo($body) : Elapsed.$el.empty();
    },
    data: function(data) {
      return Elapsed.init().text(data);
    },
    show: function(closure) {
      return setTimeout(function() {
        Elapsed.$el.addClass('show');
        return closure && closure();
      }, 100);
    }
  };

  var Stops = {
    $el: null,
    init: function() {
      return Stops.$el === null ? Stops.$el = $('<div />').attr('id', 'stops').appendTo($body) : Stops.$el.empty();
    },
    data: function(data) {
      return Stops.init().text(data);
    },
    show: function(closure) {
      return setTimeout(function() {
        Stops.$el.addClass('show');
        return closure && closure();
      }, 100);
    }
  };

  var Length = {
    $el: null,
    init: function() {
      return Length.$el === null ? Length.$el = $('<div />').attr('id', 'length').appendTo($body) : Length.$el.empty();
    },
    data: function(data) {
      return Length.init().text(data);
    },
    show: function(closure) {
      return setTimeout(function() {
        Length.$el.addClass('show');
        return closure && closure();
      }, 100);
    }
  };

  var Speeds = {
    $el: null,
    init: function() {
      return Speeds.$el === null ? Speeds.$el = $('<div />').attr('id', 'speeds').appendTo($body).click(function() {
        $(this).toggleClass('click');
      }) : Speeds.$el.empty();
    },
    data: function(speeds) {
      return Speeds.init().append(speeds.map(function(speed) {
        return $('<b />').text(speed);
      })).attr('n', speeds.length);
    },
    show: function(closure) {
      return setTimeout(function() {
        Speeds.$el.addClass('show');
        return closure && closure();
      }, 100);
    }
  };

  var Status = {
    $el: null,
    init: function() {
      return Status.$el === null ? Status.$el = $('<div />').attr('id', 'status').appendTo($body) : Status.$el.empty();
    },
    data: function(data) {
      return Status.init().attr('status', data);
    },
    show: function(closure) {
      return setTimeout(function() {
        Status.$el.addClass('show');
        return closure && closure();
      }, 100);
    }
  };

  var Title = {
    $el: null,
    ori: '',
    init: function() {
      if (Title.$el !== null)
        return Title.$el.empty();

      Title.$el = $('title');
      Title.ori = Title.$el.text();
      Title.ori = Title.ori.length > 0 ? ' | ' + Title.ori : '';

      return Title.$el.empty();
    },
    data: function(data) {
      return Title.init().text(data + Title.ori);
    },
    show: function(closure) {
      return closure && closure();
    }
  };

  var TimeTool = {
    elapsed: function(data) {
      if (data === 0)
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
        var dataUnit = data % contitions[i].base
        
        if (dataUnit != 0)
          units.push(dataUnit + contitions[i].format)

        data = Math.floor(data / contitions[i].base)
        if (data < 1)
          break
      }

      if (data > 0)
        units.push(data + '年')

      if (units.length < 1)
        units.push(data + '秒')

      return units.reverse().join(' ')
    },
    ago: function(x) {
      var range = time() / 1000 - x,
          formats = [{base: 10, format: '剛剛'}, {base: 6, format: '不到 1 分鐘'}, {base: 60, format: ' 分鐘前'}, {base: 24, format: ' 小時前'}, {base: 30, format: ' 天前'}, {base: 12, format: ' 個月前'}],
          unit = 1,
          tmp = 0;

      for (var i = 0; i < formats.length; i++, unit = tmp) {
        tmp = formats[i].base * unit;
        if (range < tmp)
          return (i > 1 ? parseInt(range / unit, 10) : '') + formats[i].format;
      }
      return parseInt(range / unit, 10) + ' 年前';
    }
  };

  var error = function(emoticons, message) {
    return Loading.hide(function() { $body.empty().append($('<div />').attr('id', 'map').attr('data-emoticons', emoticons).attr('data-error', message)); });
  };

  var fetch = function(course) {
    _polylines = _polylines.map(markerRemove).filter(filterNotNull);
    _signalMarkers = _signalMarkers.map(markerRemove).filter(filterNotNull);
    _stopMarkers = _stopMarkers.map(markerRemove).filter(filterNotNull);

    if (!_signals.length) {
      if (_nowMarker !== null)
        _nowMarker.setMap(null);
      return course && course();
    }

    if (_nowMarker === null) _nowMarker = new OAM({ map: _mMap, width: 44, height: 72, top: -72 / 2 + 8, className: 'nowMarker', html: "<div><span style='background-image: url(/img/icon2-64-tiny.png)'></span></div>" });
    _nowMarker.setPosition(new google.maps.LatLng(_signals[0].lat, _signals[0].lng));

    _signalMarkers = cluster(_signals, _mMap.zoom, 1, true).map(function(data) {
      var marker = new OAM({
        map: _mMap,
        position: genLatLng(data),
        width: 14,
        height: 14,
        className: 'signalMarker speed' + data[0].speed + ' course' + data[0].course,
        html: ("<span>" + '' + "</span>")});
      marker.speed = data[0].speed
      return marker;
    });

    for (var i = 1; i < _signalMarkers.length; i++)
      _polylines.push(new google.maps.Polyline({
        map: _mMap,
        strokeWeight: 5,
        strokeColor: _colors[_signalMarkers[i - 1].speed - 1],
        path: [_signalMarkers[i - 1].getPosition(), _signalMarkers[i].getPosition()]
      }));
      
    _stopMarkers = cluster(_stops, _mMap.zoom, 1, true).map(function(data) {
      var marker = new OAM({
        map: _mMap,
        position: genLatLng(data),
        width: 24,
        height: 24,
        className: 'stopMarker',
        html: ("<div cnt='" + data.length + "'>" + '<span data-title="停留了 ' + TimeTool.elapsed(data[0].elapsed) + '"></span>' + "</div>")});

      marker.addListener('click', function() {
        marker.setClassName(marker.getClassName() == 'stopMarker show' ? 'stopMarker' : 'stopMarker show')
      })

      return marker;
    });
    
    return course && course();
  };

  var getData = function(closure) {
    if (_isGetting) return;
    else _isGetting = true;

    return $.get('/json/' + Params.val.bo + '.json' + '?t=' + time(), function(response) {
      _signals = response.signals;
      _stops = response.stops

      Title.data(response.title);
      
      Speeds.data(response.speeds);

      Stops.data(response.stops.length);
      Length.data(response.length);
      Elapsed.data(TimeTool.elapsed(response.elapsed));
      UpdateAt.data(TimeTool.ago(response.updateAt));

      Status.data(response.enable);

      if (response.enable)
        return closure ? closure() : fetch();

      clearInterval(_intervalTimer);
      _intervalTimer = null;

      return closure ? closure() : fetch();
    }).fail(error.bind(null, '(ಥ﹏ಥ)', '哭哭，取不到資料！')).always(function() {
      _isGetting = false;
    });
  };

  _mFunc = function() {
    if (_mMap) return;
    else _mMap = new google.maps.Map($map.get(0), { zoom: 7, clickableIcons: false, disableDefaultUI: true, gestureHandling: 'greedy', center: _mDefaultPosition }); iOM();
    _mMap.mapTypes.set('ms', new google.maps.StyledMapType([{stylers: [{gamma: 0}, {weight: 0.75}] }, {featureType: 'all', stylers: [{ visibility: 'on' }]}, {featureType: 'administrative', stylers: [{ visibility: 'on' }]}, {featureType: 'landscape', stylers: [{ visibility: 'on' }]}, {featureType: 'poi', stylers: [{ visibility: 'on' }]}, {featureType: 'road', stylers: [{ visibility: 'simplified' }]}, {featureType: 'road.arterial', stylers: [{ visibility: 'on' }]}, {featureType: 'transit', stylers: [{ visibility: 'on' }]}, {featureType: 'water', stylers: [{ color: '#b3d1ff', visibility: 'on' }]}, {elementType: "labels.icon", stylers:[{ visibility: 'off' }]}]));
    _mMap.setMapTypeId('ms');
    

    if (_signals.length >= 2) {
      var bounds = new google.maps.LatLngBounds();
      for (var i in _signals)
        bounds.extend(new google.maps.LatLng(_signals[i].lat, _signals[i].lng));
      _mMap.fitBounds(bounds);
    }

    Zoom.show(function() {
      GeoAt.show();

      UpdateAt.show(function() {
        Title.show(function() {
          Status.show(function() {
            Speeds.show(function() {
              Elapsed.show(function() {
                Length.show(function() {
                  Stops.show(function() {
                    Loading.hide(function() {
                      fetch(function() {
                        _lastZoom = _mMap.zoom;
                        _mMap.addListener('idle', function() { if (_mMap.zoom === _lastZoom) return; else _lastZoom = _mMap.zoom; clearTimeout(_idleTimer); _idleTimer = setTimeout(fetch, 300); });
                        _intervalTimer = setInterval(getData, _getDataTime);
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  };

  Loading.show('初始中…', Params.val.bo === null ? error.bind(null, 'ʕ•ᴥ•ʔ', '您沒有權限看喔！') : getData.bind(null, googleInit));
});