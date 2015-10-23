jQuery.postJSON = function(url, data, callback) {
   jQuery.post(url, data, callback, "json");
};

var Page = function( config ){
	this.config = config;
	
    //Google Map
    this.google_map;
    
    //nifty mBaaS
    this.ncmb = new NCMB(this.config.NCMB_APPLICATION_KEY, this.config.NCMB_CLIENT_KEY);

    //初期中央位置
    this.center_pos = {
        //幕張メッセ
        //latitude:35.646982,
        //longitude:140.036668
        //上池袋
        latitude:35.736012,
        longitude:139.724684
        //池袋駅
        //latitude:35.731367,
        //longitude:139.712964
    };
    
    //ズーム
    this.map_zoom = 19;
    
    //検索範囲 km
    this.range = 1;
    
    //マップチップのサイズ
    this.mapChipSize = 41; //41
    
    //マーカー一覧
    this.markerArr = new google.maps.MVCArray();
    
	//初期化
	this.init = function(){
        //GoogleMapを表示
        this.google_map_init();
        
        $("#form_container").hide();
        
        //ボタンイベントを設定
        $("#btnSave").click($.proxy(this.clickBtnSave,this));
        $("#btnCancel").click($.proxy(this.clickBtnCancel,this));
 	};
    
    //Google map 描画
    this.google_map_init = function(){
        var mapOptions = {
            center: new google.maps.LatLng(this.center_pos['latitude'], this.center_pos['longitude']),
            zoom: this.map_zoom,
            mapTypeId: google.maps.MapTypeId.TERRAIN,
            panControl : false,
            scaleControl : true,
            disableDefaultUI : 'disable',
            backgroundColor: "#000"
        };
        this.google_map = new google.maps.Map(document.getElementById("map_canvas"),mapOptions);
        
        //クリックイベントを追加
        this.google_map.addListener('click', $.proxy(this.onMapClick,this));
        
        //既存のイベントデータを表示
        this.showMap(this.center_pos['latitude'],this.center_pos['longitude'],this.range);
    };
    
    //クリック時のイベント
    this.onMapClick = function(e){
        console.log(e);
        var lat = e.latLng.lat();
        var lng = e.latLng.lng();
        
        //表示位置にマップチップを追加
        //this.addMapChip(1,lat,lng);
        //マップの中央を移動
        this.google_map.panTo(e.latLng);
        
        //イベント設定 画面に座標を入力する
        $("#lat").val(lat);
        $("#lng").val(lng);
        $("#iconType").val(0);
        $("#eventType").val(0);
        $("#message").val("");
        
        //入力フォームを表示
        $("#form_container").show();
    };
    
    //イベント 情報の保存ボタン
    this.clickBtnSave = function(){
        var _this = this;
        
        //TODO: 確認後にDBに保存
        console.log("clickBtnSave");
        
        var lat = parseFloat($("#lat").val());
        var lng = parseFloat($("#lng").val());
        var iconType  = parseInt($("#iconType").val());
        var eventType = parseInt($("#eventType").val());
        var message   = $("#message").val();
        
        //入力確認
        if(iconType == 0){
            alert("アイコン種類を選択してください");
            return;
        }
        if(eventType == 0){
            alert("イベント種類を選択してください");
            return;
        }
        if(message.length == 0){
            alert("メッセージを入力してください");
            return;
        }
        

        //DBにMapEvent保存する
        var location = new this.ncmb.GeoPoint(lat, lng);
        console.log({location:location});
            
        var MapEvent = this.ncmb.DataStore("MapEvent");
        var mapEvent = new MapEvent();
        mapEvent.set("location", location)
                .set("iconType", iconType)
                .set("eventType", eventType)
                .set("message", message)
                .save()
                .then(function(obj){
                        //DB上のMapEventオブジェクトをリロードする
                        _this.showMap(lat,lng,_this.range);
                        $("#form_container").hide();
                    })
                .catch(function(err){
                        console.log(err);
                        alert(err);
                    });

    };
    
    //キャンセル
    this.clickBtnCancel = function(){
        console.log("clickBtnCancel");
        
        $("#form_container").hide();
    };
    
    //マーカーをクリックした時
    this.onMarkerClick = function( objectId ){
        //TODO: 詳細を取得して ダイアログ表示して 削除する べき
        var r = window.confirm("指定した座標のイベントを削除します。よろしいですか？");
        if(r){
            //イベント情報の削除
            this.deleteMapEvent(objectId);
        }
    };
    
    //イベント情報の削除
    this.deleteMapEvent = function(objectId){
        console.log( objectId );
        var _this = this;
        
        var MapEvent = this.ncmb.DataStore("MapEvent");
        MapEvent.equalTo("objectId", objectId)
        .fetchAll()
        .then(function(mapEvents){
              if(mapEvents.length == 0) return;
              var mapEvent = mapEvents[0];
              var lat = mapEvent.location.latitude;
              var lng = mapEvent.location.longitude;
              mapEvent.delete()
              .then(function(result){
                    //マップを更新
                    _this.showMap(lat,lng,_this.range);
                    $("#form_container").hide();
                    });
              
              
              })
        .catch(function(err){
               console.log(err);
               });
    };
    
    //マップチップを全て削除
    this.clearAllMapChip = function(){
        this.markerArr.forEach(function (marker, idx) { marker.setMap(null); });
        this.markerArr = new google.maps.MVCArray();
    };
    
    //マーカーで表示
    this.addMapChip = function(objectId,iconType,latitude,longitude){
    	var id = ("0"+iconType).slice(-2);
        var icon_path = this.config.MAP_CHIP_DIR_URL+"e"+id+".png";
        var size = this.mapChipSize;
        var center = size/2;
        var icon = new google.maps.MarkerImage( icon_path, new google.maps.Size(size,size), new google.maps.Point(0,0),new google.maps.Point(center,center));
        var marker = new google.maps.Marker({position: new google.maps.LatLng(latitude, longitude),map:this.google_map,icon:icon});
        
        var _this = this;
        var fuc = function(e){
            $.proxy(_this.onMarkerClick,_this)(objectId);
        };
        marker.addListener('click',fuc);
        
        //描画済みのイベントマーカーを一覧に保存
        this.markerArr.push( marker );
    };
    
    //MAP表示
    //マップチップサイズ 16x16 MAPサイズ 23x23マス
    this.showMap = function(latitude,longitude,range){
        //MAPデータ読み出し
        var _this = this;
        
        var MapEvent = this.ncmb.DataStore("MapEvent");
        var origin = new this.ncmb.GeoPoint(latitude, longitude);
        
        MapEvent.withinKilometers("location", origin, range) //検索開始位置と範囲をキロメートルで指定
                .limit(200)
                .order("createDate",true)
        　　　　　.fetchAll()
                .then(function(mapEvents){
                       console.log(mapEvents);
                        //マップチップを全て削除
                        _this.clearAllMapChip();
                        //ここでMAPを描画する
                        if(mapEvents.length == 0) return;
                      
                        for(var i=0;i<mapEvents.length;i++){
                            console.log( mapEvents[i] );
                            var objectId  = mapEvents[i].objectId;
                            var iconType  = mapEvents[i].iconType;
							var location  = mapEvents[i].location;
                            var latitude  = location.latitude;
                            var longitude = location.longitude;
                            //MAPチップを画面に追加する
                            _this.addMapChip(objectId,iconType,latitude,longitude);
                        }
                      })
                .catch(function(err){
                       console.log(err);
                      });
        
    };
};

var p = new Page(new Config());
$(function(){
	p.init();
});