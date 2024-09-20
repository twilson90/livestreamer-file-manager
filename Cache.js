class Cache {
    /** @type {Object.<string, Promise<import("./Driver").Stat} */
    stats = {};
    /** @type {Object.<string, Promise<string[]>>} */
    dirs = {};
}

module.exports = Cache;