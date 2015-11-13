var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Winston = require('winston');
var helpers = require('../helpers/Utils');
var fs = require('fs');
var path = require('path');
var events = require("events");
var _ = require('underscore');
var async = require('async');
var StringExt = require('../helpers/StringExt');
(function (ApiResult) {
    ApiResult[ApiResult["OK"] = 200] = "OK";
    ApiResult[ApiResult["Error"] = 400] = "Error";
    ApiResult[ApiResult["LayerAlreadyExists"] = 406] = "LayerAlreadyExists";
    ApiResult[ApiResult["LayerNotFound"] = 407] = "LayerNotFound";
    ApiResult[ApiResult["FeatureNotFound"] = 408] = "FeatureNotFound";
    ApiResult[ApiResult["ProjectAlreadyExists"] = 409] = "ProjectAlreadyExists";
    ApiResult[ApiResult["ProjectNotFound"] = 410] = "ProjectNotFound";
    ApiResult[ApiResult["KeyNotFound"] = 411] = "KeyNotFound";
    ApiResult[ApiResult["GroupNotFound"] = 412] = "GroupNotFound";
    ApiResult[ApiResult["GroupAlreadyExists"] = 413] = "GroupAlreadyExists";
    ApiResult[ApiResult["ResourceNotFound"] = 428] = "ResourceNotFound";
    ApiResult[ApiResult["ResourceAlreadyExists"] = 429] = "ResourceAlreadyExists";
    ApiResult[ApiResult["SearchNotImplemented"] = 440] = "SearchNotImplemented";
})(exports.ApiResult || (exports.ApiResult = {}));
var ApiResult = exports.ApiResult;
var CallbackResult = (function () {
    function CallbackResult() {
    }
    return CallbackResult;
})();
exports.CallbackResult = CallbackResult;
(function (Event) {
    Event[Event["KeyChanged"] = 0] = "KeyChanged";
    Event[Event["PropertyChanged"] = 1] = "PropertyChanged";
    Event[Event["FeatureChanged"] = 2] = "FeatureChanged";
    Event[Event["LayerChanged"] = 3] = "LayerChanged";
    Event[Event["ProjectChanged"] = 4] = "ProjectChanged";
})(exports.Event || (exports.Event = {}));
var Event = exports.Event;
(function (ChangeType) {
    ChangeType[ChangeType["Create"] = 0] = "Create";
    ChangeType[ChangeType["Update"] = 1] = "Update";
    ChangeType[ChangeType["Delete"] = 2] = "Delete";
})(exports.ChangeType || (exports.ChangeType = {}));
var ChangeType = exports.ChangeType;
var Key = (function () {
    function Key() {
    }
    return Key;
})();
exports.Key = Key;
var Project = (function () {
    function Project() {
    }
    return Project;
})();
exports.Project = Project;
var Group = (function () {
    function Group() {
    }
    return Group;
})();
exports.Group = Group;
var KeySubscription = (function () {
    function KeySubscription() {
    }
    return KeySubscription;
})();
exports.KeySubscription = KeySubscription;
var Layer = (function () {
    function Layer() {
        this.features = [];
    }
    return Layer;
})();
exports.Layer = Layer;
var ProjectId = (function () {
    function ProjectId() {
    }
    return ProjectId;
})();
exports.ProjectId = ProjectId;
var Geometry = (function () {
    function Geometry() {
    }
    return Geometry;
})();
exports.Geometry = Geometry;
var Feature = (function () {
    function Feature() {
        this.type = 'Feature';
    }
    return Feature;
})();
exports.Feature = Feature;
var Property = (function () {
    function Property() {
    }
    return Property;
})();
exports.Property = Property;
var Log = (function () {
    function Log() {
    }
    return Log;
})();
exports.Log = Log;
var FeatureType = (function () {
    function FeatureType() {
    }
    return FeatureType;
})();
exports.FeatureType = FeatureType;
var PropertyType = (function () {
    function PropertyType() {
    }
    return PropertyType;
})();
exports.PropertyType = PropertyType;
var ResourceFile = (function () {
    function ResourceFile() {
    }
    return ResourceFile;
})();
exports.ResourceFile = ResourceFile;
var ApiManager = (function (_super) {
    __extends(ApiManager, _super);
    function ApiManager(namespace, name, isClient, options) {
        var _this = this;
        if (isClient === void 0) { isClient = false; }
        if (options === void 0) { options = {}; }
        _super.call(this);
        this.isClient = isClient;
        this.options = options;
        this.connectors = {};
        this.resources = {};
        this.layers = {};
        this.projects = {};
        this.keys = {};
        this.keySubscriptions = {};
        this.defaultStorage = "file";
        this.defaultLogging = false;
        this.rootPath = "";
        this.projectsFile = "";
        this.layersFile = "";
        this.namespace = "cs";
        this.name = "cs";
        this.saveProjectDelay = _.debounce(function (project) {
            _this.saveProjectConfig();
        }, 1000);
        this.saveLayersDelay = _.debounce(function (layer) {
            _this.saveLayerConfig();
        }, 1000);
        this.namespace = namespace;
        this.name = name;
        if (this.options.server) {
            if (this.options.server.indexOf('http') < 0)
                this.options.server = 'http://' + this.options.server;
            if (this.options.server.slice(-1) === '/')
                this.options.server = this.options.server.slice(0, -1);
        }
    }
    ApiManager.prototype.init = function (rootPath, callback) {
        var _this = this;
        Winston.info("Init layer manager (isClient=${this.isClient})", { cat: "api" });
        this.rootPath = rootPath;
        if (!fs.existsSync(rootPath))
            fs.mkdirSync(rootPath);
        this.initResources(path.join(this.rootPath, '/resourceTypes/'));
        this.loadLayerConfig(function () {
            _this.loadProjectConfig(function () {
                callback();
            });
        });
    };
    ApiManager.prototype.loadLayerConfig = function (cb) {
        var _this = this;
        Winston.info('manager: loading layer config');
        this.layersFile = path.join(this.rootPath, 'layers.json');
        fs.readFile(this.layersFile, "utf8", function (err, data) {
            if (!err && data) {
                Winston.info('manager: layer config loaded');
                _this.layers = JSON.parse(data);
            }
            else {
                _this.layers = {};
            }
            cb();
        });
    };
    ApiManager.prototype.loadProjectConfig = function (cb) {
        var _this = this;
        Winston.info('manager: loading project config');
        this.projectsFile = path.join(this.rootPath, 'projects.json');
        fs.readFile(this.projectsFile, "utf8", function (err, data) {
            if (err) {
                Winston.error('manager: project config loading failed: ' + err.message);
            }
            else {
                Winston.info('manager: project config loaded');
                _this.projects = JSON.parse(data);
            }
            cb();
        });
    };
    ApiManager.prototype.saveProjectConfig = function () {
        fs.writeFile(this.projectsFile, JSON.stringify(this.projects), function (error) {
            if (error) {
                Winston.info('manager: error saving project config: ' + error.message);
            }
            else {
                Winston.info('manager: project config saved');
            }
        });
    };
    ApiManager.prototype.saveLayerConfig = function () {
        var temp = {};
        for (var s in this.layers) {
            if (!this.layers[s].storage)
                temp[s] = this.layers[s];
        }
        if (!temp)
            return;
        fs.writeFile(this.layersFile, JSON.stringify(temp), function (error) {
            if (error) {
                Winston.info('manager: error saving layer config');
            }
            else {
                Winston.info('manager: layer config saved');
            }
        });
    };
    ApiManager.prototype.initResources = function (resourcesPath) {
        var _this = this;
        if (!fs.existsSync(resourcesPath)) {
            fs.mkdirSync(resourcesPath);
        }
        fs.readdir(resourcesPath, function (e, f) {
            f.forEach(function (file) {
                var loc = path.join(resourcesPath, file);
                fs.readFile(loc, "utf8", function (err, data) {
                    if (!err) {
                        console.log('Opening ' + loc);
                        _this.resources[file.replace('.json', '').toLowerCase()] = JSON.parse(data.removeBOM());
                    }
                    else {
                        console.log('Error opening ' + loc + ': ' + err);
                    }
                    ;
                });
            });
        });
    };
    ApiManager.prototype.addFile = function (base64, folder, file, meta, callback) {
        var s = this.connectors.hasOwnProperty('file') ? this.connectors['file'] : null;
        if (s) {
            s.addFile(base64, folder, file, meta, function () { });
            callback({ result: ApiResult.OK, error: "Resource added" });
        }
        else {
            callback({ result: ApiResult.Error, error: "Failed to add resource." });
        }
    };
    ApiManager.prototype.addResource = function (resource, meta, callback) {
        this.resources[resource.id] = resource;
        var s = this.findStorage(resource);
        this.getInterfaces(meta).forEach(function (i) {
            i.addResource(resource, meta, function () { });
        });
        if (s) {
            s.addResource(resource, meta, function (r) {
                callback({ result: ApiResult.OK, error: "Resource added" });
            });
        }
        else {
            callback({ result: ApiResult.OK });
        }
    };
    ApiManager.prototype.getResource = function (id) {
        if (this.resources.hasOwnProperty(id)) {
            return this.resources[id];
        }
        return null;
    };
    ApiManager.prototype.addLayerToProject = function (projectId, groupId, layerId, meta, callback) {
        var p = this.findProject(projectId);
        var l = this.findLayer(layerId);
        if (!p) {
            callback({ result: ApiResult.ProjectNotFound, error: "Project not found" });
            return;
        }
        if (!l) {
            callback({ result: ApiResult.LayerNotFound, error: "Layer not found" });
            return;
        }
        if (!p.groups)
            p.groups = [];
        var g;
        p.groups.forEach(function (pg) {
            if (pg.id === groupId) {
                g = pg;
            }
        });
        if (!g) {
            callback({ result: ApiResult.GroupNotFound, error: "Group not found" });
            return;
        }
        if (g.layers.some(function (pl) { return (pl.id === l.id); })) {
            Winston.info("Layer already exists. Removing existing layer before adding new one...");
            g.layers = g.layers.filter(function (gl) { return (gl.id !== l.id); });
        }
        g.layers.push(l);
        this.updateProject(p, meta, function () {
            Winston.info('api: add layer ' + l.id + ' to group ' + g.id + ' of project ' + p.id);
            callback({ result: ApiResult.OK });
        });
    };
    ApiManager.prototype.removeLayerFromProject = function (projectId, groupId, layerId, meta, callback) {
        var p = this.findProject(projectId);
        if (!p) {
            callback({ result: ApiResult.ProjectNotFound, error: "Project not found" });
            return;
        }
        if (!p.groups || !p.groups.some(function (pg) { return (pg.id === groupId); })) {
            callback({ result: ApiResult.GroupNotFound, error: "Group not found" });
            return;
        }
        else {
            var group = p.groups.filter(function (pg) { return (pg.id === groupId); })[0];
            if (group.layers.some(function (pl) { return (pl.id === layerId); })) {
                group.layers = group.layers.filter(function (pl) { return (pl.id !== layerId); });
                this.updateProject(p, meta, function () { });
                Winston.info('api: removed layer ' + layerId + ' from project ' + p.id);
                callback({ result: ApiResult.OK });
            }
            else {
                callback({ result: ApiResult.LayerNotFound, error: "Layer not found" });
                return;
            }
        }
    };
    ApiManager.prototype.allGroups = function (projectId, meta, callback) {
        var p = this.findProject(projectId);
        if (!p) {
            callback({ result: ApiResult.ProjectNotFound, error: "Project not found" });
            return;
        }
        if (!p.groups)
            p.groups = [];
        var groupList = [];
        p.groups.forEach(function (pg) {
            if (pg.id)
                groupList.push(pg.id);
        });
        callback({ result: ApiResult.OK, groups: groupList });
    };
    ApiManager.prototype.addGroup = function (group, projectId, meta, callback) {
        var p = this.findProject(projectId);
        if (!p) {
            callback({ result: ApiResult.ProjectNotFound, error: "Project not found" });
            return;
        }
        if (!p.groups)
            p.groups = [];
        if (!group.id)
            group.id = helpers.newGuid();
        if (p.groups.some(function (pg) { return (group.id === pg.id); })) {
            p.groups.some(function (pg) {
                if (group.id === pg.id && group.clusterLevel) {
                    pg['clusterLevel'] = group.clusterLevel;
                }
                return (group.id === pg.id);
            });
            callback({ result: ApiResult.GroupAlreadyExists, error: "Group exists" });
            return;
        }
        else {
            group = this.getGroupDefinition(group);
            p.groups.push(group);
            this.updateProject(p, meta, function () { });
            callback({ result: ApiResult.OK });
        }
    };
    ApiManager.prototype.removeGroup = function (groupId, projectId, meta, callback) {
        var _this = this;
        var p = this.findProject(projectId);
        if (!p) {
            callback({ result: ApiResult.ProjectNotFound, error: "Project not found" });
            return;
        }
        if (!p.groups)
            p.groups = [];
        if (!p.groups.some(function (pg) { return (groupId === pg.id); })) {
            callback({ result: ApiResult.GroupNotFound, error: "Group not found" });
            return;
        }
        else {
            var group = p.groups.filter(function (pg) { return (groupId === pg.id); })[0];
            group.layers.forEach(function (pl) {
                _this.removeLayerFromProject(projectId, groupId, pl.id, meta, function () { });
            });
            p.groups = p.groups.filter(function (pg) { return (pg.id !== groupId); });
            callback({ result: ApiResult.OK });
        }
    };
    ApiManager.prototype.addProject = function (project, meta, callback) {
        var _this = this;
        if (!project.id) {
            project.id = helpers.newGuid();
        }
        Winston.info('api: add project ' + project.id);
        var s = this.findStorage(project);
        project.storage = project.storage || s.id;
        if (!this.projects.hasOwnProperty(project.id)) {
            this.projects[project.id] = this.getProjectDefinition(project);
            var meta = { source: 'rest' };
            this.getInterfaces(meta).forEach(function (i) {
                i.initProject(_this.projects[project.id]);
                i.addProject(_this.projects[project.id], meta, function () { });
            });
            s.addProject(this.projects[project.id], meta, function (r) {
                _this.emit(Event[Event.ProjectChanged], { id: project.id, type: ChangeType.Create, value: project });
                callback(r);
            });
        }
        else {
            callback({ result: ApiResult.ProjectAlreadyExists, error: "Project already exists" });
        }
        this.saveProjectDelay(this.projects[project.id]);
    };
    ApiManager.prototype.addConnector = function (key, s, options, callback) {
        // TODO If client, check that only one interface is added (isInterface = true)
        if (callback === void 0) { callback = function () { }; }
        s.id = key;
        this.connectors[key] = s;
        s.init(this, options, function () {
            callback();
        });
    };
    ApiManager.prototype.addConnectors = function (connectors, callback) {
        var _this = this;
        connectors.forEach(function (c) {
            c.s.id = c.key;
            _this.connectors[c.key] = c.s;
        });
        async.eachSeries(connectors, function (c, callb) {
            c.s.init(_this, c.options, function () {
            });
            callb();
        }, function () {
            callback();
        });
    };
    ApiManager.prototype.findLayer = function (layerId) {
        if (this.layers.hasOwnProperty(layerId)) {
            return this.layers[layerId];
        }
        return null;
    };
    ApiManager.prototype.findProject = function (projectId) {
        if (this.projects.hasOwnProperty(projectId)) {
            return this.projects[projectId];
        }
        return null;
    };
    ApiManager.prototype.findKey = function (keyId) {
        return this.keys.hasOwnProperty(keyId)
            ? this.keys[keyId]
            : null;
    };
    ApiManager.prototype.findFeature = function (layerId, featureId, callback) {
        var layer = this.findLayer(layerId);
        var s = this.findStorage(layer);
        s.getFeature(layerId, featureId, {}, function (r) { return callback(r); });
    };
    ApiManager.prototype.findStorage = function (object) {
        var storage = (object && object.storage) || this.defaultStorage;
        if (this.connectors.hasOwnProperty(storage))
            return this.connectors[storage];
        return null;
    };
    ApiManager.prototype.findStorageForLayerId = function (layerId) {
        var layer = this.findLayer(layerId);
        return this.findStorage(layer);
    };
    ApiManager.prototype.findStorageForProjectId = function (projectId) {
        var project = this.findProject(projectId);
        return this.findStorage(project);
    };
    ApiManager.prototype.findStorageForKeyId = function (keyId) {
        var key = this.findKey(keyId);
        return this.findStorage(key);
    };
    ApiManager.prototype.getProjectDefinition = function (project) {
        var p = {
            id: project.id ? project.id : helpers.newGuid(),
            storage: project.storage ? project.storage : "",
            title: project.title ? project.title : project.id,
            connected: project.connected ? project.connected : true,
            logo: project.logo ? project.logo : "images/CommonSenseRound.png",
            groups: project.groups ? project.groups : [],
            url: project.url ? project.url : '/api/projects/' + project.id
        };
        return p;
    };
    ApiManager.prototype.getGroupDefinition = function (group) {
        var g = {
            id: group.id ? group.id : helpers.newGuid(),
            description: group.description ? group.description : "",
            title: group.title ? group.title : group.id,
            clusterLevel: group.clusterLevel ? group.clusterLevel : 19,
            clustering: true,
            layers: group.layers ? group.layers : []
        };
        return g;
    };
    ApiManager.prototype.getLayerDefinition = function (layer) {
        if (!layer.hasOwnProperty('type'))
            layer.type = "geojson";
        var server = this.options.server || '';
        var r = {
            server: server,
            id: layer.id,
            title: layer.title,
            updated: layer.updated,
            enabled: layer.enabled,
            description: layer.description,
            dynamicResource: layer.dynamicResource,
            defaultFeatureType: layer.defaultFeatureType,
            defaultLegendProperty: layer.defaultLegendProperty,
            typeUrl: layer.typeUrl,
            opacity: layer.opacity ? layer.opacity : 75,
            type: layer.type,
            features: [],
            data: '',
            storage: layer.storage ? layer.storage : '',
            url: layer.url ? layer.url : (server + "/api/layers/" + layer.id),
            isDynamic: layer.isDynamic ? layer.isDynamic : false
        };
        for (var key in layer) {
            if (layer.hasOwnProperty(key) && !r.hasOwnProperty(key))
                r[key] = layer[key];
        }
        return r;
    };
    ApiManager.prototype.getProject = function (projectId, meta, callback) {
        Winston.debug('Looking for storage of project ' + projectId);
        var s = this.findStorageForProjectId(projectId);
        if (s) {
            Winston.debug('Found storage ' + s.id + ' for project ' + projectId);
            s.getProject(projectId, meta, function (r) { callback(r); });
        }
        else {
            Winston.warn('Project ' + projectId + ' not found.');
            callback({ result: ApiResult.ProjectNotFound });
        }
    };
    ApiManager.prototype.searchLayers = function (keyword, layerIds, meta, callback) {
        var _this = this;
        if (!layerIds || layerIds.length == 0)
            layerIds = _.keys(this.layers);
        var result = [];
        async.each(layerIds, function (lId, callback) {
            var storage = _this.findStorageForLayerId(lId);
            if (storage != null) {
                storage.searchLayer(lId, keyword, meta, function (r) {
                    if (r.result === ApiResult.OK) {
                        r.features.forEach(function (f) { return result.push(f); });
                    }
                    callback();
                });
            }
        }, function (error) {
            if (!error) {
                callback({ result: ApiResult.OK, features: result });
            }
            else {
                callback({ result: ApiResult.Error });
            }
        });
    };
    ApiManager.prototype.getLayer = function (layerId, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        if (s)
            s.getLayer(layerId, meta, function (r) {
                callback(r);
            });
        else {
            Winston.warn('Layer ' + layerId + ' not found.');
            callback({ result: ApiResult.LayerNotFound });
        }
    };
    ApiManager.prototype.createLayer = function (layer, meta, callback) {
        if (!layer.hasOwnProperty('id'))
            layer.id = helpers.newGuid();
        layer.id = layer.id.toLowerCase();
        if (!layer.hasOwnProperty('title'))
            layer.title = layer.id;
        if (!layer.hasOwnProperty('features'))
            layer.features = [];
        if (!layer.hasOwnProperty('tags'))
            layer.tags = [];
        this.setUpdateLayer(layer, meta);
        Winston.info('api: add layer ' + layer.id);
        var s = this.findStorage(layer);
        layer.storage = s ? s.id : "";
        this.layers[layer.id] = this.getLayerDefinition(layer);
        this.getInterfaces(meta).forEach(function (i) {
            i.initLayer(layer);
        });
        if (s && s.id != meta.source) {
            s.addLayer(layer, meta, function (r) { return callback(r); });
        }
        else {
            callback({ result: ApiResult.OK });
        }
    };
    ApiManager.prototype.addUpdateLayer = function (layer, meta, callback) {
        var _this = this;
        async.series([
            function (cb) {
                _this.createLayer(layer, meta, function () {
                    cb();
                });
            },
            function (cb) {
                _this.setUpdateLayer(layer, meta);
                var l = _this.getLayerDefinition(layer);
                _this.layers[l.id] = l;
                _this.getInterfaces(meta).forEach(function (i) {
                    i.updateLayer(layer, meta, function () { });
                });
                var s = _this.findStorage(layer);
                if (s && s.id != meta.source) {
                    s.updateLayer(layer, meta, function (r, CallbackResult) {
                        Winston.warn('updating layer finished');
                    });
                }
                callback({ result: ApiResult.OK });
                _this.emit(Event[Event.LayerChanged], { id: layer.id, type: ChangeType.Update, value: layer });
                _this.saveLayersDelay(layer);
                cb();
            }
        ]);
    };
    ApiManager.prototype.updateProjectTitle = function (projectTitle, projectId, meta, callback) {
        var p = this.findProject(projectId);
        if (!p) {
            callback({ result: ApiResult.ProjectNotFound, error: "Project not found" });
            return;
        }
        p.title = projectTitle;
        this.projects[projectId] = p;
        callback({ result: ApiResult.OK, error: "Changed title" });
    };
    ApiManager.prototype.updateProject = function (project, meta, callback) {
        var _this = this;
        async.series([
            function (cb) {
                if (!_this.projects.hasOwnProperty(project.id)) {
                    _this.addProject(project, meta, function () {
                        cb();
                    });
                }
                else {
                    cb();
                }
            },
            function (cb) {
                var p = _this.getProjectDefinition(project);
                _this.projects[p.id] = p;
                _this.getInterfaces(meta).forEach(function (i) {
                    i.updateProject(project, meta, function () { });
                });
                var s = _this.findStorageForProjectId(project.id);
                if (s) {
                    s.updateProject(project, meta, function (r, CallbackResult) {
                        Winston.warn('updating project finished');
                    });
                }
                callback({ result: ApiResult.OK });
                _this.emit(Event[Event.ProjectChanged], { id: project.id, type: ChangeType.Update, value: project });
                _this.saveProjectDelay(project);
            }
        ]);
    };
    ApiManager.prototype.deleteLayer = function (layerId, meta, callback) {
        var _this = this;
        var s = this.findStorageForLayerId(layerId);
        s.deleteLayer(layerId, meta, function (r) {
            delete _this.layers[layerId];
            _this.getInterfaces(meta).forEach(function (i) {
                i.deleteLayer(layerId, meta, function () { });
            });
            _this.emit(Event[Event.LayerChanged], { id: layerId, type: ChangeType.Delete });
            callback(r);
        });
    };
    ApiManager.prototype.deleteProject = function (projectId, meta, callback) {
        var _this = this;
        var s = this.findStorageForProjectId(projectId);
        if (!s) {
            callback({ result: ApiResult.Error, error: "Project not found." });
            return;
        }
        s.deleteProject(projectId, meta, function (r) {
            delete _this.projects[projectId];
            _this.getInterfaces(meta).forEach(function (i) {
                i.deleteProject(projectId, meta, function () { });
            });
            _this.emit(Event[Event.ProjectChanged], { id: projectId, type: ChangeType.Delete });
            callback(r);
        });
    };
    ApiManager.prototype.getInterfaces = function (meta) {
        var res = [];
        for (var i in this.connectors) {
            if (this.connectors[i].isInterface && (this.connectors[i].receiveCopy || meta.source !== i))
                res.push(this.connectors[i]);
        }
        return res;
    };
    ApiManager.prototype.setUpdateLayer = function (layer, meta) {
        layer.updated = new Date().getTime();
    };
    ApiManager.prototype.addFeature = function (layerId, feature, meta, callback) {
        var _this = this;
        Winston.info('feature added');
        var layer = this.findLayer(layerId);
        if (!layer) {
            callback({ result: ApiResult.Error, error: 'layer not found' });
        }
        else {
            this.setUpdateLayer(layer, meta);
            var s = this.findStorage(layer);
            if (s)
                s.addFeature(layerId, feature, meta, function (result) {
                    _this.getInterfaces(meta).forEach(function (i) {
                        i.addFeature(layerId, feature, meta, function () { });
                    });
                    _this.emit(Event[Event.FeatureChanged], { id: layerId, type: ChangeType.Create, value: feature });
                    callback({ result: ApiResult.OK });
                });
        }
    };
    ApiManager.prototype.updateProperty = function (layerId, featureId, property, value, useLog, meta, callback) {
        var layer = this.findLayer(layerId);
        this.setUpdateLayer(layer, meta);
        var s = this.findStorage(layer);
        this.updateProperty(layerId, featureId, property, value, useLog, meta, function (r) { return callback(r); });
        this.emit(Event[Event.PropertyChanged], { id: layerId, type: ChangeType.Update, value: { featureId: featureId, property: property } });
    };
    ApiManager.prototype.updateLogs = function (layerId, featureId, logs, meta, callback) {
        var layer = this.findLayer(layerId);
        this.setUpdateLayer(layer, meta);
        var s = this.findStorage(layer);
        for (var p in logs) {
            logs[p].forEach(function (l) {
                if (!l.ts)
                    l.ts = new Date().getTime();
            });
        }
        s.updateLogs(layerId, featureId, logs, meta, function (r) { return callback(r); });
        this.getInterfaces(meta).forEach(function (i) {
            i.updateLogs(layerId, featureId, logs, meta, function () { });
        });
    };
    ApiManager.prototype.getFeature = function (layerId, featureId, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        s.getFeature(layerId, featureId, meta, function (result) { return callback(result); });
    };
    ApiManager.prototype.updateFeature = function (layerId, feature, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        if (s)
            s.updateFeature(layerId, feature, true, meta, function (result) { return callback(result); });
        this.getInterfaces(meta).forEach(function (i) {
            i.updateFeature(layerId, feature, false, meta, function () { });
        });
        this.emit(Event[Event.FeatureChanged], { id: layerId, type: ChangeType.Update, value: feature });
    };
    ApiManager.prototype.deleteFeature = function (layerId, featureId, meta, callback) {
        var _this = this;
        var s = this.findStorageForLayerId(layerId);
        if (s)
            s.deleteFeature(layerId, featureId, meta, function (result) {
                _this.getInterfaces(meta).forEach(function (i) {
                    i.deleteFeature(layerId, featureId, meta, function () { });
                });
                _this.emit(Event[Event.FeatureChanged], { id: layerId, type: ChangeType.Delete, value: featureId });
                callback(result);
            });
    };
    ApiManager.prototype.addLog = function (layerId, featureId, property, log, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        s.addLog(layerId, featureId, property, log, meta, function (result) { return callback(result); });
    };
    ApiManager.prototype.initLayer = function (layer) {
    };
    ApiManager.prototype.initProject = function (project) {
    };
    ApiManager.prototype.getLog = function (layerId, featureId, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        s.getLog(layerId, featureId, meta, function (result) { return callback(result); });
    };
    ApiManager.prototype.deleteLog = function (layerId, featureId, ts, prop, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        s.deleteLog(layerId, featureId, ts, prop, meta, function (result) { return callback(result); });
    };
    ApiManager.prototype.getBBox = function (layerId, southWest, northEast, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        s.getBBox(layerId, southWest, northEast, meta, function (result) { return callback(result); });
    };
    ApiManager.prototype.getSphere = function (layerId, maxDistance, lng, lat, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        s.getSphere(layerId, maxDistance, lng, lat, meta, function (result) { return callback(result); });
    };
    ApiManager.prototype.getWithinPolygon = function (layerId, feature, meta, callback) {
        var s = this.findStorageForLayerId(layerId);
        s.getWithinPolygon(layerId, feature, meta, function (result) { return callback(result); });
    };
    ApiManager.prototype.subscribeKey = function (pattern, meta, callback) {
        Winston.info('api: added key subscription with pattern ' + pattern);
        var sub = new KeySubscription();
        sub.id = helpers.newGuid();
        sub.pattern = pattern;
        sub.regexPattern = new RegExp(pattern.replace(/\//g, "\\/").replace(/\./g, "\\."));
        sub.callback = callback;
        this.keySubscriptions[sub.id] = sub;
        return sub;
    };
    ApiManager.prototype.addKey = function (key, meta, callback) {
        Winston.info('add key ' + key.id);
        var k = JSON.parse(JSON.stringify(key));
        delete k.values;
        this.keys[key.id] = k;
    };
    ApiManager.prototype.getKeys = function (meta, callback) {
        callback({ result: ApiResult.OK, keys: this.keys });
    };
    ApiManager.prototype.getKey = function (id, meta, callback) {
        var s = this.findStorageForKeyId(id);
        if (s)
            s.getKey(id, meta, function (r) {
                callback(r);
            });
        else {
            callback({ result: ApiResult.KeyNotFound });
        }
    };
    ApiManager.prototype.updateKey = function (keyId, value, meta, callback) {
        if (!meta)
            meta = {};
        if (!callback)
            callback = function () { };
        var key = this.findKey(keyId);
        if (!key) {
            var k = { id: keyId, title: keyId, storage: 'file' };
            this.addKey(k, meta, function () { });
        }
        if (!value.hasOwnProperty('time'))
            value['time'] = new Date().getTime();
        var s = this.findStorageForKeyId(keyId);
        if (s)
            s.updateKey(keyId, value, meta, function () { return callback(); });
        for (var subId in this.keySubscriptions) {
            var sub = this.keySubscriptions[subId];
            if (sub.regexPattern.test(keyId)) {
                sub.callback(keyId, value, meta);
            }
        }
        this.getInterfaces(meta).forEach(function (i) {
            i.updateKey(keyId, value, meta, function () { });
        });
        this.emit(Event[Event.KeyChanged], { id: keyId, type: ChangeType.Update, value: value });
        callback({ result: ApiResult.OK });
    };
    ApiManager.prototype.cleanup = function (callback) {
        if (!callback)
            callback = function () { };
        process.on('cleanup', callback);
        process.on('exit', function () {
            process.emit('cleanup');
        });
        process.on('SIGINT', function () {
            console.log('Ctrl-C...');
            process.exit(2);
        });
        process.on('uncaughtException', function (e) {
            console.log('Uncaught Exception...');
            console.log(e.stack);
            process.exit(99);
        });
    };
    ;
    return ApiManager;
})(events.EventEmitter);
exports.ApiManager = ApiManager;
//# sourceMappingURL=ApiManager.js.map