#播放器API
###sdk简介
目前demon不添加样式，可以自定义样式

###快速入门
	<script type="text/javascript" src="player.js"></script>

###
	<script type="text/javascript">
		 var createPlayer = function(videoUrl){
	        var option= {
	            container      : "video-ctn",
	            liveUrl        : videoUrl,
	            isLoop         : false,
	            isLive         : false,
	            defaultResolution: "640x480",
	            playPauseButton: "play",
	            progressCtn    : "progress",
	            progressBar    : "progress-bar",
	            playPauseCallBack: function(isPaused){
	                if (isPaused){
	                    document.getElementById("play").innerHTML="播放";
	                } else {
	                    document.getElementById("play").innerHTML="暂停";
	                }
	            },
	            timeUpdateCallBack: function(time){
	                document.getElementById("progress-bar").style.width = time.percent+ "%";
	                document.getElementById("time").innerHTML = formatMillisecond(time.currentTime * 1000) + "/" + formatMillisecond(time.totalTime * 1000);
	            },
	            onSeekStartCallBack: function(percent, time, total){
					
	                document.getElementById("progress-bar").style.width = percent * 100 + "%";
	                document.getElementById("time").innerHTML = formatMillisecond(time * 1000) + "/" + formatMillisecond(total * 1000);
	            },
				onSeekEndCallBack:function(){
					document.getElementById("play").innerHTML="暂停";
				}
	        }
	        player = new PlayerBase(option);
	        if (player.isMobile() || player.isSafari()) $("#video-control").hide();
	    };
	
		var url="http://54.223.219.240:62000/hls_test/test.m3u8";
		createPlayer(url);
	</script>

###SDK 详细介绍

- `createplayer(url);` url为传入的播放源,默认只用传入一个url,其它默认设置如下,可以自行修改并传入

- `container` 播放器容器id

- `liveUrl` 直播流URL

- `url` 视频url

- `isLoop` 是否循环播放, 直播时无效

- `isLive` 是否是直播

- `defaultResolution` 默认分辨率


- `playPauseButton` 播放、暂停的切换按钮

- `progressCtn` 进度容器id,可以用css控制外边的边框，以及背景等样式

- `progressBar` 进度条的id

- `playPauseCallBack` 播放（暂停）回调函数，返回是否暂停,回调参数为bool类型，true为当前已暂停，false为当前正在播放

- `timeUpdateCallBack` 正在播放过程中的回调,参数为object,

	{
		percent:xxx,
		currentTime:xxx,
		totalTime:xxx
	}

	播放进度回调函数，返回总时间、当前播放时间、播放进度百分比,

- `onLoadedMetaData` 当视频载入元数据时的回调函数

- `onEndedCallBack` 播放结束时的回调函数，循环播放时无效

- `onSeekStartCallBack` Seek开始回调函数

- `onSeekEndCallBack` Seek结束回调函数

- `indexErrorRetryNum` 索引请求错误重试次数

- `segErrorRetryNum` 分片请求错误重试次数
- `sendLogCallBack`  当有错误时，获取到返回的信息
- `breakTime`  从第几秒开始播放int类型
- `screenBtn`  全屏点击的按钮ID

###声音控制
	//示例
	var option={.....}
    var player = new PlayerBase(option);
	player.setVolume(n);
	player.getVolume();
	player.setMute(bool);

- `setVolume(n)` 设置声音,n为0-1之间的数值
- `getVolume()` 获取当前声音值
- `setMute(bool)` 设置静音,bool:false为开启声音,true为静音

###返回状态(新添) 
-	type:状态，必会返回
-	msg:对状态的解释,必返回
- `loaderror` 请求数据时发生错误
- `slow` 网速慢
- `dataUnuseful` 浏览器尝试获取媒体数据，但数据不可用
- `404` 地址不可用
- `retry` 加载失败，重新尝试加载
- `loadingError` 多次尝试后无果，中止加载
- `abort` 视频内部中止加载
- `beatheart` 停止心跳(此状态不能作为视频播放完毕的判断条件)