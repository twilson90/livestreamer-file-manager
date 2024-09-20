const express = require("express");
const path = require("node:path");
const Volume = require("./Volume");
const core = require("@livestreamer/core");
const App = require("@livestreamer/core/App");
const utils  = require("@livestreamer/core/utils");
const WebServer = require("@livestreamer/core/WebServer");

/** @typedef {{name:string, isdir:boolean, children:TreeNode[]}} TreeNode */

class FileManagerApp extends App {

    constructor(){
        super("file-manager");
    }

    init() {
        const exp = express();

        this.web = new WebServer(exp, {
            auth: true
        });
        
        exp.use("/", require("compression")({threshold:0}), express.static(path.resolve(__dirname, `public_html`)));
        
        this.elFinder = new ElFinder(exp, {
            volumes: core.conf["file-manager.volumes"],
            // key: core.conf["file-manager.key"]
        });

        this.elFinder.commands.add("listtree");
        
		/* this.router.get('/volumes', async (req, res, next)=>{
			res.json(configs);
		}); */

        core.on("main.connected", ()=>{
            core.ipc_send("main", "update_volumes", Object.fromEntries(Object.entries(this.elFinder.volumes).map(([k,v])=>[k,v.config])));
        });
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
        //         var isdir = stat.mime===Volume.DIRECTORY;
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

const app = module.exports = new FileManagerApp();
core.register(app);

const ElFinder = require("./elfinder");