'use strict';
//
// example payload :
//
// {
//   "id": "f56053d86423",
//   "address": "f5:60:53:d8:64:23",
//   "rssi": -63,
//   "serviceData": {
//     "model": "c",
//     "modelName": "WoCurtain",
//     "calibration": true,
//     "battery": 88,
//     "position": 90,
//     "lightLevel": 1
//   },
//   "__last_seen__": "Sun, 22 Jan 2023 12:38:01 GMT",
//   "__online__": "yes",
//   "__friendly_name__": "left-curtain"
// }
//
const BaseAccessory = require('../base-accessory');
const FifoArray = require('fifo-array');

const LOW_BATTERY_THRESHOLD = 10;

class SwitchbotCurtainAccessory extends BaseAccessory {
  #window_covering_service;
  #light_sensor_service;
  #battery_service;
  #accessory_info_service;
  #light_level_history;

  constructor(platform, accessory, homebridge_log, mqtt_client) {
    super(platform, accessory, homebridge_log, mqtt_client);

    this.#light_level_history = new FifoArray(50);

    this.#accessory_info_service = this.accessory.getService(this.platform.Service.AccessoryInformation);
    this.#accessory_info_service
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Switchbot')
      .setCharacteristic(this.platform.Characteristic.Model, 'WoCurtain')
      .setCharacteristic(this.platform.Characteristic.Name, 'Switchbotカーテン')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.mqtt_id);


    this.#battery_service = this.accessory.getService('Battery Level') ||
      this.accessory.addService(this.platform.Service.Battery, 'Battery Level', 'curtain-battery-level');
    this.#battery_service.setCharacteristic(this.platform.Characteristic.Name, 'Battery Level');
    this.#battery_service.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.get_battery_low.bind(this));
    this.#battery_service.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.get_battery_level.bind(this));

    this.#window_covering_service = this.accessory.getService('Window Covering') ||
      this.accessory.addService(this.platform.Service.WindowCovering, 'Window Covering', 'window-covering');
    this.#window_covering_service.setCharacteristic(this.platform.Characteristic.Name, 'Window Covering');

    this.#window_covering_service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.get_current_position.bind(this));
    this.#window_covering_service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onGet(this.get_target_position.bind(this))
      .onSet(this.set_target_position.bind(this));

    this.#light_sensor_service = this.accessory.getService('Light Sensor') ||
      this.accessory.addService(this.platform.Service.LightSensor, 'Light Sensor', 'light-sensor');

    this.#light_sensor_service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.get_light_level.bind(this));
  }

  #light_level_history_push(val) {
    this.#light_level_history.push(val);
  }

  get #light_level_average() {
    return this.#light_level_history.reduce((a, b) => a + b) / this.#light_level_history.length;
  }

  async get_battery_low() {
    const battery_percent = this.state?.serviceData?.battery;
    if ( typeof battery_percent === 'undefined' ) {
      this.say('warn', 'HAP requested get_battery_low but we got none to report ; replying undefined');
      this.say('info', 'current state is :', JSON.stringify(this.state));
      return;
    }
    return battery_percent < LOW_BATTERY_THRESHOLD;
  }

  async get_battery_level() {
    const battery_percent = this.state?.serviceData?.battery;
    if ( typeof battery_percent === 'undefined' ) {
      this.say('warn', 'HAP requested get_battery_level but we got none to report ; replying undefined');
      this.say('info', 'current state is :', JSON.stringify(this.state));
    }
    return battery_percent;
  }

  async get_current_position() {
    // TODO : return 0..100
    const position = this.state?.serviceData?.position;
    if ( typeof position === 'undefined' ) {
      this.say('warn', 'HAP requested get_current_position but we got none to report ; replying undefined');
      this.say('info', 'current state is :', JSON.stringify(this.state));
    }
    return 100 - position;
  }

  async get_target_position() {
    // TODO : return 0..100
    const position = this.state?.serviceData?.position;
    if ( typeof position === 'undefined' ) {
      this.say('warn', 'HAP requested get_current_position but we got none to report ; replying undefined');
      this.say('info', 'current state is :', JSON.stringify(this.state));
    }
    return 100 - position;
  }

  async set_target_position(percent) {
    await this.publish_mqtt_message({
      device_type : 'curtain',
      command : {percent : 100 - percent}, // in sb2m, 100% means closed, in HAP, 100% means open
    });
  }

  async get_light_level() {
    // return 0.0001 .. 100000
    const lux = this.constructor.convert_range(this.#light_level_average, [1, 5], [.001, 10000]);
    return lux;
  }

  /**
   * to be called from cocoa-home-platform when an mqtt message is received
   * this function tells cocoa-home-platform whether this message represents a
   * ToshibaCeilingLightAccessory
   */
  static identify(topic, message_obj) {
    // when an "switchbots/+" message arrives, provide positive identification
    if ( message_obj?.serviceData?.modelName === 'WoCurtain' ) {
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
    const position = msg?.serviceData?.position ?? null;
    if ( position !== null && typeof position !== 'undefined' ) {
      this.#window_covering_service.updateCharacteristic(
        this.platform.Characteristic.CurrentPosition, 100 - position);
      this.#window_covering_service.updateCharacteristic(
        this.platform.Characteristic.TargetPosition, 100 - position);
    }
    const light_level = msg?.serviceData?.lightLevel ?? null;
    if ( light_level !== null && typeof light_level !== 'undefined' ) {
      this.#light_level_history_push(light_level);
      const lux = this.constructor.convert_range(this.#light_level_average, [1, 5], [.001, 10000]);
      this.#light_sensor_service.updateCharacteristic(
        this.platform.Characteristic.CurrentAmbientLightLevel, lux);
    }
    // ↓ switchbot common
    const incoming_battery = msg?.serviceData?.battery ?? null;
    if ( incoming_battery !== null && typeof incoming_battery !== 'undefined' ) {
      this.#battery_service.updateCharacteristic(
        this.platform.Characteristic.BatteryLevel, incoming_battery);

      const low_battery = incoming_battery < LOW_BATTERY_THRESHOLD;
      this.#battery_service.updateCharacteristic(
        this.platform.Characteristic.StatusLowBattery, low_battery);
    }
  }
}

module.exports = {
  accessory_name : 'switchbot-curtain',
  cls : SwitchbotCurtainAccessory,
};
