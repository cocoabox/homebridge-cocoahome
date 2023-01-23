const fs = require('fs');

class AccessoriesManager {
    #accessories;
    constructor(log) {
        this.#accessories = {};
        fs.readdirSync(`${__dirname}/accessories`).filter(n => !! n.match(/\.js$/)).map(fn => {
            try {
                const name_only = fn.match(/^(.*?)\.js$/)?.[1];
                if (name_only) {
                    const req_path = `./accessories/${name_only}`;
                    const imported = require(req_path);
                    if (imported?.accessory_name && typeof imported?.cls === 'function') {
                        log.info(`imported : ${imported.accessory_name}`);
                        this.#accessories[imported.accessory_name] = imported.cls;
                    }
                }
            }
            catch(error) {
                log.warn(`error importing ${fn} : ${error}`);
                return;
            }
        });
    }
    get accessories() {
        return this.#accessories;
    }

}
module.exports = AccessoriesManager;
