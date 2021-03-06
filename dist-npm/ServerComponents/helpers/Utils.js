"use strict";
var fs = require('fs'), path = require('path');
/** Create a new GUID */
function newGuid() {
    var guid = (this.S4() + this.S4() + "-" + this.S4() + "-4" + this.S4().substr(0, 3) + "-" + this.S4() + "-" + this.S4() + this.S4() + this.S4()).toLowerCase();
    return guid;
}
exports.newGuid = newGuid;
function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
exports.S4 = S4;
/** Get all the directories in a folder. */
function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function (file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
}
exports.getDirectories = getDirectories;
/** Get all the files in a folder. */
function getFiles(srcpath) {
    return fs.readdirSync(srcpath).filter(function (file) {
        return fs.statSync(path.join(srcpath, file)).isFile();
    });
}
exports.getFiles = getFiles;
/**
 * Get the IP4 address (assuming you have only one active network card).
 * See also: http://stackoverflow.com/a/15075395/319711
 */
function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }
    return '0.0.0.0';
}
exports.getIPAddress = getIPAddress;
//# sourceMappingURL=Utils.js.map