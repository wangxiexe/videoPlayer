  var emptyFn = function() {};

  function Loading(d) {

    this.converter = d.converter;

    this.data = d.path || d.data;
    this.imageData = [];

    this.multiplier = d.multiplier || 1;
    this.padding = d.padding || 0;

    this.fps = d.fps || 25;

    this.stepsPerFrame = ~~d.stepsPerFrame || 1;
    this.trailLength = d.trailLength || 1;
    this.pointDistance = d.pointDistance || .05;

    this.domClass = d.domClass || 'Loading';

    this.backgroundColor = d.backgroundColor || 'rgba(0,0,0,0)';
    this.fillColor = d.fillColor;
    this.strokeColor = d.strokeColor;
	this.defaultImage=d.defaultImage;
    this.stepMethod = typeof d.step == 'string' ?
      stepMethods[d.step] :
      d.step || stepMethods.square;

    this._setup = d.setup || emptyFn;
    this._teardown = d.teardown || emptyFn;
    this._preStep = d.preStep || emptyFn;

    this.pixelRatio = d.pixelRatio || null;

    this.width = d.width;
    this.height = d.height;

    this.fullWidth = this.width;
    this.fullHeight = this.height;

    this.domClass = d.domClass || 'Loading';

    this.setup();
  }

  var argTypes = Loading.argTypes = {
    DIM: 1,
    DEGREE: 2,
    RADIUS: 3,
    OTHER: 0
  };

  var argSignatures = Loading.argSignatures = {
    arc: [1, 1, 3, 2, 2, 0],
    bezier: [1, 1, 1, 1, 1, 1, 1, 1],
    line: [1, 1, 1, 1]
  };

  var pathMethods = Loading.pathMethods = {
    bezier: function(t, p0x, p0y, p1x, p1y, c0x, c0y, c1x, c1y) {

      t = 1 - t;

      var i = 1 - t,
        x = t * t,
        y = i * i,
        a = x * t,
        b = 3 * x * i,
        c = 3 * t * y,
        d = y * i;

      return [
        a * p0x + b * c0x + c * c1x + d * p1x,
        a * p0y + b * c0y + c * c1y + d * p1y
      ]

    },
    arc: function(t, cx, cy, radius, start, end) {

      var point = (end - start) * t + start;

      var ret = [
        (Math.cos(point) * radius) + cx,
        (Math.sin(point) * radius) + cy
      ];

      ret.angle = point;
      ret.t = t;

      return ret;

    },
    line: function(t, sx, sy, ex, ey) {
      return [
        (ex - sx) * t + sx,
        (ey - sy) * t + sy
      ]
    }
  };

  var stepMethods = Loading.stepMethods = {

    square: function(point, i, f, color, alpha) {
      this._.fillRect(point.x - 3, point.y - 3, 6, 6);
    },

    fader: function(point, i, f, color, alpha) {

      this._.beginPath();

      if (this._last) {
        this._.moveTo(this._last.x, this._last.y);
      }

      this._.lineTo(point.x, point.y);
      this._.closePath();
      this._.stroke();

      this._last = point;

    }
  }

  Loading.prototype = {

    calculatePixelRatio: function() {

      var devicePixelRatio = window.devicePixelRatio || 1;
      var backingStoreRatio = this._.webkitBackingStorePixelRatio || this._.mozBackingStorePixelRatio || this._.msBackingStorePixelRatio || this._.oBackingStorePixelRatio || this._.backingStorePixelRatio || 1;

      return devicePixelRatio / backingStoreRatio;
    },

    setup: function() {

      var args,
        type,
        method,
        value,
        data = this.data;

      this.canvas = document.createElement('canvas');
      this._ = this.canvas.getContext('2d');

      if (this.pixelRatio == null) {
        this.pixelRatio = this.calculatePixelRatio();
      }

      this.canvas.className = this.domClass;
      this.canvas.height = this.fullHeight;
      this.canvas.width = this.fullWidth;

      this.points = [];

      for (var i = -1, l = data.length; ++i < l;) {

        args = data[i].slice(1);
        method = data[i][0];

        if (method in argSignatures)
          for (var a = -1, al = args.length; ++a < al;) {

            type = argSignatures[method][a];
            value = args[a];

            switch (type) {
              case argTypes.RADIUS:
                value *= this.multiplier;
                break;
              case argTypes.DIM:
                value *= this.multiplier;
                value += this.padding;
                break;
              case argTypes.DEGREE:
                value *= Math.PI / 180;
                break;
            };

            args[a] = value;

          }

        args.unshift(0);

        for (var r, pd = this.pointDistance, t = pd; t <= 1; t += pd) {

          // Avoid crap like 0.15000000000000002
          t = Math.round(t * 1 / pd) / (1 / pd);

          args[0] = t;

          r = pathMethods[method].apply(null, args);

          this.points.push({
            x: r[0],
            y: r[1],
            progress: t
          });

        }

      }

      this.frame = 0;

      if (this.converter && this.converter.setup) {
        this.converter.setup(this);
      }

    },

    prep: function(frame) {

      if (frame in this.imageData) {
        return;
      }

      this._.clearRect(0, 0, this.fullWidth, this.fullHeight);
      this._.fillStyle = this.backgroundColor;
      this._.fillRect(0, 0, this.fullWidth, this.fullHeight);

      var points = this.points,
        pointsLength = points.length,
        pd = this.pointDistance,
        point,
        index,
        frameD;

      this._setup();

      for (var i = -1, l = pointsLength * this.trailLength; ++i < l && !this.stopped;) {

        index = frame + i;

        point = points[index] || points[index - pointsLength];

        if (!point) continue;

        this.alpha = Math.round(1000 * (i / (l - 1))) / 1000;

        this._.globalAlpha = this.alpha;

        if (this.fillColor) {
          this._.fillStyle = this.fillColor;
        }
        if (this.strokeColor) {
          this._.strokeStyle = this.strokeColor;
        }

        frameD = frame / (this.points.length - 1);
        indexD = i / (l - 1);

        this._preStep(point, indexD, frameD);
        this.stepMethod(point, indexD, frameD);

      }

      this._teardown();

      try {
        this.imageData[frame] = (
          this._.getImageData(0, 0, this.fullWidth, this.fullHeight)
        );
      } catch (e) {}

      return true;

    },

    draw: function() {

      if (!this.prep(this.frame)) {

        this._.clearRect(0, 0, this.fullWidth, this.fullWidth);

        this._.putImageData(
          this.imageData[this.frame],
          0, 0
        );

      }

      if (this.converter && this.converter.step) {
        this.converter.step(this);
      }

      if (!this.iterateFrame()) {
        if (this.converter && this.converter.teardown) {
          this.converter.teardown(this);
          this.converter = null;
        }
      }

    },

    iterateFrame: function() {

      this.frame += this.stepsPerFrame;

      if (this.frame >= this.points.length) {
        this.frame = 0;
        return false;
      }

      return true;

    },

    play: function() {

      this.stopped = false;

      var hoc = this;

      this.timer = setInterval(function() {
        hoc.draw();
      }, 1000 / this.fps);

    },
	drawDefault:function(){
		//this._.clearRect(0, 0, this.fullWidth, this.fullHeight);
		var img=new Image();
		img.src=this.defaultImage;
		var me=this;
		img.onload=function(){
			var d=me.getImageProperty(img.width,img.height);
			me._.drawImage(img,d.l,d.t,d.w, d.h);
		}
		img.onerror=function(){
			me._.fillRect(0,0,me.fullWidth,me.fullHeight);
		}
		
	},

    getImageProperty: function(wid,hei) {
      var w = 0,
        h = 0,
        l = 0,
        t = 0,
        p = 0;
      var realWidth = wid;
      var realHeight =hei;
      var playWidth =  this.fullWidth;
      var playHeight =  this.fullHeight;
      var p1 = realWidth / playWidth;
      var p2 = realHeight / playHeight;
      if (p1 <= p2) {
        h = Math.min(realHeight, playHeight);
        p = realHeight / h;
        w = realWidth / p;

      } else {
        w = Math.min(realWidth, playWidth);
        p = realWidth / w;
        h = realHeight / p;
      }
      l = (playWidth - w) / 2;
      t = (playHeight - h) / 2;
      return {
        w: w,
        h: h,
        l: l,
        t: t
      };
    },

    stop: function() {

      this.stopped = true;
      this.timer && clearInterval(this.timer);

    }
  };
