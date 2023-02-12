'use strict';
//
// topic : switchbot2mqtt/DEVICE_NAME
//
// example payload :
//
// {
//   "id": "6055f935f6a6",
//   "address": "60:55:f9:35:f6:a6",
//   "rssi": -58,
//   "serviceData": {
//     "model": "j",
//     "modelName": "WoPlugMini",
//     "state": "off",
//     "delay": false,
//     "timer": false,
//     "syncUtcTime": true,
//     "wifiRssi": 46,
//     "overload": false,
//     "currentPower": 0
//   },
//   "__last_seen__": "Sun, 22 Jan 2023 13:47:58 GMT",
//   "__online__": "yes",
//   "__friendly_name__": "my-plug"
// }
//
//
const BaseAccessory = require('../base-accessory');

class SwitchbotPlugMiniAccessory extends BaseAccessory {
  #outlet_service;
  #service_label_service;
  #accessory_info_service;

  constructor({platform, accessory, homebridge_log, mqtt_client}) {
    super({platform, accessory, homebridge_log, mqtt_client});

    this.#accessory_info_service = this.accessory.getService(this.platform.Service.AccessoryInformation);
    this.#accessory_info_service
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Switchbot')
      .setCharacteristic(this.platform.Characteristic.Model, 'WoCurtain')
      .setCharacteristic(this.platform.Characteristic.Name, 'Switchbotミニプラグ')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.mqtt_id);

    this.#outlet_service = this.accessory.getService('Outlet') ||
      this.accessory.addService(this.platform.Service.Outlet, 'Outlet', 'outlet');
    this.#outlet_service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.get_on.bind(this))
      .onSet(this.set_on.bind(this));
  }

  async get_on() {
    const state = this.state?.serviceData?.state;
    if ( typeof position === 'undefined' ) {
      this.say('warn', 'HAP requested get_current_position but we got none to report ; replying undefined');
      this.say('info', 'current state is :', JSON.stringify(this.state));
    }
    return state.toLowerCase() === 'on';
  }

  async set_on(on_off_bool) {
    await this.publish_mqtt_message({device_type : 'plugmini', command : on_off_bool ? 'on' : 'off'});
  }

  /**
   * to be called from cocoa-home-platform when an mqtt message is received
   * this function tells cocoa-home-platform whether this message represents a
   * ToshibaCeilingLightAccessory
   */
  static identify(topic, message_obj) {
    // when an "switchbots/+" message arrives, provide positive identification
    if ( message_obj?.serviceData?.modelName === 'WoPlugMini' ) {
      const mqtt_id = topic.match(/\/(.*)$/)?.[1];
      return {mqtt_id};
    }
    // not an WoSensorTH; return nothing
  }

  received_mqtt_message(msg) {
    super.received_mqtt_message(msg);

    const serial_num = msg?.id ?? null;
    if ( serial_num !== null && typeof serial_num !== 'undefined' ) {
      this.#accessory_info_service.setCharacteristic(
        this.platform.Characteristic.SerialNumber, `${this.mqtt_id}/${serial_num}`);
    }
    const state = msg?.serviceData?.state ?? null;
    if ( state !== null && typeof state !== 'undefined' ) {
      this.#outlet_service.updateCharacteristic(
        this.platform.Characteristic.On, state.toLowerCase() === 'on');
    }
  }
}

module.exports = {
  accessory_name : 'switchbot-plug-mini',
  cls : SwitchbotPlugMiniAccessory,
};
