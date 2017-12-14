"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const proxy = require("express-http-proxy");
const PerformanceMonitorPlugin_1 = require("./PerformanceMonitorPlugin");
const ApiInfoService_1 = require("../service/ApiInfoService");
const CombinationPlugin_1 = require("./CombinationPlugin");
const UrlService_1 = require("../service/UrlService");
const config_1 = require("../config/config");
let registerApp = express();
/**
 * 注册API数据
 */
class RegisterPlugin {
    constructor() {
        this._registerApp = registerApp;
    }
    getRegisterApp() {
        return this._registerApp;
    }
    /**
     * 重新加载注册API
     * @param url
     */
    loadData(url) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = new Map();
            // 保存真实的API服务地址
            let config = new config_1.Config();
            let realhost = config.getApiServer().host + ":" + config.getApiServer().port;
            let combinationPlugin = new CombinationPlugin_1.CombinationPlugin();
            // _router数组存在数据，则清空
            if (this._registerApp._router) {
                this._registerApp._router.stack.length = 2;
            }
            // 加载数据
            for (let i = 0; i < url.length; i++) {
                // 注册原子API
                if (url[i].status == 0 && url[i].is_atom === "1") {
                    let value = { "to": url[i].to, "status": url[i].status };
                    data.set(url[i].from, value);
                    let performanceMonitorPlugin = new PerformanceMonitorPlugin_1.PerformanceMonitorPlugin();
                    performanceMonitorPlugin.soursePerformanceHost = url[i].to;
                    this._registerApp.use(url[i].from, performanceMonitorPlugin.soursePerformanceMonitor.bind(performanceMonitorPlugin), proxy(url[i].to, {
                        proxyReqPathResolver: function (req) {
                            return req.originalUrl;
                        }
                    }));
                    // 为相关的API标注，以便后期注销
                    this._registerApp._router.stack[this._registerApp._router.stack.length - 1].appId = url[i].APPId;
                    this._registerApp._router.stack[this._registerApp._router.stack.length - 1].url = url[i].from;
                }
                // 注册分子API
                if (url[i].status == 0 && url[i].is_atom === "0") {
                    let value = { "to": url[i].to, "status": url[i].status };
                    data.set(url[i].from, value);
                    this._registerApp.use(url[i].from, combinationPlugin.combinationService);
                    // 为相关的API标注，以便后期注销
                    this._registerApp._router.stack[this._registerApp._router.stack.length - 1].appId = url[0].appId;
                    this._registerApp._router.stack[this._registerApp._router.stack.length - 1].url = url[i];
                    data.set(url[i].from, { to: realhost, status: "0" });
                }
            }
            console.log(data);
        });
    }
    /**
     * 添加注册
     * @param url
     */
    addData(url) {
        let data = new Map();
        // 先清空之前已经注册公司的数据，再重新重新注册改公司的API数据
        let appId = url[0].APPId;
        if (this._registerApp._router && this._registerApp.stack) {
            for (let i = 2; i < this._registerApp._router.satck.length; i++) {
                if (this._registerApp._router.stack[i].appId === appId) {
                    // 删除一个元素
                    this._registerApp._router.stack.splice(i, 1);
                    i--;
                }
            }
        }
        // 加载新数据
        for (let i = 0; i < url.length; i++) {
            let value = { "to": url[i].to, "status": url[i].status };
            data.set(url[i].from, value);
            if (url[i].status == 0) {
                this._registerApp.use(url[i].from, proxy(url[i].to, {
                    proxyReqPathResolver: function (req) {
                        return req.originalUrl;
                    }
                }));
                // 为相关的API标注，以便后期注销
                this._registerApp._router.stack[this._registerApp._router.stack.length - 1].appId = url[0].appId;
                this._registerApp._router.stack[this._registerApp._router.stack.length - 1].url = url[0].from;
            }
        }
        console.log(data);
    }
    /**
     * 初始化系统时从数据库读取数据进行注册
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            let urlService = new UrlService_1.UrlService();
            let apiInfoService = new ApiInfoService_1.ApiInfoService();
            // 获取url表中的所有数据
            let urlResult = yield urlService.query({});
            yield this.loadData(urlResult.getDatum());
        });
    }
}
exports.RegisterPlugin = RegisterPlugin;
