"use strict";
// 
// example payload :
//
// {
//   "id": "e65c234d57e5",
//   "address": "e6:5c:23:4d:57:e5",
//   "rssi": -70,
//   "serviceData": {
//     "model": "T",
//     "modelName": "WoSensorTH",
//     "temperature": {
//       "c": 21.8,
//       "f": 71.2
//     },
//     "fahrenheit": false,
//     "humidity": 28,
//     "battery": 100
//   },
//   "__last_seen__": "Sun, 22 Jan 2023 06:24:50 GMT",
//   "__online__": "yes",
//   "__friendly_name__": "bedroom-temp-sensor"
// }
//
const BaseAccessory = require('../base-accessory');

const LOW_BATTERY_THRESHOLD = 10;

class SwitchbotTempSensorAccessory extends BaseAccessory {
    #accessory_info_service;
    #temp_sensor_service;
    #humidity_sensor_service;
    #battery_service;
    constructor(platform, accessory, homebridge_log, mqtt_client) {
        super(platform, accessory, homebridge_log, mqtt_client);

        this.#accessory_info_service = this.accessory.getService(this.platform.Service.AccessoryInformation);
        this.#accessory_info_service
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Switchbot')
            .setCharacteristic(this.platform.Characteristic.Model, 'MeterTH')
            .setCharacteristic(this.platform.Characteristic.Name, 'Switchbot温度センサー');

        this.#battery_service = this.accessory.getService('Battery Level') ||
            this.accessory.addService(this.platform.Service.Battery, 'Battery Level', 'battery-level');
        this.#battery_service.setCharacteristic(this.platform.Characteristic.Name, 'Battery Level');
        this.#battery_service.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
            .onGet(this.get_battery_low.bind(this));
        this.#battery_service.getCharacteristic(this.platform.Characteristic.BatteryLevel)
            .onGet(this.get_battery_level.bind(this));

        this.#temp_sensor_service = this.accessory.getService('Temp Sensor') ||
            this.accessory.addService(this.platform.Service.TemperatureSensor, 'Temp Sensor', 'temp-sensor');
        this.#temp_sensor_service.setCharacteristic(this.platform.Characteristic.Name, 'Temperature Sensor');
        this.#temp_sensor_service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
            .onGet(this.get_temp.bind(this));

        this.#humidity_sensor_service = this.accessory.getService('Humidity Sensor') ||
            this.accessory.addService(this.platform.Service.HumiditySensor, 'Humidity Sensor', 'humidity-sensor');
        this.#humidity_sensor_service.setCharacteristic(this.platform.Characteristic.Name, 'Humidity Sensor');
        this.#humidity_sensor_service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
            .onGet(this.get_humidity.bind(this));
    }
    async get_battery_low() {
        const battery_percent = this.state?.serviceData?.battery;
        if (typeof battery_percent === 'undefined') {
            this.say('warn', 'HAP requested get_battery_low but we got none to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
            return;
        }
        return battery_percent < LOW_BATTERY_THRESHOLD;
    }
    async get_battery_level() {
        const battery_percent = this.state?.serviceData?.battery;
        if (typeof battery_percent === 'undefined') {
            this.say('warn', 'HAP requested get_battery_level but we got none to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return battery_percent;
    }
    async get_temp() {
        const temp_c = this.state?.serviceData?.temperature?.c;
        if (typeof temp_c === 'undefined') {
            this.say('warn', 'HAP requested get_temp but we got none to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return temp_c;
    }
    async get_humidity() {
        const relative_humid = this.state?.serviceData?.humidity;
        if (typeof relative_humid === 'undefined') {
            this.say.warn('HAP requested get_humidity but we got none to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return relative_humid;
    }
    /**
     * to be called from cocoa-home-platform when an mqtt message is received
     * this function tells cocoa-home-platform whether this message represents a
     * ToshibaCeilingLightAccessory
     */
    static identify(topic, message_obj) {
        // when an "switchbots/+" message arrives, provide positive identification
        if (message_obj?.serviceData?.modelName === 'WoSensorTH') {
            const mqtt_id = topic.match(/\/(.*)$/)?.[1];
            return {mqtt_id};
        }
        // not an WoSensorTH; return nothing
    }

    received_mqtt_message(msg){
        super.received_mqtt_message(msg);

        const serial_num = msg?.id ?? null;
        if (serial_num !== null && typeof serial_num !== 'undefined') {
            this.#accessory_info_service.setCharacteristic(
                this.platform.Characteristic.SerialNumber, `${this.mqtt_id}/${serial_num}`);
        }
        const incoming_temp_c = msg?.serviceData?.temperature?.c ?? null;
        if (incoming_temp_c !== null && typeof incoming_temp_c !== 'undefined') {
            this.#temp_sensor_service.updateCharacteristic(
                this.platform.Characteristic.CurrentTemperature, incoming_temp_c);
        }
        const incoming_humidity = msg?.serviceData?.humidity ?? null;
        if (incoming_humidity !== null && typeof incoming_humidity !== 'undefined') {
            this.#temp_sensor_service.updateCharacteristic(
                this.platform.Characteristic.CurrentRelativeHumidity, incoming_humidity);
        }
        const incoming_battery = msg?.serviceData?.battery ?? null;
        if (incoming_battery !== null && typeof incoming_battery !== 'undefined') {
            this.#battery_service.updateCharacteristic(
                this.platform.Characteristic.BatteryLevel, incoming_battery);

            const low_battery = incoming_battery < LOW_BATTERY_THRESHOLD;
            this.#battery_service.updateCharacteristic(
                this.platform.Characteristic.StatusLowBattery, low_battery);
        }
    }
}

module.exports = {
    accessory_name: 'switchbot-temp-sensor',
    cls: SwitchbotTempSensorAccessory,
};
