'use strict';
//
// topic : is-present/FRIENDLY_NAME
// message :
// {
//   "type": "mac",   // or "ble"
//   "present": true
// }

const BaseAccessory = require('../base-accessory');

class Presence extends BaseAccessory {
  #accessory_info_service;
  #occupancy_sensor_service;
  #context;

  constructor(platform, accessory, homebridge_log, mqtt_client) {
    super(platform, accessory, homebridge_log, mqtt_client);
    this.#context = accessory.context.device;

    this.#accessory_info_service = this.accessory.getService(this.platform.Service.AccessoryInformation);
    this.#accessory_info_service
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'cocoabox')
      .setCharacteristic(this.platform.Characteristic.Model, 'is-present')
      .setCharacteristic(this.platform.Characteristic.Name, 'beacon/network presence')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.mqtt_id);

    this.#occupancy_sensor_service = this.accessory.getService('Occupancy Sensor') ||
      this.accessory.addService(this.platform.Service.OccupancySensor, 'Occupancy Sensor', 'occupancy-sensor');
    this.#occupancy_sensor_service.setCharacteristic(this.platform.Characteristic.Name, `Presence (${this.#context?.mqtt_id ?? 'unknown'})`);
    this.#occupancy_sensor_service.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onGet(this.get_occupancy.bind(this));
  }

  async get_occupancy() {
    const present = this.state?.present;
    if ( typeof present === 'undefined' ) {
      this.say('warn', 'HAP requested get_occupancy but we got none to report ; replying undefined');
      this.say('info', 'current state is :', JSON.stringify(this.state));
      return;
    }
    return present;
  }

  /**
   * identifies whether an MQTT message is an "is-present" message, return device identifier if yes.
   */
  static identify(topic, message_obj) {
    // when a "is-present/+" message arrives, provide positive identification
    if ( ['ble', 'mac', 'person'].includes(message_obj?.type) && typeof message_obj?.present === 'boolean' ) {
      const mqtt_id = topic.match(/\/(.*)$/)?.[1];
      return {mqtt_id};
    }
    // not an is-present message; return nothing
  }

  received_mqtt_message(msg) {
    super.received_mqtt_message(msg);

    const present = msg?.present ?? null;
    if ( typeof present === 'boolean' ) {
      this.#accessory_info_service.setCharacteristic(this.platform.Characteristic.OccupancyDetected, present);
    }
  }
}

module.exports = {
  accessory_name : 'presence',
  cls : Presence,
};
