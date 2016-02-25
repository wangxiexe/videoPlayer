(function() {
  root = this;
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || setTimeout;

  function PlayerBase() {
    this.initilize.apply(this, arguments);
  };

  PlayerBase.prototype = {
    initilize: function(options) {
      this.extend = this.createAssigner(this.allKeys);
      this.options = {
        container: "", //播放器容器id
        liveUrl: "", //直播流URL
        url: "", //视频URL
        isLoop: true, //是否循环播放, 直播时无效
        isLive: false, //是否是直播
        defaultResolution: "426x240", //默认分辨率
        playPauseButton: "", //播放（暂停）按钮id
        screenBtn: "", //全屏点击按钮id
        playPauseCallBack: null, //播放（暂停）回调函数，返回是否暂停
        progressCtn: "", //进度容器id
        progressBar: "", //进度条id
        timeUpdateCallBack: null, //播放进度回调函数，返回总时间、当前播放时间、播放进度百分比
        onLoadedMetaData: null, //当视频载入元数据时的回调函数
        onEndedCallBack: null, //播放结束时的回调函数，循环播放时无效
        onSeekStartCallBack: null, //Seek开始回调函数
        onSeekEndCallBack: null, //Seek结束回调函数
        indexErrorRetryNum: 5, //索引请求错误重试次数
        segErrorRetryNum: 5, //分片请求错误重试次数
        sendLogCallBack: null //日志发送回调
      }
      if (options)
        this.extend(this.options, options);

      //初始化，生成playerID，获取相关DOM原色
      this.playerId = this.randomStr(24);
      this.container = this.getID(this.options.container);
      this.playPauseButton = this.getID(this.options.playPauseButton);
      this.screenBtn = this.getID(this.options.screenBtn);
      this.progressCtn = this.getID(this.options.progressCtn);
      this.progressBar = this.getID(this.options.progressBar);

      //如果是PC端、非safari、且URL是直播形式URL
      if (!this.isMobile() && !this.isSafari() && this.options.url === "") {
        this.resolution = this.options.defaultResolution;
        this.playWidth = parseInt(this.resolution.split("x")[0]);
        this.playHeight = parseInt(this.resolution.split("x")[1]);
        var loadingOption = {
          width: this.playWidth,
          height: this.playHeight,
          stepsPerFrame: 5, // best between 1 and 5
          trailLength: 0.9, // between 0 and 1
          pointDistance: 0.01, // best between 0.01 and 0.05
          fps: 20,
          backgroundColor: '#272822',
          fillColor: '#009688',
          path: [
            ['arc', this.playWidth / 2, this.playHeight / 2, 30, 0, 360]
          ],
          step: function(point, index, frame) {
            // `this._` is a HTML 2d Canvas Context
            var sizeMultiplier = 4; // try changing this :)
            this._.beginPath();
            this._.moveTo(point.x, point.y);
            this._.arc(
              point.x, point.y,
              index * sizeMultiplier, 0,
              Math.PI * 2, false
            );
            this._.closePath();
            this._.fill();
          }
        };
        this.canvasLoading = new Loading(loadingOption);
        this.container.appendChild(this.canvasLoading.canvas);
        this.canvas = this.canvasLoading.canvas;
        this.canvasLoading.play();

        this.manifest = this.options.liveUrl;
        this.context = this.canvas.getContext('2d');
        this.nextIndex = 0;
        this.sentVideos = 0;
        this.currentVideo = null;
        this.videos = [];
        this.lastOriginal = 0;
        this.isBindSeek = false;
        this.isTriggerSeek = false;
        this.seekIndex = 0;
        this.filesInfo = [];
        this.seekTime = 0;
        //错误重试变量
        this.indexErrRetry = 0;
        this.indexErrTimer = 0;

        this.initLivePlayIndex();
      } else {
        var video = document.createElement('video'),
          me = this,
          source = document.createElement('source');
        video.controls = true;
        source.type = 'video/mp4';
        video.appendChild(source);
        video.src = source.src = this.options.hls;

        var onloadstart = function(e) {
          me.logInfo.loadStartTime = new Date().valueOf();
        };

        var onloadeddata = function() {};

        var onloaderror = function(e) {
          var logData = {
            date: new Date().valueOf(),
            type: "loaderror",
            playFailure: "请求数据时发生错误"
          }
          me.sendLog(logData)
        };

        var ontimeupdate = function(e) {};

        var onseeked = function(e) {
          //得到数据
          if (this.readyState !== 1) {
            me.logInfo.startSeek = false;
          }
        };

        var onseeking = function(e) {
          //请求中
          if (!me.logInfo.startSeek) {
            me.logInfo.startSeek = true;
          }
        };

        var onstalled = function(e) {
          if (me.logInfo.startSeek) {
            me.logInfo.startSeek = false;
            var logData = {
              type: "slow",
              msg: "网速慢"
            }
            me.sendLog(logData)
          }
          var logData = {
            type: "dataUnuseful",
            msg: "浏览器尝试获取媒体数据，但数据不可用"
          }
          me.sendLog(logData);
        };

        video.addEventListener('loadstart', onloadstart, false);
        video.addEventListener('loadeddata', onloadeddata, false);
        video.addEventListener('seeked', onseeked, false);
        video.addEventListener('seeking', onseeking, false);
        video.addEventListener('abort', onloaderror, false);
        video.addEventListener('error', onloaderror, false);
        video.addEventListener('stalled', onstalled, false);
        video.addEventListener('timeupdate', ontimeupdate, false);

        //video.onseeking = onseeking;

        video.load();
        this.container.appendChild(video);
        if (this.progressCtn) this.progressCtn.style.display = "none";
        if (this.progressBar) this.progressBar.style.display = "none";
      }
    },

    randomStr: function(max) {
      var randomStr_str = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ';
      var rv = '';
      for (var i = 0; i < max; i++) {
        rv += randomStr_str[Math.floor(Math.random() * randomStr_str.length)];
      }
      return rv;
    },

    detectOS: function() {
      var sUserAgent = navigator.userAgent || navigator.vendor || window.opera;
      var isWin = (navigator.platform == "Win32") || (navigator.platform == "Windows");
      var isMac = (navigator.platform == "Mac68K") || (navigator.platform == "MacPPC") || (navigator.platform == "Macintosh") || (navigator.platform == "MacIntel");
      if (isMac) return "Mac";
      var isUnix = (navigator.platform == "X11") && !isWin && !isMac;
      if (isUnix) return "Unix";
      var isLinux = (String(navigator.platform).indexOf("Linux") > -1);
      if (isLinux) return "Linux";
      if (isWin) {
        var isWin2K = sUserAgent.indexOf("Windows NT 5.0") > -1 || sUserAgent.indexOf("Windows 2000") > -1;
        if (isWin2K) return "Win2000";
        var isWinXP = sUserAgent.indexOf("Windows NT 5.1") > -1 || sUserAgent.indexOf("Windows XP") > -1;
        if (isWinXP) return "WinXP";
        var isWin2003 = sUserAgent.indexOf("Windows NT 5.2") > -1 || sUserAgent.indexOf("Windows 2003") > -1;
        if (isWin2003) return "Win2003";
        var isWinVista = sUserAgent.indexOf("Windows NT 6.0") > -1 || sUserAgent.indexOf("Windows Vista") > -1;
        if (isWinVista) return "WinVista";
        var isWin7 = sUserAgent.indexOf("Windows NT 6.1") > -1 || sUserAgent.indexOf("Windows 7") > -1;
        if (isWin7) return "Win7";
      }
      return "other";
    },

    sendInitLog: function() {
      var logData = {
          date: new Date().valueOf(),
          type: 101,
          gmt: new Date().getTimezoneOffset(),
          system: this.detectOS(),
          userAgent: navigator.userAgent || navigator.vendor || window.opera,
          playMetaData: this.options.hls
        }
        //this.sendLog(logData)
    },

    initLivePlayIndex: function() {
      // relative URL resolver
      var resolveURL = (function() {
        var doc = document,
          old_base = doc.getElementsByTagName('base')[0],
          old_href = old_base && old_base.href,
          doc_head = doc.head || doc.getElementsByTagName('head')[0],
          our_base = old_base || doc.createElement('base'),
          resolver = doc.createElement('a'),
          resolved_url;

        return function(base_url, url) {
          old_base || doc_head.appendChild(our_base);

          our_base.href = base_url;
          resolver.href = url;
          resolved_url = resolver.href; // browser magic at work here

          old_base ? old_base.href = old_href : doc_head.removeChild(our_base);

          return resolved_url;
        };
      })();
      var ajax = new XMLHttpRequest(),
        me = this;

      if (me.indexErrTimer) clearInterval(me.indexErrTimer);
      this.ajax = ajax;

      var onErrorIndex = function(e) {
        if (me.indexErrRetry <= me.options.indexErrorRetryNum) {
          me.indexErrTimer = setInterval(function() {
            me.initLivePlayIndex();
            me.indexErrRetry = me.indexErrRetry + 1;
          }, 2000)
        } else {
          if (me.indexErrTimer) {
            clearInterval(me.indexErrTimer);
          }
          var info = {
            type: 'dataUnuseful',
            msg: '尝试多次发送请求，但无结果响应'
          };
          me.sendLog(info);
          if (me.heartBeatTimer) {
            clearInterval(me.heartBeatTimer);
          }
        }
      };

      var onLoadIndex = function() {
        me.startSendHeartBeat();

        //解析m3u8文件
        var originals =
          this.responseText
          .split(/\r?\n/)
          .filter(RegExp.prototype.test.bind(/\.ts$/))
          .map(resolveURL.bind(null, me.manifest)),
          //获取每个.mp4的时间
          temp = this.responseText
          .split(/\r?\n/)
          .filter(RegExp.prototype.test.bind(/^\#EXTINF:/));

        if (originals.length === 0) {
          onErrorIndex();
        }
        //获取服务端推荐的分辨率
        me.resolution = this.responseText
          .split(/\r?\n/)
          .filter(RegExp.prototype.test.bind(/^\#EXT-X-RESOLUTION:/))[0];
        //如果服务端没有给出分辨率，就采用配置参数
        //me.resolution ? me.resolution = me.resolution.split(":")[1] : me.resolution = me.options.defaultResolution;
        //me.resolution = me.options.defaultResolution;
		me.resolution =me.options.specifiedResolution ? me.options.specifiedResolution: me.resolution.split(":")[1]
        me.realWidth = parseInt(me.resolution.split("x")[0]);
        me.realHeight = parseInt(me.resolution.split("x")[1]);
        me.setDrawVideoProperty();

        originals = originals.slice(originals.lastIndexOf(me.lastOriginal) + 1);
        me.lastOriginal = originals[originals.length - 1];

        var duration = [],
          total = 0,
          segTime = [];
        for (var i = 0; i < temp.length; i++) {
          var value = parseFloat(temp[i].split(":")[1].split(",")[0]);
          duration.push(value);
          total = total + value;
          var index = i,
            tempValue = 0;
          while (index > 0) {
            tempValue = parseFloat(temp[index - 1].split(":")[1].split(",")[0]) + tempValue;
            index--;
          }
          segTime.push(tempValue);
        }

        var filesInfo = originals.map(function(url, index) {
          return {
            url: url + "?" + index, //new Date().valueOf(),
            index: index,
            time: duration[index],
            total: total,
            segTime: segTime[index]
          };
        })

        me.totalDuration = total;

        if (filesInfo.length > 0) me.filesInfo = filesInfo;
        if (originals.length > 0) me.sentVideos = originals.length;
        for (var i = 0; i < me.filesInfo.length; i++) {
          me.createVideoPlay(me.filesInfo[i])
        }

        var msg = "正常进行中";
        var type = 200;
        if (this.status == "404") {
          type = 404;
          msg = "地址404";
        }

        var info = {
          type: type,
          msg: msg
        };
        me.sendLog(info);
		/*
        var breakTime = me.options.breakTime;
        if (!me.setFirst && breakTime && breakTime < me.totalDuration) {
          me.setFirst = true;
          var current = me.options.breakTime;
          var percent = current / me.totalDuration;
          me.setVideoStartTime(percent);
          me.bindPlayPauseEvent();
        }
		*/

      };

      ajax.addEventListener('load', onLoadIndex);
      ajax.addEventListener('error', onErrorIndex);
      ajax.open('GET', this.manifest, true);
      ajax.send();


    },
    WIDTH: 0,

    setDrawVideoProperty: function() {
      var w = 0,
        h = 0,
        l = 0,
        t = 0,
        p = 0;
      var realWidth = this.realWidth;
      var realHeight = this.realHeight;
      var playWidth = this.playWidth;
      var playHeight = this.playHeight;
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
      this.willDrawVideoProperty = {
        w: w,
        h: h,
        l: l,
        t: t
      };
    },

    createVideoPlay: function(data) {
      if (!data) return;
      var me = this;
      var video = document.createElement('video'),
        source = document.createElement('source');
      source.type = 'video/mp4';
      video.appendChild(source);
      video.id = data.index;

      var onLoadStart = function() {
        if (!this.src) return;
        if (me.currentVideo && me.canvasLoading.stopped && me.currentVideo.id == this.id) {
          me.canvas.width = me.canvasLoading.width;
          me.canvas.height = me.canvasLoading.height;
          me.canvasLoading.play();
        }
        var retry = this.getAttribute("retry");
        if (!retry) this.setAttribute("retry", "0");
      };

      var onCanPlay = function() {
        if (me.segErrTimer) clearInterval(me.segErrTimer)
        this.setAttribute("retry", "0");

        if (!me.canvasLoading.stopped) me.canvasLoading.stop();

        this.setAttribute("ready", "1");

        if (me.currentVideo && this.id == me.currentVideo.id) this.play();
        if (this.id == me.nextIndex && !me.currentVideo) this.play();
        if (me.isTriggerSeek) {
          me.options.onSeekEndCallBack && me.options.onSeekEndCallBack();
          me.isTriggerSeek = false;
        }
      };

      var onLoadedMetaData = function() {
        if (me.canvas.width !== this.videoWidth || me.canvas.height !== this.videoHeight) {
          me.options.onLoadedMetaData && me.options.onLoadedMetaData(me.canvas)
        }
      };

      var onTimeUpdate = function() {
        var time, playTime = this.currentTime + data.segTime;
        if (me.seekTime !== 0 && me.seekTime > playTime && me.isTriggerSeek === false) {
          time = me.seekTime / data.total;
        } else {
          time = (this.currentTime + data.segTime) / data.total;
        }
        if (time > 1) time = 1
          //var percent = time * 100;
        var percent = (this.currentTime + data.segTime) / data.total * 100;
        var timeInfo = {
          currentTime: this.currentTime + data.segTime,
          totalTime: data.total,
          percent: percent
        }
        me.options.timeUpdateCallBack && me.options.timeUpdateCallBack(timeInfo)
      };

      var onPlay = function() {
		  if(me.nextIndex == 0){
			me.videos[0]["pause"]();
			if (me.options.playPauseCallBack){
				me.options.playPauseCallBack(me.videos[0].paused)
			}  
		  }

        if (me.segErrTimer) clearInterval(me.segErrTimer);
        if (me.currentVideo !== this) {
          //绑定播放暂停按钮事件
          if (!me.currentVideo) {
            me.bindPlayPauseEvent();
          }

          if (this.currentTime != 0) {
            this.currentTime = 0;
          }

          me.currentVideo = this;
          me.nextIndex++;
        }

        if (me.nextIndex in me.videos) {
          var isReay = me.videos[me.nextIndex].getAttribute("ready");
          if (isReay != "1") {
            me.videos[me.nextIndex].src = me.videos[me.nextIndex].getAttribute("url");
            me.videos[me.nextIndex].load();
          }
        }
        me.nextFrame();
      };

      var onEnded = function() {
        if (me.nextIndex >= me.sentVideos) {
          if (!me.options.isLoop) {
            me.nextIndex = 1;
            me.currentVideo = me.videos[0];
            me.progressBar.style.width = "100%";
            me.options.onEndedCallBack && me.options.onEndedCallBack()
            return;
          } else {
            me.nextIndex = 0;
          }
        }

        if (me.nextIndex in me.videos) {
          me.videos[me.nextIndex].play();
        }
      }

      var onVideoError = function() {

        var video = this;
        if (me.isTriggerSeek) me.isTriggerSeek = false;
        if (me.currentVideo && me.canvasLoading.stopped && me.currentVideo.id == this.id) {
          me.canvas.width = me.canvasLoading.width;
          me.canvas.height = me.canvasLoading.height;
          me.canvas.setAttribute("width", me.canvasLoading.width);
          me.canvas.setAttribute("height", me.canvasLoading.height);
          me.canvasLoading.play();
        }

        video.removeAttribute("ready");

        var retryCount = parseInt(video.getAttribute("retry"));
        if (retryCount < me.options.segErrorRetryNum) {
          if (me.segErrTimer) clearInterval(me.segErrTimer);
          me.segErrTimer = setTimeout(function() {
            video.load();
          }, 2000)
          retryCount = retryCount + 1;
          video.setAttribute("retry", retryCount);
        } else {
          if (me.segErrTimer) clearInterval(me.segErrTimer);
          me.sendLog({
            type: "loadingError",
            msg: "出现问题，中止加载"
          });
          video.setAttribute("retry", "0");
        }
      };

      var onVideoAbort = function() {
        var info = {
          type: "abort",
          msg: "视频中止加载此url:" + this.src
        };
        me.sendLog(info);
      };

      var onVideoVoiceChange = function() {
        var currentVideo = me.currentVideo;
        var v = me.getVolume();
        me.options.onVolumeChange && me.options.onVolumeChange(v);
      };

      video.addEventListener('loadstart', onLoadStart);
      video.addEventListener('loadedmetadata', onLoadedMetaData);
      video.addEventListener('play', onPlay);
      video.addEventListener('ended', onEnded);
      video.addEventListener('abort', onVideoAbort);
      video.addEventListener('error', onVideoError);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('stalled', onVideoError);
      //video.addEventListener('volumechange', onVideoVoiceChange);

      video.removeEvent = function() {
        video.removeEventListener('loadstart', onLoadStart);
        video.removeEventListener('loadedmetadata', onLoadedMetaData);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('abort', onVideoAbort);
        video.removeEventListener('error', onVideoError);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('stalled', onTimeUpdate);
      }

      video.setAttribute("url", data.url);

      (function canplaythrough() {
        me.videos[data.index] = this;
        if ((!me.currentVideo || me.currentVideo.ended) && data.index === me.nextIndex) {
          if (!me.isBindSeek) me.bindSeekEvent();
          this.src = this.getAttribute("url");
          this.load();
        }
      }).call(video);

      return;
    },

    destroy: function() {
	  this.heartBeatTimer && clearInterval(this.heartBeatTimer);
      if (this.canvasLoading) this.canvasLoading = null;
      for (var i = 0; i < this.videos.length; i++) {
        if (this.videos[i]) {
          this.videos[i].removeEvent();
          this.videos[i].pause();
        }
        this.videos[i] = null;
        delete this.videos[i];
      }
      this.videos = null;
      this.currentVideo = null;
      this.filesInfo = null;
      this.context = null;
      if (this.segErrTimer) clearInterval(this.segErrTimer);
      if (this.indexErrTimer) clearInterval(this.indexErrTimer);
      this.ajax.abort();
      this.ajax = null;
    },


    setVideoStartTime: function(seekPercent) {
      var me = this;
      me.seekTime = 0;
      var currentTime = me.totalDuration * seekPercent;
      var seekIndex = 0;

      if (me.currentVideo) me.currentVideo.pause();


      me.seekTime = currentTime;

      for (var i = 0; i < me.filesInfo.length; i++) {
        var minTime = me.filesInfo[i].segTime,
          maxTime;
        if (i === me.filesInfo.length - 1)
          maxTime = me.filesInfo[i].total;
        else
          maxTime = me.filesInfo[i + 1].segTime;

        if (currentTime > minTime && currentTime < maxTime) {
          seekIndex = i;
          break;
        }
      }

      me.seekIndex = seekIndex;

      if (me.filesInfo[seekIndex].index === me.nextIndex - 1) {
        me.currentVideo.currentTime = currentTime - me.filesInfo[seekIndex].segTime;
        if (me.currentVideo) me.currentVideo.play();
      } else {
        setTimeout(function() {
          me.options.onSeekStartCallBack && me.options.onSeekStartCallBack(seekPercent, currentTime, me.totalDuration)
        }, 100);
        if (me.filesInfo[seekIndex].index in me.videos) {
          me.currentVideo = me.videos[me.filesInfo[seekIndex].index];
          me.nextIndex = me.filesInfo[seekIndex].index + 1;
          var isReady = me.currentVideo.getAttribute("ready");
          if (!isReady) {
            me.currentVideo.src = me.currentVideo.getAttribute("url");
            me.currentVideo.load();
            me.currentVideo.currentTime = currentTime - me.filesInfo[seekIndex].segTime;
          } else {
            me.currentVideo.currentTime = currentTime - me.filesInfo[seekIndex].segTime;
            me.currentVideo.play();
            me.isTriggerSeek = false;
            me.options.onSeekEndCallBack && me.options.onSeekEndCallBack();
          }

        }
      }
    },

    bindSeekEvent: function() {
      var proCtnNode = this.progressCtn,
        me = this;
      if (!proCtnNode) return;
      proCtnNode.addEventListener("click", function(e) {
        e.stopPropagation()
        if (me.isTriggerSeek) return;
        me.isTriggerSeek = true;
        me.seekTime = 0;

        var target = e.target || e.srcElement;
        var offsetX = e.offsetX || (e.clientX - target.getBoundingClientRect().left),
          seekPercent = offsetX / me.progressCtn.offsetWidth,
          currentTime = me.totalDuration * seekPercent,
          seekIndex = 0;
        me.setVideoStartTime(seekPercent);
        return false;

        if (me.currentVideo) me.currentVideo.pause();


        me.seekTime = currentTime;

        for (var i = 0; i < me.filesInfo.length; i++) {
          var minTime = me.filesInfo[i].segTime,
            maxTime;
          if (i === me.filesInfo.length - 1)
            maxTime = me.filesInfo[i].total;
          else
            maxTime = me.filesInfo[i + 1].segTime;

          if (currentTime > minTime && currentTime < maxTime) {
            seekIndex = i;
            break;
          }
        }

        me.seekIndex = seekIndex;

        if (me.filesInfo[seekIndex].index === me.nextIndex - 1) {
          me.currentVideo.currentTime = currentTime - me.filesInfo[seekIndex].segTime;
          if (me.currentVideo) me.currentVideo.play();
        } else {
          setTimeout(function() {
            me.options.onSeekStartCallBack && me.options.onSeekStartCallBack(seekPercent, currentTime, me.totalDuration)
          }, 100);
          if (me.filesInfo[seekIndex].index in me.videos) {
            me.currentVideo = me.videos[me.filesInfo[seekIndex].index];
            me.nextIndex = me.filesInfo[seekIndex].index + 1;
            var isReady = me.currentVideo.getAttribute("ready");
            if (!isReady) {
              me.currentVideo.src = me.currentVideo.getAttribute("url");
              me.currentVideo.load();
              me.currentVideo.currentTime = currentTime - me.filesInfo[seekIndex].segTime;
            } else {
              me.currentVideo.currentTime = currentTime - me.filesInfo[seekIndex].segTime;
              me.currentVideo.play();
              me.isTriggerSeek = false;
              me.options.onSeekEndCallBack && me.options.onSeekEndCallBack();
            }

          }
        }
      }, false)
      this.isBindSeek = true;
    },

    nextFrame: function() {
      var willDrawVideoProperty = this.willDrawVideoProperty;
      if (!this.currentVideo || this.currentVideo.paused || this.currentVideo.ended) {
        return;
      }
      this.context.drawImage(this.currentVideo, willDrawVideoProperty.l, willDrawVideoProperty.t, willDrawVideoProperty.w, willDrawVideoProperty.h);
      requestAnimationFrame(this.proxy(this.nextFrame, this));
    },

    bindPlayPauseEvent: function() {
      var converter = this,
        button = this.playPauseButton;
      if (button) {
        button.addEventListener('click', function() {
          converter.setPause();
        });
      }

      var container = this.container;
      if (container) {
        container.addEventListener('click', function() {
          converter.setPause();
        });
      }

      var screenBtn = this.screenBtn;
      if (screenBtn) {
        screenBtn.addEventListener('click', function() {
			converter.setPause();
        });
      }
    },

	setPause:function(){
		var me=this;
        var breakTime = me.options.breakTime;
        if (!me.setFirst && breakTime && breakTime < me.totalDuration) {
          me.setFirst = true;
          var current = me.options.breakTime;
          var percent = current / me.totalDuration;
          me.setVideoStartTime(percent);
          //me.bindPlayPauseEvent();
        }

		if (me.currentVideo.paused){
			me.currentVideo["play"]();
		}
		else{
			me.currentVideo["pause"]();
		}
		if (me.options.playPauseCallBack){
			me.options.playPauseCallBack(me.currentVideo.paused)
		}
	},

    setMute: function(mute) {
      var videos = this.videos;
      for (var i = 0; i < videos.length; i++) {
        videos[i].muted = mute;
      }
    },

    getVolume: function() {
      var videos = this.videos;
      if (videos.length == 0) {
        return 1;
      }
      var initVolume = videos[0].volume;
      return initVolume;
    },

    setVolume: function(value) {
      var videos = this.videos;
      if (videos.length == 0) {
        return false;
      }
      var initVolume = videos[0].volume;

      var vol = value;
      var _val = initVolume;

      if (vol >= 0 && vol <= 1) {
        _val = vol.toFixed(2);
      } else {
        _val = (vol < 0) ? 0 : 1;
      }
      for (var i = 0; i < videos.length; i++) {
        videos[i].volume = _val;
      }
    },

    allKeys: function(obj) {
      var keys = [];
      for (var key in obj) keys.push(key);
      return keys;
    },

    createAssigner: function(keysFunc, undefinedOnly) {
      return function(obj) {
        var length = arguments.length;
        if (length < 2 || obj == null) return obj;
        for (var index = 1; index < length; index++) {
          var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
          for (var i = 0; i < l; i++) {
            var key = keys[i];
            if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
          }
        }
        return obj;
      };
    },

    proxy: function(fn, context) {
      var args, proxy;
      // Simulated bind
      args = Array.prototype.slice.call(arguments, 2);
      proxy = function() {
        return fn.apply(context || this, args.concat(Array.prototype.slice.call(arguments)));
      };
      return proxy;
    },

    isMobile: function() {
      var check = false;
      (function(a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
          check = true
      })(navigator.userAgent || navigator.vendor || window.opera);
      return check;
    },

    isSafari: function() {
      var ua = navigator.userAgent || navigator.vendor || window.opera
      return ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") == -1
    },

    getID: function(id) {
      return typeof id == "string" ? top.document.getElementById(id) : id;
    },

    startSendHeartBeat: function() {
      var vurl = this.manifest;
      var reg = /\/([^\/]+$)/g;
      var url = vurl.replace(reg, "/heartbeat");
      this.heartBeatTimer && clearInterval(this.heartBeatTimer);
      this.sendHeartBeat(url);
      var me = this;
      if (this.heartBeatTimer) {
        clearInterval(this.heartBeatTimer);
        me.heartBeatCount = 0;
      }
      this.heartBeatTimer = setInterval(function() {
        me.sendHeartBeat(url);
      }, 5000);
    },
    heartBeatCount: 0,
    sendHeartBeat: function(url) {
      var me = this;
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        if (this.status == "404") {
          me.heartBeatCount++;
          if (me.heartBeatCount > me.options.indexErrorRetryNum) {
            clearInterval(me.heartBeatTimer);
            var info = {
              type: "beatheart",
              msg: "尝试多次心跳无果，中止发送"
            };
            me.sendLog(info);
          }
        } else {
          me.heartBeatCount = 0;
        }
      }
      xhr.onerror = function() {
        clearInterval(me.heartBeatTimer);
      }
      xhr.open("GET", url, true);
      xhr.send();
    },

    sendLog: function(info) {
      if (this.playerId) {
        info._id = this.playerId;
      }
      this.options.sendLogCallBack && this.options.sendLogCallBack(info)
    }
  };


  // AMD / RequireJS
  if (typeof define !== 'undefined' && define.amd) {
    define([], function() {
      return PlayerBase;
    });
  }
  // CMD
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerBase;
  }
  // included directly via <script> tag
  else {
    root.PlayerBase = PlayerBase;
  }
}());
