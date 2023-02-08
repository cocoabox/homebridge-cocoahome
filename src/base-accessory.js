'use strict';

class BaseAccessory {
  #homebridge_log;
  #mqtt_client;
  #state;
  #context;
  #pub_topic_suffix;
  #publish_states_springload_secs;

  constructor(platform, accessory, homebridge_log, mqtt_client, pub_topic_suffix = '/set', {springload_sec} = {}) {
    this.#pub_topic_suffix = pub_topic_suffix;
    this.#state = {};
    this.accessory = accessory;
    this.platform = platform;
    this.#mqtt_client = mqtt_client;
    this.#homebridge_log = homebridge_log;
    this.#publish_states_springload_secs = springload_sec ?? 1;

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

  #publish_pending;
  #publish_states_springload_timer;

  #publish_states_springload(publish_what) {
    if ( this.#publish_states_springload_timer ) {
      clearInterval(this.#publish_states_springload_timer);
    }
    this.#publish_pending = Object.assign(
      this.#publish_pending ?? {},
      publish_what);
    this.say(`[springload] will publish if we get no more calls in ${this.#publish_states_springload_secs} sec; adding :`, publish_what);
    this.#publish_states_springload_timer = setTimeout(async () => {
      this.say('[springload] ⚡️ publish :', this.#publish_pending);
      this.#publish_states_springload_timer = null;
      await this.publish_mqtt_message(this.#publish_pending);
      this.#publish_pending = {};
    }, this.#publish_states_springload_secs * 1000);
  }

  set_states(new_states, publish_new_state_only = true) {
    const publish_what = publish_new_state_only ? new_states
      : Object.assign(this.#state ?? {}, new_states);
    this.#state = Object.assign(this.#state ?? {}, new_states);
    // iOS sends update calls when user's finger is still on the slider to give some 'see the changes as you slide' feel
    // this works terribly for mqtt and irkit as this floods the network / floods IrKit's input buffer
    // so we throttle it down to "1 request per sec"
    return this.#publish_states_springload(publish_what);
  }

  say(level, ...log_content) {
    if ( ! log_content ) {
      log_content = [];
    }
    if ( ! ['info', 'warn', 'debug', 'error'].includes(level) ) {
      log_content = [].concat([level], log_content);
      level = 'info';
    }
    const say_what = [].concat([`${this.accessory_name} ${this.mqtt_id} │`], log_content);
    this.#homebridge_log[level](...say_what);
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

  received_mqtt_message(msg) {
    this.#state = Object.assign(this.#state ?? {}, msg);
  }

  // utility functions
  static convert_range(value, r1, r2) {
    return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0];
  }
}

module.exports = BaseAccessory;
