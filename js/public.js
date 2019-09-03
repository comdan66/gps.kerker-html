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
var _idleTimer = null;
var _lastZoom = null;
var _polylines = [];
var _markers = [];
var _signals = [];
var _isGetting = false;
var _colors = ['#f5c801', '#fbbb03', '#fcab0a', '#fc9913', '#fb871d', '#fa7226', '#f95d30', '#f94739', '#f93748', '#f72b5e'];

window.gmc = function() { $(window).trigger('gm'); };
function time() { return new Date().getTime(); }
function OAM(t) { this._div=null, this._option=Object.assign({className:"",top:0,left:0,width:32,height:32,html:"",map:null,position:null,css:{}},t),this._option.map&&this.setMap(this._option.map)}
function iOM() { OAM.prototype=new google.maps.OverlayView,Object.assign(OAM.prototype,{setPoint:function(){ if (!this._div) return; if(!this._option.position) return this._div.style.left="-999px",void(this._div.style.top="-999px"); if (!this.getProjection()) return;var t=this.getProjection().fromLatLngToDivPixel(this._option.position);t&&(this._div.style.left=t.x-this._option.width/2+this._option.left+"px",this._div.style.top=t.y-this._option.height/2+this._option.top+"px")},draw:function(){this.setPoint()},onAdd: function() {for(var t in this._div=document.createElement("div"),this._div.style.position="absolute",this._div.className=this._option.className,this._div.style.width=this._option.width+"px",this._div.style.height=this._option.height+"px",this._div.innerHTML=this._option.html,this._option.css)"width"!=t&&"height"!=t&&"top"!=t&&"left"!=t&&"bottom"!=t&&"right"!=t&&(this._div.style[t]=this._option.css[t]);var i=this;google.maps.event.addDomListener(this._div,"click",function(t){t.stopPropagation&&t.stopPropagation(),google.maps.event.trigger(i,"click")}),this.getPanes().overlayImage.appendChild(this._div)},remove:function(){return this._div&&(this._div.parentNode.removeChild(this._div),this._div=null),this},setHtml:function(t){this._option.html=t;return this._div&&(this._div.innerHTML=this._option.html),this},setPosition:function(t){return this.map&&(this._option.position=t,this.setPoint()),this},getPosition:function(){return this._option.position}})}
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
    get: function(cb0, cb1, cb2) {
      var val = Storage.get(Geo.key);
      if (val && typeof val === 'object' && typeof val.t === 'number' && typeof val.v === 'object' && val.t + Geo.ttl > time()) return cb1 && cb1(Geo.data = val.v);
      else return navigator.geolocation.getCurrentPosition(function(position) {
        Geo.data = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          acc: position.coords.accuracy
        };

        Storage.set(Geo.key, {
          t: time(),
          v: Geo.data});

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

        if (_markers.length) {
          var b = new google.maps.LatLngBounds();
          b.extend(_myMarker.getPosition());
          for (var j in _markers) b.extend(_markers[j].getPosition());
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
  }

  var Length = {
    $el: null,
    _data: 0,
    init: function() {
      return Length.$el === null ? Length.$el = $('<div />').attr('id', 'length').appendTo($body) : Length.$el.empty();
    },
    cale: function(a, b) {
      var aa = (a.lat / 180) * Math.PI;
      var bb = (a.lng / 180) * Math.PI;
      var cc = (b.lat / 180) * Math.PI;
      var dd = (b.lng / 180) * Math.PI;
      return (2 * Math.asin(Math.sqrt(Math.pow(Math.sin((aa - cc) / 2), 2) + Math.cos(aa) * Math.cos(cc) * Math.pow(Math.sin((bb - dd) / 2), 2)))) * 6378137;
    },
    data: function(data) {
      Length._data = 0;
      for (var i = 1; i < data.length; i++)
        Length._data += Length.cale(data[i - 1], data[i]);
      Length._data = (Length._data / 1000).toFixed(2);
    },
    show: function(closure) {
      Length.init().text(Length._data);
      return setTimeout(function() {
        Length.$el.addClass('show');
        return closure && closure();
      }, 100);
    }
  };

  var Speeds = {
    $el: null,
    _data: [],
    init: function() {
      return Speeds.$el === null ? Speeds.$el = $('<div />').attr('id', 'speeds').appendTo($body) : Speeds.$el.empty();
    },
    data: function(speeds) {
      Speeds._data = speeds.map(function(speed) {
        return $('<b />').text(speed);
      });
    },
    show: function(closure) {
      Speeds.init().append(Speeds._data);
      return setTimeout(function() {
        Speeds.$el.addClass('show n' + Speeds._data.length);
        return closure && closure();
      }, 100);
    }
  };

  var error = function(emoticons, message) {
    return Loading.hide(function() { $body.empty().append($('<div />').attr('id', 'map').attr('data-emoticons', emoticons).attr('data-error', message)); });
  };

  var fetch = function(course) {
    _polylines = _polylines.map(markerRemove).filter(filterNotNull);
    _markers = _markers.map(markerRemove).filter(filterNotNull);

    if (!_signals.length)
      return;

    _markers = cluster(_signals, _mMap.zoom, 1, true).map(function(data) {
      var marker = new OAM({
        map: _mMap,
        position: genLatLng(data),
        width: 14,
        height: 14,
        className: 'OAMarker speed' + data[0].speed + ' course' + data[0].course,
        html: ("<span>" + '' + "</span>")});
      marker.speed = data[0].speed
      return marker;
    });

    for (var i = 1; i < _markers.length; i++)
      _polylines.push(new google.maps.Polyline({
        map: _mMap,
        strokeWeight: 5,
        strokeColor: _colors[_markers[i - 1].speed - 1],
        path: [_markers[i - 1].getPosition(), _markers[i].getPosition()]
      }));

    return course && course();
  };

  var getData = function(closure) {
    if (_isGetting) return;
    else _isGetting = true;

    return $.get('/json/' + Params.val.bo + '.json' + '?t=' + time(), function(response) {
      var cnt = 10;
      var tmps = response.map(function(t) { return t.speed; });
      var min = tmps.reduce(function(a, b) { return Math.min(a, b); });
      var max = tmps.reduce(function(a, b) { return Math.max(a, b); });
      var unit = parseInt(Math.round((max - min + 1) / cnt), 10);

      var speeds = [min]
      for (var i = 1; i <= cnt - 2; i++)
        if (min + i * unit < max)
          speeds.push(min + i * unit);
        else
          break
      speeds.push(max);

      _signals = response.map(function(t) {
        for (var i in speeds)
          if (t.speed <= speeds[i])
            break;
        i++;
        t.speed = i + '';
        return t;
      });

      Speeds.data(speeds);
      Length.data(_signals);

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
      GeoAt.show(function() {
        Length.show(function() {
          Speeds.show(function() {
            Loading.hide(function() {
              fetch(function() {
                _lastZoom = _mMap.zoom;
                _mMap.addListener('idle', function() { if (_mMap.zoom === _lastZoom) return; else _lastZoom = _mMap.zoom; clearTimeout(_idleTimer); _idleTimer = setTimeout(fetch, 300); });
                setInterval(getData, 2 * 1000)
              });
            });
          });
        });
      });
    });
  };

  Loading.show('初始中…', Params.val.bo === null ? error.bind(null, 'ʕ•ᴥ•ʔ', '您沒有權限看喔！') : getData.bind(null, googleInit));
});