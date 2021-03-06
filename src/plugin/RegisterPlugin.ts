import express = require("express");
import proxy = require("express-http-proxy");
import {PerformanceMonitorPlugin} from "./PerformanceMonitorPlugin"
import { request } from "https";
import { print } from "util";
import {CombinationUrlService} from "../service/CombinationUrlService";
import { ApiInfoService } from "../service/ApiInfoService";
import { GeneralResult } from "../general/GeneralResult";
import {AdminPlugin} from "../plugin/AdminPlugin";
import { CombinationPlugin } from "./CombinationPlugin";
import { UrlService } from "../service/UrlService";
import { config } from "bluebird";
import { Config } from "../config/config";
let registerApp = express();
/**
 * 注册API数据
 */
class RegisterPlugin{
    private _registerApp = registerApp;
    public getRegisterApp(){
        return this._registerApp;
    }

    /**
     * 重新加载注册API
     * @param url 
     */
    public async loadData(url: { [key: string]: any }[]): Promise<void>{
        let data = new Map();
        // 保存真实的API服务地址
        let config: Config = new Config();
        let realhost: string = config.getApiServer().host + ":" + config.getApiServer().port;
        let combinationPlugin: CombinationPlugin = new CombinationPlugin();
        // _router数组存在数据，则清空
        if(this._registerApp._router){
            this._registerApp._router.stack.length = 2;
        }
        // 加载数据
        for(let i = 0; i < url.length; i++){
            // 注册原子API
            if(url[i].status == 0 && url[i].is_atom === "1"){
                let value = { "to": url[i].to, "status": url[i].status };
                data.set(url[i].from, value);
                let performanceMonitorPlugin:PerformanceMonitorPlugin =  new PerformanceMonitorPlugin();
                performanceMonitorPlugin.soursePerformanceHost = url[i].to ;
                this._registerApp.use(url[i].from,performanceMonitorPlugin.soursePerformanceMonitor.bind(performanceMonitorPlugin),proxy(url[i].to, {
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
    }


    /**
     * 添加注册
     * @param url 
     */
    public addData(url): void{
        let data = new Map();
        // 先清空之前已经注册公司的数据，再重新重新注册改公司的API数据
        let appId: string = url[0].APPId;
        if(this._registerApp._router && this._registerApp.stack){
            for(let i = 2; i < this._registerApp._router.satck.length; i++){
                if(this._registerApp._router.stack[i].appId === appId){
                    // 删除一个元素
                    this._registerApp._router.stack.splice(i, 1);
                    i--;
                }
            }
        }
        // 加载新数据
        for (let i = 0; i < url.length; i++) {
            let value = {"to": url[i].to, "status": url[i].status};
            data.set(url[i].from, value);
            if(url[i].status == 0){
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
    public async init(): Promise<void>{
        let urlService: UrlService = new UrlService();
        let apiInfoService: ApiInfoService = new ApiInfoService();
        // 获取url表中的所有数据
        let urlResult: GeneralResult = await urlService.query({});
        await this.loadData(urlResult.getDatum());
        
    }
}
export{RegisterPlugin};