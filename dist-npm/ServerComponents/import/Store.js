"use strict";
var fs = require('fs');
var path = require('path');
var Utils = require("../helpers/Utils");
var FileStore = (function () {
    function FileStore(opt) {
        this.resources = {};
        this.store = opt["storageFile"] || "importers.json";
        this.load();
    }
    /**
     * Load the file from disk.
     */
    FileStore.prototype.load = function () {
        this.resources = JSON.parse(fs.readFileSync(this.store, 'utf8'));
        /*
          fs.readFile(this.store, 'utf8', (err, res) => {
              if (err) {
                  console.log('No file store found: ' + this.store);
              }
              else {
  
                  this.resources = JSON.parse(res);
              }
          });*/
    };
    /**
     * Save the list of importers to disk.
     */
    FileStore.prototype.save = function () {
        fs.writeFile(this.store, JSON.stringify(this.resources, null, 2), { encoding: 'utf8' }, function (err) {
            if (err) {
                console.log(err);
                throw err;
            }
        });
    };
    /**
     * Get all importers as an array.
     */
    FileStore.prototype.getAll = function () {
        var resourceArray = [];
        for (var id in this.resources) {
            if (!this.resources.hasOwnProperty(id))
                continue;
            resourceArray.push(this.resources[id]);
        }
        return resourceArray;
    };
    /**
     * Get a single importer.
     */
    FileStore.prototype.get = function (id) {
        if (!this.resources.hasOwnProperty(id))
            return null;
        return this.resources[id];
    };
    /**
     * Create a new importer and store it.
     */
    FileStore.prototype.create = function (id, newObject) {
        if (typeof id === 'undefined' || !newObject.hasOwnProperty("id"))
            newObject.id = id = Utils.newGuid();
        else if (this.get(newObject.id) !== null)
            return;
        this.resources[id] = newObject;
        this.save();
    };
    /**
     * Delete an existing importer.
     */
    FileStore.prototype.delete = function (id) {
        if (!this.resources.hasOwnProperty(id))
            return null;
        this.resources[id] = null;
        delete this.resources[id];
        this.save();
    };
    /**
     * Update an existing importer.
     */
    FileStore.prototype.update = function (id, resource) {
        this.resources[id] = resource;
        this.save();
    };
    return FileStore;
}());
exports.FileStore = FileStore;
var FolderStore = (function () {
    function FolderStore(opt) {
        this.resources = {};
        this.folder = path.join(path.dirname(require.main.filename), opt["storageFolder"] || "public/data/resourceTypes");
        this.load();
    }
    /**
     * Load the file from disk.
     */
    FolderStore.prototype.load = function (callback) {
        var _this = this;
        fs.readdir(this.folder, function (err, res) {
            if (err) {
                console.log('No folder store found: ' + _this.folder);
            }
            else {
                res.forEach(function (resource) {
                    _this.resources[resource] = path.join(_this.folder, resource);
                });
            }
            if (callback)
                callback();
        });
    };
    FolderStore.prototype.save = function (id, resource) {
        var _this = this;
        var filename = path.join(this.folder, id);
        fs.writeFile(filename, JSON.stringify(resource, null, 2), function (err) {
            var b = _this.folder;
            if (err) {
                console.error(err);
            }
            else {
                _this.resources[id] = filename;
            }
        });
    };
    /**
     * Get all importers as an array.
     */
    FolderStore.prototype.getAll = function () {
        var resourceArray = [];
        for (var id in this.resources) {
            if (this.resources.hasOwnProperty(id))
                resourceArray.push(id);
        }
        return resourceArray;
    };
    /**
     * Get a single resource.
     */
    FolderStore.prototype.get = function (id) {
        if (!this.resources.hasOwnProperty(id)) {
            this.load();
        }
        if (!this.resources.hasOwnProperty(id)) {
            return null;
        }
        return this.resources[id];
    };
    /**
     * Get a single resource.
     */
    FolderStore.prototype.getAsync = function (id, res) {
        var _this = this;
        // If resource cannot be found, refresh the resourcelist and try again
        if (!this.resources.hasOwnProperty(id)) {
            this.load(function () {
                if (!_this.resources.hasOwnProperty(id)) {
                    res.status(404);
                    res.write("");
                    res.end();
                }
                else {
                    var filename = _this.resources[id];
                    res.sendFile(filename);
                }
            });
        }
        else {
            var filename = this.resources[id];
            res.sendFile(filename);
        }
    };
    /**
     * Create a new importer and store it.
     */
    FolderStore.prototype.create = function (id, resource) {
        this.save(id, resource);
    };
    /**
     * Delete an existing importer.
     */
    FolderStore.prototype.delete = function (id) {
        var _this = this;
        if (!this.resources.hasOwnProperty(id))
            return null;
        fs.unlink(this.resources[id], function (err) {
            if (err) {
                console.error(err);
            }
            else {
                _this.resources[id] = null;
                delete _this.resources[id];
            }
        });
    };
    /**
     * Update an existing resource.
     */
    FolderStore.prototype.update = function (id, resource) {
        this.save(id, resource);
    };
    return FolderStore;
}());
exports.FolderStore = FolderStore;
//# sourceMappingURL=Store.js.map