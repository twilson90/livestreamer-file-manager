const path = require("node:path");
const stream = require("node:stream");
const crypto = require("node:crypto");
const fs = require("node:fs");
const MultiStream = require("multistream");
const { Writable } = require("node:stream");

const utils = module.exports = {
	suffix(name, suff) {
		var ext = path.extname(name);
		var fil = path.basename(name, ext);
		return fil + suff + ext;
	},
	getExt(filename) {
		return filename.match(/\.[^.]+$/)[0];
	},
	replaceExt(filename, ext) {
		if (utils.getExt(filename)) return filename.replace(/\.[^.]+$/, ext);
		if (!ext.startsWith(".")) ext = "."+ext;
		return filename+ext;
	},
	isSubdir(parent, dir) {
		const relative = path.relative(parent, dir);
		return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
	},
	tryRequire(dir, name) {
		dir = path.resolve(dir);
		if (!utils.isSubdir(dir, name)) return;
		try { return require(path.resolve(dir, name)) } catch {};
	},
	/** @param {stream.Stream} stream @returns {Buffer} */
	streamToBuffer(stream) {
		return new Promise((resolve, reject) => {
			let buffers = [];
			stream.on('error', reject);
			stream.on('data', (data)=>buffers.push(data));
			stream.on('end', ()=>resolve(Buffer.concat(buffers)));
		});
	},
	md5(str) {
		return crypto.createHash("md5").update(str).digest("hex");
	},
	/** @param {Readable[]} inputs @param {Writable} output */
	async mergefiles(inputs, output) {
		// var fd;
		if (typeof output === "string") {
			// fd = fs.openSync(output, 'w+');
			output = fs.createWriteStream(output, {flags:"w+"});
		}
		inputs = inputs.map((input) => {
			if (typeof input === "string") return fs.createReadStream(input);
			return input;
		});
		return new Promise((resolve, reject) => {
			var stream = new MultiStream(inputs);
			stream.pipe(output);
			stream.on('end', () => {
				// if (fd) fs.closeSync(fd);
				resolve(true);
			});
			stream.on('error', (e) => {
				// if (fd) fs.closeSync(fd);
				reject(false);
			});
		});
	}
}