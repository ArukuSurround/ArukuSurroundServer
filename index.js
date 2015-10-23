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
            latitude:35.670892,
            longitude:139.760505
        };
    
    //ズーム
    this.map_zoom = 19;
    
    //検索範囲 km
    this.range = 1;
    
    //最後のロケーション
    this.lastLocation = null;
    
    //マップチップのサイズ
    this.mapChipSize = 41; //41
    
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
        
        // マーカー
        //現在位置を中心に地図を描画
        this.showMap(this.walkLogUuid, this.center_pos['latitude'], this.center_pos['longitude'], this.range);
        
        //TODO 現在の位置情報を取得する
        if(navigator.geolocation){
            //位置情報を追跡
            var options = {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 0
            };
            
            //event.coords.heading
            //navigator.geolocation.watchPosition($.proxy(this.watchPositionSuccessFunc,this),this.locationErrorFunc,options);
            
            navigator.geolocation.getCurrentPosition($.proxy(this.locationSuccessFunc,this),this.locationErrorFunc,options);
        }
        
        //n秒に一回 再描画
        var n = 2;
        setInterval($.proxy(this.reloadlocationFunc,this),n*1000);
    };
    
    //指定位置を中心に地図を描画
    this.reloadlocationFunc = function(){
        //console.log("reloadlocationFunc");
        if(this.lastLocation != null){
            this.showMap(this.walkLogUuid, this.lastLocation.latitude, this.lastLocation.longitude, this.range);
        }
    };
    
    //現在の位置情報を取得
    this.watchPositionSuccessFunc = function(position){
        console.log(position);
        //進行方向 角度を取得
        var heading = position.coords.heading;
        if(heading != null){
            //this.map_rotate( heading );
        }
    };
    
    //地図を回転させる
    this.map_rotate = function(heading){
        if(heading != null){
            $("#map_canvas").css({ WebkitTransform: 'rotate('+heading+'deg)' });
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
        
        var center = this.mapChipSize/2;
        var icon = new google.maps.MarkerImage( icon_path, new google.maps.Size(this.mapChipSize,this.mapChipSize), new google.maps.Point(0,0),new google.maps.Point(center,center));
        new google.maps.Marker({position: new google.maps.LatLng(latitude, longitude),map:this.google_map,icon:icon});
    };
    
    //MAP表示
    this.showMap = function(uuid,latitude,longitude,range){
        //MAPデータ読み出し
        var _this = this;
        
        
        var WalkLog = this.ncmb.DataStore("WalkLog");
        var origin = new this.ncmb.GeoPoint(latitude, longitude);
        
        WalkLog.equalTo("uuid", uuid)
                .withinKilometers("location", origin, range) //検索開始位置と距離をキロメートルで指定
                .order("createDate",true)
                .limit(50)
            　　 .fetchAll()
                .then(function(walkLogs){
                       console.log(walkLogs);
                      
                        //ここでMAPを描画する
                        if(walkLogs.length == 0) return;
                      
                        for(var i=0;i<walkLogs.length;i++){
                            var mapChipId = walkLogs[i].walkStatus;
							var location = walkLogs[i].location;
                            var latitude  = location.latitude;
                            var longitude = location.longitude;
                            //MAPチップを画面に追加する
                            _this.addMapChip(mapChipId,latitude,longitude);
                        }
                      
                        //最後のマップチップの位置を保存
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