jQuery.postJSON = function(url, data, callback) {
   jQuery.post(url, data, callback, "json");
};

var Page = function( config ){
	this.config = config;
	
    //Google Map
    this.google_map;
    
    //nifty mBaaS
    this.ncmb = new NCMB(this.config.NCMB_APPLICATION_KEY, this.config.NCMB_CLIENT_KEY);
    console.log( this.ncmb );
    
    //表示対象のログのUUID
    //TODO: どうにかしてアプリから受け取る
    this.walkLogUuid = location.hash.replace('#','');
    
    //初期中央位置
    
    this.center_pos = {
        //幕張メッセ
        latitude:35.646982,
        longitude:140.036668
        //上池袋
        //latitude:35.736012,
        //longitude:139.724684
        //池袋駅
        //latitude:35.731367,
        //longitude:139.712964
    };
    
    //ズーム
    this.map_zoom = 19;
    
    //検索範囲 km
    this.range = 1;
    
    //最後のロケーション
    this.lastLocation = null;
    
    //ドラッグしたら:true
    this.isDrag = false;
    this.isDragTimer = null;
    
    //リロードタイマー
    this.reloadTimer = null;
    
    //歩きアニメーション
    this.charStepAnime = false;
    
	//初期化
	this.init = function(){
        //GoogleMapを表示
        this.google_map_init();
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
        //ドラッグイベントを設定
        google.maps.event.addListener(this.google_map, "drag", $.proxy(this.onMapDrag,this));
        
        // マーカー
        //現在位置を中心に地図を描画
        this.showMap(this.walkLogUuid, this.center_pos['latitude'], this.center_pos['longitude'], this.range);
        
        //地図を再描画
        this.setReloadTimer();
    };
    
    //地図を再描画
    this.setReloadTimer = function(){
        //n秒に一回 再描画
        var n = 5;
        this.reloadTimer = setInterval($.proxy(this.reloadlocationFunc,this),n*1000);
    };
    
    //ドラッグされた時
    this.onMapDrag = function(){
        //console.log("onMapDrag");
        var _this = this;
        
        //表示中央位置のデータを取得する
        var lng = this.google_map.getCenter().lng();
        var lat = this.google_map.getCenter().lat();
        
        if(this.reloadTimer != null){
            clearTimeout( this.reloadTimer );
            this.reloadTimer = null;
        }
        if( this.isDragTimer != null){
            clearTimeout( this.isDragTimer );
            this.isDragTimer = null;
        }
        //ドラッグしたので true に設定
        this.isDrag = true;
        
        //ドラッグしたのでフラグを為のタイマーを設定する 10秒
        var n = 3;
        var fnc = function(){
            var nowLng = _this.google_map.getCenter().lng();
            var nowLat = _this.google_map.getCenter().lat();
            //console.log("nowLng:"+nowLng+" this.lng:"+this.lng);
            //console.log("nowLat:"+nowLat+" this.lat:"+this.lat);
            if( (nowLng == this.lng) && (nowLat == this.lat) ){
                //一定時間同じ場所にあったらドラッグ常態を解除
                _this.isDrag = false;
                _this.isDragTimer = null;
                
                //地図を再描画するタイマーを起動
                $.proxy(_this.setReloadTimer,_this)();
            }
        };
        fnc.lng = lng;
        fnc.lat = lat;
        this.isDragTimer = setTimeout($.proxy(fnc,fnc),n*1000);
        
        this.showMap(this.walkLogUuid, lat, lng, this.range);
    };
    
    //指定位置を中心に地図を描画
    this.reloadlocationFunc = function(){
        //console.log("reloadlocationFunc");
        if(this.lastLocation != null){
            this.showMap(this.walkLogUuid, this.lastLocation.latitude, this.lastLocation.longitude, this.range);
        }
    };
    
    //現在位置の取得に成功
    this.locationSuccessFunc = function(position){
    	console.log(position);
    	var lat = position.coords.latitude;
    	var long = position.coords.longitude;
    	
    	//Google Map位置を変更
    	var myLatlng = new google.maps.LatLng( lat, long);
    	this.google_map.panTo(myLatlng);
    	
        //現在位置を中心に地図を描画
        this.showMap(this.walkLogUuid, lat, long, this.range);
    };
    
    this.locationErrorFunc = function(error){
    	console.log(error);
    };
    
    //マーカーで表示
    this.addMapChip = function(mapChipId,latitude,longitude){
    	var id = ("0"+mapChipId).slice(-2);
        var icon_path = this.config.MAP_CHIP_DIR_URL+id+".png";
        var icon = new google.maps.MarkerImage( icon_path, new google.maps.Size(42,42), new google.maps.Point(0,0),new google.maps.Point(21,21));
        new google.maps.Marker({position: new google.maps.LatLng(latitude, longitude),map:this.google_map,icon:icon});
    };
    
    //MAP表示
    //マップチップサイズ 16x16
    //MAPサイズ 23x23マス
    this.showMap = function(uuid,latitude,longitude,range){
        //MAPデータ読み出し
        var _this = this;
        
        if(_this.isDrag == true){
            //ドラッグ中は描画しない
            return;
        }
        
        var walkLog = this.ncmb.DataStore("WalkLog");
        var origin = new this.ncmb.GeoPoint(latitude, longitude);
        console.log(origin);
        
        walkLog.withinKilometers("location", origin, range) //検索開始位置と範囲をキロメートルで指定
                .limit(200)
                .order("createDate",true)
        　　　　　.fetchAll()
                .then(function(walkLogs){
                       console.log(walkLogs);
                      
                        //ここでMAPを描画する
                        if(walkLogs.length == 0) return;
                      
                        for(var i=0;i<walkLogs.length;i++){
                            var mapChipId = walkLogs[i].walkStatus;
							var location  = walkLogs[i].location;
                            var latitude  = location.latitude;
                            var longitude = location.longitude;
                            //MAPチップを画面に追加する
                            _this.addMapChip(mapChipId,latitude,longitude);
                        }
                      
                        //console.log("isDrag:"+_this.isDrag);
                        _this.lastLocation = walkLogs[0].location;
                      
                        //最後のマップチップの位置に変更
                        var myLatlng = new google.maps.LatLng( _this.lastLocation.latitude, _this.lastLocation.longitude);
                        _this.google_map.panTo(myLatlng);
                      
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