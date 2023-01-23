"use strict";

class BaseAccessory {
    #homebridge_log;
    #mqtt_client;
    #state;
    #context;
    #pub_topic_suffix;
    constructor(platform, accessory, homebridge_log, mqtt_client, pub_topic_suffix='/set') {
        this.#pub_topic_suffix = pub_topic_suffix;
        this.#state = {};
        this.accessory = accessory;
        this.platform = platform;
        this.#mqtt_client = mqtt_client;
        this.#homebridge_log = homebridge_log;

        const context_device = accessory.context.device ?? {};
        this.#context = accessory.context.device;
    }
    get accessory_name() {
        return this.#context.accessory_name;
    }
    get mqtt_id() {
        return this.#context.mqtt_id;
    }
    get topic() {
        return this.#context.topic;
    }
    get state() {
        return this.#state;
    }
    set_states(new_states, publish_new_state_only=true) {
        const publish_what = publish_new_state_only ? new_states
            : Object.assign(this.#state ?? {}, new_states);
        this.#state = Object.assign(this.#state ?? {}, new_states);

        return this.publish_mqtt_message(publish_what);
    }
    say(level, ...log_content) { 
        if (! log_content) log_content = [];
        if (! ['info', 'warn', 'debug', 'error'].includes(level)) {
            log_content = [].concat([level], log_content);
            level = 'info';
        }
        const say_what = [].concat([`${this.accessory_name} ${this.mqtt_id} │`], log_content);
        this.#homebridge_log[level](... say_what);
    }
    /**
     * to be called from cocoa-home-platform when an mqtt message is received
     * this function tells cocoa-home-platform whether this message represents a
     * ToshibaCeilingLightAccessory
     */
    static identify(topic, message_obj) {
        return false;
    }

    publish_mqtt_message(message) {
        const suffix = this.#pub_topic_suffix;
        return this.#mqtt_client.mqtt_publish(`${this.topic}${suffix}`, message);
    }

    received_mqtt_message(msg){
        this.#state = Object.assign(this.#state ?? {}, msg);
    }
    // utility functions
    static convert_range( value, r1, r2 ) { 
        return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
    }
}

module.exports = BaseAccessory;
