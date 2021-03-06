"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ApiManager = require('./ApiManager');
var ClientConnection = require('./../dynamic/ClientConnection');
var ProjectUpdateAction = ClientConnection.ProjectUpdateAction;
var LayerUpdateAction = ClientConnection.LayerUpdateAction;
var KeyUpdateAction = ClientConnection.KeyUpdateAction;
var ApiResult = ApiManager.ApiResult;
var BaseConnector = require('./BaseConnector');
var Winston = require('winston');
var ExternalSocketIOAPI = (function (_super) {
    __extends(ExternalSocketIOAPI, _super);
    function ExternalSocketIOAPI(connection) {
        _super.call(this);
        this.connection = connection;
        this.id = "socketio";
        this.isInterface = true;
    }
    ExternalSocketIOAPI.prototype.init = function (layerManager, options, callback) {
        var _this = this;
        this.manager = layerManager;
        Winston.info('externalsocketio: init ExternalSocketIO API');
        this.connection.subscribe('layer', function (result, clientId) {
            var lu = result.data;
            if (lu) {
                ///TODO: check if lu.layerId really exists
                switch (lu.action) {
                    case ClientConnection.LayerUpdateAction.updateLog:
                        // find feature
                        var featureId = lu.item.featureId;
                        var logs = lu.item["logs"];
                        _this.manager.updateLogs(lu.layerId, featureId, logs, { source: _this.id, user: clientId }, function () { });
                        break;
                    case ClientConnection.LayerUpdateAction.updateFeature:
                        var ft = lu.item;
                        _this.manager.updateFeature(lu.layerId, ft, { source: _this.id, user: clientId }, function (r) { });
                        break;
                    case ClientConnection.LayerUpdateAction.deleteFeature:
                        _this.manager.deleteFeature(lu.layerId, lu.item, { source: _this.id, user: clientId }, function (r) { });
                        break;
                }
            }
        });
        this.connection.subscribe('project', function (result, clientId) {
            var lu = result.data;
            if (lu) {
                ///TODO: check if lu.layerId really exists
                switch (lu.action) {
                    case ClientConnection.ProjectUpdateAction.updateProject:
                        var p = JSON.parse(lu.item);
                        _this.manager.updateProject(p, { source: _this.id, user: clientId }, function (r) { });
                        break;
                    case ClientConnection.ProjectUpdateAction.deleteProject:
                        _this.manager.deleteProject(lu.projectId, { source: _this.id, user: clientId }, function (r) { });
                        break;
                }
            }
            //result.data
        });
        this.connection.subscribe('key', function (result, clientId) {
            var lu = result.data;
            if (lu) {
                ///TODO: check if lu.layerId really exists
                switch (lu.action) {
                    case ClientConnection.KeyUpdateAction.updateKey:
                        // find feature
                        var keyId = lu.item.keyId;
                        _this.manager.updateKey(lu.keyId, lu.item, { source: _this.id, user: clientId }, function () { });
                        break;
                }
            }
            //result.data
        });
        callback();
    };
    /** Sends a message (json) to a specific project, only works with socket io for now */
    ExternalSocketIOAPI.prototype.sendClientMessage = function (project, message) {
        this.connection.publish(project, "layer", "msg", message);
    };
    ExternalSocketIOAPI.prototype.addLayer = function (layer, meta, callback) {
        //this.connection.publish();
        var lu = { layerId: layer.id, action: LayerUpdateAction.updateLayer, item: layer };
        this.connection.updateLayer(layer.id, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.updateLayer = function (layer, meta, callback) {
        var lu = { layerId: layer.id, action: LayerUpdateAction.updateLayer, item: layer };
        this.connection.updateLayer(layer.id, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.deleteLayer = function (layerId, meta, callback) {
        var lu = { layerId: layerId, action: LayerUpdateAction.deleteLayer };
        this.connection.updateLayer(layerId, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.initLayer = function (layer) {
        Winston.info('socketio: init layer ' + layer.id);
        this.connection.registerLayer(layer.id, function (action, msg, client) {
            Winston.debug('socketio: action:' + action);
        });
    };
    ExternalSocketIOAPI.prototype.addProject = function (project, meta, callback) {
        //this.connection.publish();
        var lu = { projectId: project.id, action: ProjectUpdateAction.updateProject, item: project };
        this.connection.updateProject(project.id, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.updateProject = function (project, meta, callback) {
        var lu = { projectId: project.id, action: ProjectUpdateAction.updateProject, item: project };
        this.connection.updateProject(project.id, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.deleteProject = function (projectId, meta, callback) {
        var lu = { projectId: projectId, action: ProjectUpdateAction.deleteProject };
        this.connection.updateProject(projectId, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.initProject = function (project) {
        Winston.info('socketio: init project ' + project.id);
        this.connection.registerProject(project.id, function (action, msg, client) {
            Winston.debug('socketio: action:' + action);
        });
    };
    ExternalSocketIOAPI.prototype.addFeature = function (layerId, feature, meta, callback) {
        var lu = { layerId: layerId, action: LayerUpdateAction.updateFeature, item: feature };
        this.connection.updateFeature(layerId, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.updateFeature = function (layerId, feature, useLog, meta, callback) {
        Winston.info('socketio: update feature');
        var lu = { layerId: layerId, featureId: feature.id, action: LayerUpdateAction.updateFeature, item: feature };
        this.connection.updateFeature(layerId, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.updateLogs = function (layerId, featureId, logs, meta, callback) {
        Winston.info('socketio: update logs ' + JSON.stringify(logs));
        var lu = { layerId: layerId, action: LayerUpdateAction.updateLog, item: logs, featureId: featureId };
        this.connection.updateFeature(layerId, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.deleteFeature = function (layerId, featureId, meta, callback) {
        var lu = { layerId: layerId, action: LayerUpdateAction.deleteFeature, featureId: featureId };
        this.connection.updateFeature(layerId, lu, meta);
        callback({ result: ApiResult.OK });
    };
    ExternalSocketIOAPI.prototype.updateKey = function (keyId, value, meta, callback) {
        var ku = { keyId: keyId, action: KeyUpdateAction.updateKey, item: value };
        this.connection.updateKey(keyId, ku, meta);
        callback({ result: ApiResult.OK });
    };
    return ExternalSocketIOAPI;
}(BaseConnector.BaseConnector));
exports.ExternalSocketIOAPI = ExternalSocketIOAPI;
//# sourceMappingURL=ExternalSocketIOApi.js.map