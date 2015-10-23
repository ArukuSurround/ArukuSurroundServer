jQuery.postJSON = function(url, data, callback) {
   jQuery.post(url, data, callback, "json");
};

jQuery.uuidgen = (function(){
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }   
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
});

var Config = function(){
    
    //MAPチップ保存先
    this.MAP_CHIP_DIR_URL = "https://dl.dropboxusercontent.com/u/6674841/aruku_surround/image/";
    
    //nifty mBaaS アプリケーションキー
    this.NCMB_APPLICATION_KEY = "e12816d85731c50af473e5580380ac195aebd070ad8e1c330979f1b7d152db68";
    
    //nifty mBaaS クライアントキー
    this.NCMB_CLIENT_KEY = "e5f532f3bd87db183da303248e9ddcf652f847b19f2fcb837acaa5082a9b825d";
    
    //nifty mBaaS オブジェクト検索
    this.NCMB_API_OBJECT_SEARCH_URL = "https://mb.api.cloud.nifty.com/2013-09-01/classes";
};

//nifty mBaaS シグネチャ生成
NCMB._createSignature = function(route, className, objectId, url, method, timestamp){
    var signature = "";
    var _applicationKey = NCMB.applicationKey;
    var _timestamp = timestamp;
    var _clientKey = NCMB.clientKey;
    
    var _method = method;
    var _url = encodeURI(url);
    var _tmp = _url.substring(_url.lastIndexOf("//") + 2);
    var _fqdn = _tmp.substring(0, _tmp.indexOf("/"));
    
    var _position = _url.indexOf("?");
    var _path = "";
    var _data = {};
    
    if(_position == -1) {
        _path =  _url.substring(_url.lastIndexOf(_fqdn) + _fqdn.length );
    }
    else{
        var _get_parameter= _url.substring(_position + 1);
        _path = _url.substring(_url.lastIndexOf(_fqdn) + _fqdn.length, _position);
        _tmp = _get_parameter.split("&");
        for (var i = 0; i < _tmp.length; i++) {
            _position = _tmp[i].indexOf("=");
            _data[_tmp[i].substring(0 , _position)] = _tmp[i].substring(_position + 1);
        }
    }
    _data["SignatureMethod"] = "HmacSHA256";
    _data["SignatureVersion"] = "2";
    _data["X-NCMB-Application-Key"] = _applicationKey;
    _data["X-NCMB-Timestamp"] = _timestamp;
    
    var _sorted_data = {};
    var keys = [];
    var k, i, len;
    for (k in _data)
    {
        if (_data.hasOwnProperty(k))
        {
            keys.push(k);
        }
    }
    keys.sort();
    len = keys.length;
    for (i = 0; i < len; i++)
    {
        k = keys[i];
        _sorted_data[k] = _data[k];
    }
    var parameterString = "";
    for (k in _sorted_data)
    {
        if (_sorted_data.hasOwnProperty(k))
        {
            if (parameterString != "") {
                parameterString += "&";
            };
            parameterString = parameterString + k + "=" + _sorted_data[k];
        }
    }
    var forEncodeString = _method + "\n" + _fqdn + "\n" + _path + "\n" + parameterString;
    var hash = CryptoJS.HmacSHA256(forEncodeString, _clientKey);
    var signature = CryptoJS.enc.Base64.stringify(hash);
    return signature;
}
