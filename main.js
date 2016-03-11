(function() {

    var isMobile = function() {
        var check = false;
        (function(a){
            if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))
                check = true
        })(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    }

    var isSafari = function(){
        var ua = navigator.userAgent||navigator.vendor||window.opera
        return ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") == -1
    }

    var player = null;

    var xmlhttp = new XMLHttpRequest();

    var formatMillisecond = function(millisecond){
        var millisecondStr = "";
        millisecond = parseInt(millisecond);
        var date = new Date();
        date.setTime(millisecond);
        if (millisecond === 0){
            millisecondStr = "00:00";
        } else if (millisecond < 1000 * 60 * 60){
            millisecondStr = date.format("mm:ss");
        } else if (millisecond >= 1000 * 60 * 60){
            var hour =  Math.floor(millisecond / 1000 / 60 / 60);
            hour = ("00" + hour.toString()).substring(hour.toString().length);
            millisecondStr = hour + ":" + date.format("mm:ss");
        }
        return millisecondStr;
    }

    Date.prototype.format = function(fmt) {
      var o = {
         "M+" : this.getMonth()+1,                 //月份
         "d+" : this.getDate(),                    //日
         "h+" : this.getHours(),                   //小时
         "m+" : this.getMinutes(),                 //分
         "s+" : this.getSeconds(),                 //秒
         "q+" : Math.floor((this.getMonth()+3)/3), //季度
         "S"  : this.getMilliseconds()             //毫秒
      };

      if(/(y+)/.test(fmt))
          fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
      for(var k in o)
          if(new RegExp("("+ k +")").test(fmt))
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
      return fmt;
    };
	var getDataObj={
		id:null,
		PPI:"320x240",
		malv:"200"
	};
    var sendRequest = function(id){
		var id=id || getDataObj.id;
		var PPI=getDataObj.PPI;
		var malv=getDataObj.malv;

		if(!malv){
			malv=PPI=="320x240"?"200": PPI=="480x320"?"300":"500";
		}

		if(!id){
			return false;
		}
        var stream_type = "";
        if (isMobile() || isSafari()){
            stream_type = "ts_type";
        } else {
            stream_type = "mp4_type";
        }
		console.log("分辨率:"+PPI+"码率:"+malv);
        var url         = "http://54.223.219.240/kss_master/request_streaming",
            customer_id = "5001_ef2bfa70d223d28889f73e2eddefec19",
            client_ip   = "10.237.114.129",
            stoid       = id,
			video_scale = PPI,
			video_rate  = malv+"k",
            queryStr    = "?customer_id=" + customer_id + "&client_ip=" + client_ip + "&stoid=" + stoid + "&stream_type=" + stream_type+"&video_scale="+video_scale+"&video_rate="+video_rate;
        url = url + queryStr;
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }



    xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
            console.log(xmlhttp.responseText)
            var resText = xmlhttp.responseText;
            if (typeof resText == 'string'){
                try{
                    resText = JSON.parse(resText)
                } catch(e){
                    alert("返回的JSON字符串有问题")
                }
            }
            if(resText&&resText.url){
                var videoUrl = resText.url;
                createPlayer(videoUrl);
            } else {
                alert("木有url")
            }
        }

    };



    var createPlayer = function(videoUrl){
        var option= {
            container      : "video-ctn",
            liveUrl        : videoUrl,
            isLoop         : false,
            isLive         : false,
            defaultResolution: "640x480",
			specifiedResolution : "600x600",
            playPauseButton: "play",
			bigStartPlayButton:"screenBtn",
            progressCtn    : "progress",
            progressBar    : "progress-bar",
			loadingContainerID:"loading",
			isDebug:true,
			//segErrorRetryNum:2,
            playPauseCallBack: function(isPaused){
                if (isPaused){
                    document.getElementById("play").innerHTML="播放";
					document.getElementById("screenBtn").style.display="block";
                } else {
                    document.getElementById("play").innerHTML="暂停";
					document.getElementById("screenBtn").style.display="none";
                }
            },
            timeUpdateCallBack: function(time){
                document.getElementById("progress-bar").style.width = time.percent+ "%";
                document.getElementById("time").innerHTML = formatMillisecond(time.currentTime * 1000) + "/" + formatMillisecond(time.totalTime * 1000);
            },
            onSeekStartCallBack: function(percent, time, total){
				document.getElementById("screenBtn").style.display="none";
                document.getElementById("progress-bar").style.width = percent * 100 + "%";
                document.getElementById("time").innerHTML = formatMillisecond(time * 1000) + "/" + formatMillisecond(total * 1000);
            },
			onSeekEndCallBack:function(){
				document.getElementById("play").innerHTML="暂停";
				document.getElementById("screenBtn").style.display="none";
			},
			onVolumeChange:function(v){
				document.getElementById("currentVoice").innerHTML="当前声音值："+v;
			},
			throwErrorInfoCallBack:function(data){
				document.getElementById("log").innerHTML=JSON.stringify(data);
				console.log(JSON.stringify(data));
			},
			onEndedCallBack:function(){
				document.getElementById("play").innerHTML="再次播放";
				document.getElementById("screenBtn").style.display="block";
			}
        }

        player = new PlayerBase(option);

		document.getElementById("voiceAdd").onclick=function(){
			var voice=player.getVolume();//获取当前声音，然后在此基础上加10%
			voice+=0.1;
			player.setVolume(voice);
			document.getElementById("currentVoice").innerHTML="当前声音值："+player.getVolume();
		}
		document.getElementById("voiceM").onclick=function(){
			var voice=player.getVolume();//获取当前声音，然后在此基础上减10%
			voice-=0.1;
			player.setVolume(voice);
			document.getElementById("currentVoice").innerHTML="当前声音值："+player.getVolume();
		}
		document.getElementById("voiceMute").onclick=function(){
			//设置静音
			if(this.extend){
				player.setMute(false);
				this.innerHTML="静音";
			}
			else{
				player.setMute(true);
				this.innerHTML="非静音";
			}
			this.extend =!this.extend;

		}

        if (player.isMobile() || player.isSafari()) $("#video-control").hide();
    };

	//var url="http://54.223.219.240:62000/hls_test/test.m3u8";
//	var url="https://mivideo-player-hz.ksyun.com/downdata/10.4.23.112/15b87ea6908e4776bdc90ea50d20f7b4bd5726b476210553541b77ef75b69a20/index.m3u8";
	//var url="https://mivideo-player-ｙz.ksyun.com/downdata/10.12.23.141/15b87ea6908e4776bdc90ea50d20f7b4bd5726b476210553541b77ef75b69a20/index.m3u8";
	//var url="https://mivideo-player-hz.ksyun.com/downdata/10.4.23.112/15b87ea6908e4776bdc90ea50d20f7b4bd5726b476210553541b77ef75b69a20/index.m3u8";
	//var url="http://183.131.21.230:9000/test/test_m3u8/index.m3u8";
	var url="http://183.131.21.230:9000/test/test_m3u8_2/index.m3u8";
	var url="http://183.131.21.230:8080/test/test_m3u8_2/index.m3u8";
	var url="http://183.131.21.230/downdata/15b87ea6908e4776bdc90ea50d20f7b4bd5726b476210553541b77ef75b69a20/index.m3u8";
	var url="https://mivideo-player-hz.ksyun.com/downdata/10.4.23.112/815dbb58658be98951eac4640f8f434e14d86ed366bb589bb499c7fb9c7542ab/index.m3u8?keyid=1445938231337&nonce=275402&expires=1457770343&signature=9Zr6NUyyHLfvNK5JHc4fCyOJY68";
	createPlayer(url);

})();
