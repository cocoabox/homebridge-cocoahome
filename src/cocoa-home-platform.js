"use strict";
const settings = require("./settings");
const MqttClient = require('./MqttClient');
const AccessoriesManager = require('./accessories-manager');
const fs = require('fs');

const wait_msec_after_publish = 1000;

//
// a plugin based gateway for irkit2mqtt, switchbot2mqtt, etc
//
class CocoaHomePlatform extends MqttClient {
    #accessories_manager;
    #cached_accessories;
    constructor(log, config, api) {
        log.info('WELCOME to cocoa home platform ! config = ', config);
        // MqttClient requires config keys .mqtt.key , .mqtt.cert , .mqtt.ca : to contain actual 
        // cert content, not file path strings. Read content of these files and put them back into 
        // the config object
        ['key', 'cert', 'ca'].forEach(config_key => {
            if(config?.mqtt?.[config_key]) {
                const file_path = config.mqtt[config_key];
                if (! fs.existsSync(file_path)) {
                    log.error(`missing file : ${file_path} ; this file is required for config.mqtt.${config_key}`);
                    return;
                }
                log.info(`reading ${file_path} --> config.mqtt.${config_key}`);
                config.mqtt[config_key] = fs.readFileSync(file_path, 'utf8');
            }
        });
        super(config, {
            connect_on_construct:false,  // only start discovering after 'didFinishLaunching'
            message_type:'auto',
        });
        this.log = log;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.#cached_accessories = [];
        this.#accessories_manager = new AccessoriesManager(log);

        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            this.#start_mqtt();
        });
    }
    #start_mqtt() {
        const topic_prefixes = this.config.topic_prefixes ?? [];
        const topics = topic_prefixes.map(p => `${p}/+`);
        this.log.info('subscribing to:', topics);
        this.incoming_topic_pattern = null; 
        this.mqtt_subscribe(topics);
        this.mqtt_connect();
        this.on('mqtt-connect', async () => {
            this.log.info('mqtt connected');
            // send hello topics 3 second after connection
            // irkit2mqtt responds to a hello topic by announcing state of all appliances
            setTimeout(async () => {
                const publish_on_startup = this.config.publish_on_startup ?? {};
                for (const [topic, msg] of Object.entries(publish_on_startup)) {
                    this.log.info('publishing startup topic:', topic, msg);
                    await this.mqtt_publish(topic, msg === '' ? Buffer.from('') : msg);
                }
            }, 3000);
        });
    }
    #identify_accessory(topic, message_obj) {
        for (const [accessory_name, cls] of Object.entries(this.#accessories_manager.accessories)) {
            const ident_result = cls.identify(topic, message_obj); // if match, should return {mqtt_id:STR}
            if (ident_result) {
                const {mqtt_id} = ident_result;
                return {accessory_name, mqtt_id, cls}; 
            }
        }
    }
    #accessory_insts; // <-- {"accessory_name#mqtt_id": INST}
    async mqtt_on_message(topic, message_obj) {
        if (! this.#accessory_insts) {
            this.#accessory_insts = {};
        }
        const ident = this.#identify_accessory(topic, message_obj);
        if (! ident) return;

        const {accessory_name, mqtt_id, cls} = ident;
        const ai_key = `${accessory_name}:${mqtt_id}`;
        const unique_id = `cocoa-home-platform:${accessory_name}:${mqtt_id}`;
        this.log.debug(`ai_key=${ai_key} ; unique_id=${unique_id}`); 
        
        if (! this.#accessory_insts[ai_key]) {
            this.log.info(`[discover] preparing ${ai_key}`);
            const uuid = this.api.hap.uuid.generate(unique_id);
            const existing_accessory = this.#cached_accessories.find(accessory => accessory.UUID === uuid);
            if (existing_accessory) {
                this.log.info(`[discover] existing accessory from cache : ${mqtt_id}`);
                this.#accessory_insts[ai_key] = new cls(this, existing_accessory, this.log, this);
            }
            else {
                // the accessory does not yet exist, so we need to create it
                this.log.info(`[discover] new accessory from cache : ${mqtt_id} with name :`, accessory_name);
                const display_name = `${accessory_name} ${mqtt_id}`
                // create a new accessory
                const accessory = new this.api.platformAccessory(display_name, uuid);
                // store a copy of the device object in the `accessory.context`
                // the `context` property can be used to store any data about the accessory you may need
                accessory.context.device = { accessory_name, mqtt_id, topic };
                
                // create the accessory handler for the newly create accessory
                // this is imported from `platformAccessory.ts`
                this.#accessory_insts[ai_key] = new cls(this, accessory, this.log, this);
                // link the accessory to your platform
                this.api.registerPlatformAccessories(settings.PLUGIN_NAME, settings.PLATFORM_NAME, [accessory]);
            }
        }
        const accessory_inst = this.#accessory_insts[ai_key];
        if (accessory_inst) {
            accessory_inst.received_mqtt_message(message_obj);
            this.log.debug(`received mqtt update for ${accessory_inst.constructor.name} (ai_key: ${ai_key})`, JSON.stringify(message_obj));
        }
    }

    mqtt_publish(topic, body, opts) {
        this.log.info('publishing :', topic, body);
        return super.mqtt_publish(topic, body, opts);
    }

    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory) {
        this.log.debug('Loading accessory from cache:', accessory);
        // add the restored accessory to the accessories cache so we can track if it has already been registered
        this.#cached_accessories.push(accessory);
    }
}
module.exports = { CocoaHomePlatform };
