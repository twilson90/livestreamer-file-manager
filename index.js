import express from "express";
import path from "node:path";
import compression from "compression";
import core, { WebServer } from "@livestreamer/core";
import { Volume, ElFinder, constants } from "./internal.js";

/** @typedef {{name:string, isdir:boolean, children:TreeNode[]}} TreeNode */

const __dirname = import.meta.dirname;

class FileManagerApp {

    async init() {
        const exp = express();

        this.web = new WebServer(exp, {
            auth: true
        });

        core.ipc.respond("volumes", ()=>Object.fromEntries(Object.entries(this.elFinder.volumes).map(([k,v])=>[k,v.config])));
        
        exp.use("/", compression({threshold:0}), express.static(path.resolve(__dirname, `public_html`)));
        
        this.elFinder = new ElFinder(exp, {
            volumes: core.conf["file-manager.volumes"],
        });
        await this.elFinder.init();

        this.elFinder.commands.add("listtree");
    }
    async destroy(){
        await this.web.destroy();
    }
}

/**
 * @param {object} opts
 * @param {string[]} opts.targets
 * @param {boolean} opts.download
 * @param {express.Response} res
 */
Volume.prototype.listtree = async function(opts, res) {
    return this.driver(opts.reqid, async (driver)=>{
        var targets = opts.targets.map(t=>driver.unhash(t).id);
        // var trees = [];
        // for (var target of targets) {
        //     /** @type {Object.<string,TreeNode>} */
        //     var nodes = {};
        //     nodes[target] = {name:this.name, isdir:true};
        //     await driver.walk(target, (id, stat, parents=[])=>{
        //         var parent = parents[parents.length-1];
        //         var isdir = stat.mime===constants.DIRECTORY;
        //         var name = stat.name;
        //         nodes[id] = {name, isdir};
        //         if (parent) {
        //             if (!nodes[parent].children) nodes[parent].children = [];
        //             nodes[parent].children.push(nodes[id]);
        //         }
        //         return nodes[id];
        //     });
        //     trees.push(nodes[target]);
        // }var trees = [];
        var ids = [];
        for (var target of targets) {
            await driver.walk(target, (id, stat, parents=[])=>{
                ids.push(id)
            });
        }
        return { ids };
    });
}

const app = new FileManagerApp();
core.init("file-manager", app);

export default app;
export * from "./internal.js";