/**
 * Created by kevin on 15-5-5.
 */
var fs = require('fs');
var path = require('path');
var async = require('async');

var sup = ['.mp3', '.ogg', '.wav'];

function toAbsolute() {
    dir = path.join.apply(null, arguments);
    if (path.isAbsolute(dir))return dir;
    return path.resolve(__dirname, '../' + dir);
}
DefaultMusicDir = toAbsolute('music');
DefaultSearchLimit = 20;

var config = {
    path: toAbsolute('data', 'config.json'),
    content: {},
    isChanged: 0
};

var scheme = {
    path: toAbsolute('data', 'scheme.json'),
    content: []
}

var fileManager = function () {
    try {
        config.content = JSON.parse(fs.readFileSync(config.path), 'utf-8');
    } catch (e) {
        config.isChanged = 1;
        if (e.errno = -2) {//data目录不存在
            fs.mkdir(toAbsolute('data'), function (err) {
                console.log(err);
            });
        } else {
            console.log(e, e.message);
        }
    }
}
fileManager.prototype.SaveChanges = function (recKey, plts, callback) {
    if (config.isChanged) {
        fs.writeFile(config.path,
            JSON.stringify(config.content),
            function (err) {
                callback(err);
            });
    }
    scheme.content = [];
    console.log(recKey);
    console.log(plts);
    for (var i = 0, j = 0; i < recKey.length; i++) {
        var tmpTs = recKey[i];
        while (j < plts.length && plts[j].timestamp != tmpTs)j++;
        if (j >= plts.length)break;
        scheme.content.push(plts[j]);
    }
    console.log(scheme.content);
    fs.writeFile(scheme.path,
        JSON.stringify(scheme.content),
        function (err) {
            callback(err);
        });
}

fileManager.prototype.setMusicDir = function (dir) {
    dir = toAbsolute(dir);
    if (this.getMusicDir() !== dir) {
        config.content.musicDir = dir;
        config.isChanged = 1;
        return true;
    }
    return false;
}

fileManager.prototype.getMusicDir = function () {
    return config.content.musicDir || DefaultMusicDir;
}

fileManager.prototype.getSearchLimit = function () {
    return config.content.searchLimit || DefaultSearchLimit;
}
fileManager.prototype.setSearchLimit = function (limit) {
    if (typeof limit === 'number' && limit >= 0) {
        config.content.searchLimit = limit;
        config.isChanged = 1;
    }
}

fileManager.prototype.getScheme = function () {
    return scheme.content;
}
fileManager.prototype.setUserData = function (data) {
    config.content.userData = data;
    config.isChanged = 1;
}
fileManager.prototype.getUserData = function () {
    return config.content.userData;
}

fileManager.prototype.loadMusicDir = function (callback) {
    var musicDir = this.getMusicDir();
    async.waterfall([
        function (callback) {
            fs.exists(musicDir, function (ok) {
                callback(null, ok);
            });
        },
        function (ok, callback) {
            if (ok)callback();
            else {
                fs.mkdir(musicDir, function (err) {
                    callback(err);
                });
            }
        },
        function (callback) {
            fs.readdir(musicDir, function (err, files) {
                err && callback(err);
                files = files.filter(function (f) {
                    var ext = path.extname(f);
                    for (var i = 0; i < sup.length; i++) {
                        if (ext == sup[i])return true;
                    }
                    return false;
                });
                var songList = [];
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var song = {
                        "title": file.split('.')[0],
                        "artist": "",
                        "album": "",
                        "src": path.join(musicDir, file)
                    };
                    songList.push(song);
                }
                callback(null, songList);
            });
        }
    ], function (err, result) {
        if (err) {
            console.log('get local file failed!', err);
        } else {
            scheme.content = JSON.parse(fs.readFileSync(scheme.path), 'utf-8');
            scheme.content.push({
                timestamp: 0,
                name: '本地音乐',
                data: result
            });
        }
        callback();
    });
}
var fm = new fileManager();//单实例
module.exports = fm;
