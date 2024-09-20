const upath = require("upath");
const mime = require("mime-types");
const fs = require("fs-extra");
const stream = require("node:stream");
const ftp = require("basic-ftp")
const Volume = require("../Volume");
const Driver = require("../Driver");

/** @inheritDoc */
class FTP extends Driver {
    static net_protocol = "ftp";

    __config(config) {
        config.separator = "/";
    }

    __init() {
        this.client = new ftp.Client();
        return this.client.access({
            host: this.volume.config.host,
            user: this.volume.config.user,
            password: this.volume.config.pass || "",
            secure: !!this.volume.config.ftps
        })
            .then(()=>true)
            .catch(()=>{
                console.error(`FTP Volume '${this.volume.name}' could not connect.`);
                return false;
            });
    }

    __destroy(){
        this.client.close();
        this.client = null;
    }
    
    async __upload(tmpfile, dstdir, name) {
        var dst = upath.join(dstdir, name);
        await this.client.uploadFrom(tmpfile, dst);
        return dst;
    }
    
    __uri(id) {
        var config = this.volume.config;
        return new URL(id, `ftp${config.ftps?"s":""}://${config.user}:${config.password||""}@${config.host}`).toString();
    }

    async __readdir(src) {
        var infos = await this.client.list(src).catch(()=>[]);
        return infos.map(info=>{
            var id = upath.join(src, info.name);
            this.cache.stats[id] = {
                name: info.name,
                parent: src,
                size: info.size,
                mime: (info.type == 2) ? Volume.DIRECTORY : mime.lookup(id),
                ts: +info.modifiedAt,
                exists: true,
            }
            return id;
        });
    }
    async __stat(id) {
        var parent = upath.dirname(id);
        if (!this.cache.stats[id]) await this.readdir(parent);
        return this.cache.stats[id];
    }
    async __move(src, dir, name) {
        var dst = upath.join(dir, name);
        await this.client.rename(src, dst);
        return dst;
    }
    async __rename(src, name) {
        var dst = upath.join(upath.dirname(src), name);
        await this.client.rename(src, dst);
        return dst;
    }
    async __copy(src, dir, name) {
        var dst = upath.join(dir, name);
        var tmp = upath.join(this.elfinder.tmpdir, uuid.v4());
        await fs.mkdir(tmp)
        await this.client.downloadToDir(src, tmp);
        await this.client.uploadFromDir(tmp, dst);
        await fs.rm(tmp, {recursive:true});
        return dst;
    }
    async __chmod(src, mode) {
        await this.client.SendCommand(`chmod ${mode} "${src.replace(/"/g, `\\"`)}"`);
        return src;
    }
    async __rm(src) {
        var stat = await this.stat(src);
        if (stat.mime === Volume.DIRECTORY) this.client.removeDir(src);
        else this.client.remove(src);
    }
    async __read(src, options) {
        var start = 0, end;
        if (!options) options = {};
        if (options.end) end = options.end;
        if (options.start) start = options.start;
        var total = 0;
        const transform = new stream.Transform({
            async transform(chunk, encoding, callback) {
                var chunksize = chunk.length;
                if (end && (start+total+chunksize) > end) {
                    callback(null, chunk.subarray(0, end-(start+total)));
                    transform.destroy();
                } else {
                    callback(null, chunk);
                }
                total += chunksize;
            }
        });
        var promise = this.client.downloadTo(transform, src, start);
        if (end) promise.catch((e)=>{}); // downloadTo does not accoutn for early transform destroy. Github issue suggests this won't be fixed as it's too obscure.
        return transform;
    }
    async __write(dir, name, data) {
        var dst = upath.join(dir, name);
        this.on("abort", ()=>this.client.close());
        await this.client.uploadFrom(data, dst);
        return dst;
    }
    async __mkdir(dir, name) {
        var dst = upath.join(dir, name);
        await this.client.ensureDir(dst);
        return dst;
    }
}
module.exports = FTP;