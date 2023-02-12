const BaseAccessory = require('../base-accessory');

//
// irkit2mqtt National aircond with remote controller A75C3026
// translates irkit mqtt mesasages into HAP appliance properties and vice versa
//
// status update: irkit2mqtt/AIRCOND_NAME
// body :         {state:STATE_OBJ, model:"A75C3026", ...} where STATE_OBJ is the following
//
// command :      irkit2mqtt/AIRCOND_NAME/set
// body :         STATE_OBJ
//
// STATE_OBJ :
//
// {
//   "model": "A75C3026",
//   "appliance_type": "air-conditioner",
//   "state": {
//   "power": false,
//     "temp": 20,
//     "mode": "warm",
//     "timer": "unset",
//     "direction": "swing",
//     "strength": "auto",
//     "internal_dry": true,
//     "odour_reduction": true
// }
//
// need additional config:
//
//   "subscribe": [
//      "sb2m/SENSOR_NAME"
//      ],
//
//   "accessory_config" : {
//      "national-aircond" : {
//        "AIRCOND_MQTT_ID": {
//          current_temp_topic: "sb2m/SENSOR_NAME",
//          current_temp_object_path: "serviceData.temperature.c",
//        }
//      }
//    }

class NationalAircondAccessory extends BaseAccessory {
  #heater_cooler_service;
  #thermostat_service;
  #dry_switch_service;
  #object_path;

  constructor({platform, accessory, homebridge_log, mqtt_client, accessory_config, object_path}) {
    super({platform, accessory, homebridge_log, mqtt_client, accessory_config});
    this.#object_path = object_path;

    this.accessory.getService(this.platform.Service.AccessoryInformation)
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'National')
      .setCharacteristic(this.platform.Characteristic.Model, 'A75C3026')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.mqtt_id);

    this.#dry_switch_service = this.accessory.getService('Dehumidifier') ||
      this.accessory.addService(this.platform.Service.Switch, 'Dehumidifier', 'dehumidifier-switch');
    this.#dry_switch_service.setCharacteristic(this.platform.Characteristic.Name, '乾燥');
    this.#dry_switch_service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.dry_switch_get_on.bind(this))
      .onSet(this.dry_switch_set_on.bind(this));

    //
    // Thermostat Service
    // https://developers.homebridge.io/#/service/Thermostat
    //
    this.#thermostat_service = this.accessory.getService('Thermostat') ||
      this.accessory.addService(this.platform.Service.Thermostat, 'Thermostat', 'thermostat');
    this.#thermostat_service.setCharacteristic(this.platform.Characteristic.Name, '温度調節');

    this.#thermostat_service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.thermostat_get_current_heating_cooling_state.bind(this));
    // ^ this.platform.Characteristic.CurrentHeatingCoolingState.{OFF|HEAT|COOL}

    this.#thermostat_service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.thermostat_get_target_heating_cooling_state.bind(this))
      .onSet(this.thermostat_set_target_heating_cooling_state.bind(this));
    // ^ this.platform.Characteristic.TargetHeatingCoolingState.{OFF|HEAT|COOL|AUTO}

    this.#thermostat_service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.common_get_current_temperature.bind(this));

    this.#thermostat_service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.thermostat_get_target_temperatore.bind(this))
      .onSet(this.thermostat_set_target_temperature.bind(this));

    this.#thermostat_service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.common_get_temperature_display_units.bind(this));
    // ^ this.platform.Characteristic.TemperatureDisplayUnits.{CELSIUS|FAHRENHEIT}

    //
    // Heater Cooler Service
    // https://developers.homebridge.io/#/service/HeaterCooler
    //
    this.#heater_cooler_service = this.accessory.getService('Heater cooler') ||
      this.accessory.addService(this.platform.Service.HeaterCooler, 'Heater cooler', 'heater-cooler');
    this.#heater_cooler_service.setCharacteristic(this.platform.Characteristic.Name, '空調');

    this.#heater_cooler_service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.heater_cooler_get_active.bind(this))
      .onSet(this.heater_cooler_set_active.bind(this));
    // ^ this.platform.Characteristic.Active.{INACTIVE,ACTIVE}

    this.#heater_cooler_service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.heater_cooler_get_current_heater_cooler_state.bind(this));
    // ^ this.platform.Characteristic.CurrentHeaterCoolerState.{INACTIVE|IDLE|HEATING|COOLING}

    this.#heater_cooler_service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onGet(this.heater_cooler_get_target_heater_cooler_state.bind(this))
      .onSet(this.heater_cooler_set_target_heater_cooler_state.bind(this));
    // ^ this.platform.Characteristic.TargetHeaterCoolerState.{AUTO|HEAT|COOL}

    this.#heater_cooler_service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.common_get_current_temperature.bind(this));

    this.#heater_cooler_service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(this.heater_cooler_get_rotation_speed.bind(this))
      .onSet(this.heater_cooler_set_rotation_speed.bind(this));
    // ^ 0..100 (MAX)

    this.#heater_cooler_service.getCharacteristic(this.platform.Characteristic.SwingMode)
      .onGet(this.heater_cooler_get_swing_mode.bind(this))
      .onSet(this.heater_cooler_set_swing_mode.bind(this));
    // ^ this.platform.Characteristic.SwingMode.{SWING_DISABLED|SWING_ENABLED}

    this.#heater_cooler_service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.common_get_temperature_display_units.bind(this));
    // ^ this.platform.Characteristic.TemperatureDisplayUnits.{CELSIUS|FAHRENHEIT}

    this.say('creating aircond', {mqtt_id : this.mqtt_id, accessory_config});
  }

  common_get_current_temperature() {
    return Math.round(this.state?.temp);
  }

  common_get_temperature_display_units() {
    return this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
  }

  thermostat_get_target_temperatore() {
    return Math.round(this.state?.temp);
  }

  thermostat_set_target_temperature(temp) {
    this.say('thermostat_set_target_temperature : temp', temp);
    this.set_states({temp : Math.round(temp)});
  }

  thermostat_get_current_heating_cooling_state() {
    // this.platform.Characteristic.CurrentHeatingCoolingState.{OFF|HEAT|COOL}
    if ( ! this.state?.power ) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    }
    return {
      auto : this.platform.Characteristic.CurrentHeatingCoolingState.AUTO,
      cool : this.platform.Characteristic.CurrentHeatingCoolingState.COOL,
      warm : this.platform.Characteristic.CurrentHeatingCoolingState.HEAT,
    }[this.state?.mode];
  }

  thermostat_get_target_heating_cooling_state() {
    return this.thermostat_get_current_heating_cooling_state();
  }

  thermostat_set_target_heating_cooling_state(cooling_state) {
    // ^ this.platform.Characteristic.TargetHeatingCoolingState.{OFF|HEAT|COOL|AUTO}
    const power_obj =
      cooling_state === this.platform.Characteristic.TargetHeatingCoolingState.OFF
        ? {power : false}
        : {power : true};
    const mode_obj = {
      [this.platform.Characteristic.CurrentHeatingCoolingState.COOL] : {mode : 'cool'},
      [this.platform.Characteristic.CurrentHeatingCoolingState.HEAT] : {mode : 'warm'},
      [this.platform.Characteristic.CurrentHeatingCoolingState.AUTO] : {mode : 'auto'},
    }[cooling_state] ?? {};
    const final_state = Object.assign({}, power_obj, mode_obj);
    this.say('thermostat_set_target_heating_cooling_state : final_state', final_state);
    this.set_states(final_state);
  }

  heater_cooler_get_active() {
    // ^ this.platform.Characteristic.Active.{INACTIVE,ACTIVE}
    return this.state?.power;
  }

  heater_cooler_set_active(active) {
    // ^ this.platform.Characteristic.Active.{INACTIVE,ACTIVE}
    this.set_states({power : active === this.platform.Characteristic.Active.ACTIVE});
  }

  heater_cooler_get_current_heater_cooler_state() {
    // ^ this.platform.Characteristic.CurrentHeaterCoolerState.{INACTIVE|IDLE|HEATING|COOLING}
    if ( ! this.state?.power ) {
      return this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    }
    return {
      ion : this.platform.Characteristic.CurrentHeaterCoolerState.COOLING,
      cool : this.platform.Characteristic.CurrentHeaterCoolerState.COOLING,
      warm : this.platform.Characteristic.CurrentHeaterCoolerState.HEATING,
    }[this.state?.mode];
  }

  heater_cooler_get_target_heater_cooler_state() {
    // ^ this.platform.Characteristic.TargetHeaterCoolerState.{AUTO|HEAT|COOL}
    if ( ! this.state?.power ) {
      return;
    }
    return {
      ion : this.platform.Characteristic.TargetHeaterCoolerState.COOL,
      cool : this.platform.Characteristic.TargetHeaterCoolerState.COOL,
      warm : this.platform.Characteristic.TargetHeaterCoolerState.HEAT,
    }[this.state?.mode];
  }

  heater_cooler_set_target_heater_cooler_state(target_state) {
    // ^ this.platform.Characteristic.TargetHeaterCoolerState.{AUTO|HEAT|COOL}
    const power_obj = {power : true};
    const mode_obj = {
      [this.platform.Characteristic.TargetHeaterCoolerState.COOL] : {mode : 'cool'},
      [this.platform.Characteristic.TargetHeaterCoolerState.HEAT] : {mode : 'warm'},
      [this.platform.Characteristic.TargetHeaterCoolerState.AUTO] : {},
    }[target_state] ?? {};
    const final_state = Object.assign({}, power_obj, mode_obj);
    this.set_states(final_state);
  }

  #get_hap_rotation_speed(mqtt_strength) {
    // translate national-ac strength value (1,2,3,4,powerful,auto,quiet) to numerical HAP rotation speed value : 0..100
    return {
      auto : 0, // TODO : setting Speed=0 turns on the device; doesn't work
      quiet : 16.7,
      1 : 33.2,
      2 : 49.8,
      3 : 66.4,
      4 : 83,
      'powerful' : 100,
    }[mqtt_strength];
  }

  heater_cooler_get_rotation_speed() {
    // return 0..100
    const strength = this.state?.strength;
    if ( ! strength ) {
      return;
    }
    return this.#get_hap_rotation_speed(strength);
  }

  heater_cooler_set_rotation_speed(speed) {
    let strength;
    // receives 0..100
    if ( speed === 0 ) {
      strength = 'auto'; // TODO : setting RotationSpeed=0 in HomeKit turns the device off! doesn't go to auto as we want here
    }
    const strength_scaled = Math.round(this.constructor.convert_range(speed, [1, 100], [1, 6]));
    if ( strength_scaled === 1 ) {
      // 1 ==> 'quiet'
      strength = 'quiet';
    } else if ( strength_scaled === 6 ) {
      // 6 ==> 'powerful'
      strength = 'powerful';
    } else {
      // (strength_scaled) 2 ==> (mqtt) 1
      // 3 ==> 2
      // 4 ==> 3
      // 5 ==> 4
      strength = strength_scaled - 1;
    }
    this.say(`💨 set strength: HAP:${speed} --> mqtt:${strength}`);
    this.set_states({strength});
  }

  #get_hap_swing_mode(mqtt_direction) {
    return {
      swing : this.platform.Characteristic.SwingMode.SWING_ENABLED,
      1 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
      2 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
      3 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
      4 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
      5 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
    }[mqtt_direction];
  }

  heater_cooler_get_swing_mode() {
    // ^ this.platform.Characteristic.SwingMode.{SWING_DISABLED|SWING_ENABLED}
    if ( ! this.state?.direction ) {
      return;
    }

    return this.#get_hap_swing_mode(this.state.direction);
  }

  #direction_before_swing;

  heater_cooler_set_swing_mode(swing_mode) {
    // ^ this.platform.Characteristic.SwingMode.{SWING_DISABLED|SWING_ENABLED}
    if ( swing_mode === this.platform.Characteristic.SwingMode.SWING_ENABLED ) {
      this.#direction_before_swing = this.states?.direction;
      this.set_states({direction : 'swing'});
    } else if ( swing_mode === this.platform.Characteristic.SwingMode.SWING_DISABLED ) {
      // when we disable swing, revert to the previous direction value; otherwise use "direction=1"
      const previous_dir = this.#direction_before_swing ?? 1;
      this.set_states({direction : previous_dir});
    }
  }

  dry_switch_get_on() {
    // return bool
    return this.state?.mode === 'dry';
  }

  dry_switch_set_on(bool) {
    this.set_states(bool
      ? {power : true, mode : 'dry'}
      : {power : false});
  }

  /**
   * to be called from cocoa-home-platform when an mqtt message is received
   * this function tells cocoa-home-platform whether this message represents a
   * ToshibaCeilingLightAccessory
   */
  static identify(topic, message_obj) {
    // when an "irkit2mqtt/+" message arrives, provide positive identification
    if ( message_obj?.model === 'A75C3026' ) {
      const mqtt_id = topic.match(/\/(.*)$/)?.[1];
      return {mqtt_id};
    }
  }

  #current_temp;

  received_aux_message(topic, message_obj) {
    const current_temp_topic = this.config()?.current_temp_topic;
    const current_temp_object_path = this.config()?.current_temp_object_path;
    if ( current_temp_topic && topic === current_temp_topic ) {
      const round_half = (num) => Math.round(num * 2) / 2;
      this.#current_temp = current_temp_object_path
        ? this.#object_path.get(message_obj, current_temp_object_path)
        : typeof message_obj === 'number' ? message_obj : null;
      if ( typeof this.#current_temp === 'number' ) {
        this.#current_temp = round_half(this.#current_temp);
        // this.say('🌡️', this.mqtt_id, this.#current_temp);
        this.#set_hap_temps(this.#current_temp, this.#current_temp);
        return true;
      }
    }
  }

  #set_hap_temps(hc_cur_temp, th_cur_temp, th_tar_temp = null) {
    this.say(`[${this.mqtt_id}] set_hap_temps :`, {hc_cur_temp, th_cur_temp, th_tar_temp});
    this.#heater_cooler_service.updateCharacteristic(
      this.platform.Characteristic.CurrentTemperature, hc_cur_temp);
    this.#thermostat_service.updateCharacteristic(
      this.platform.Characteristic.CurrentTemperature, th_cur_temp);
    if ( typeof th_tar_temp === 'number' ) {
      this.#thermostat_service.updateCharacteristic(
        this.platform.Characteristic.TargetTemperature, th_tar_temp);
    }
  }

  received_mqtt_message(msg) {
    super.received_mqtt_message(msg);
    this.say(`[${this.mqtt_id}] ❄️ aircond message received :`, msg);

    const set_hap_states =
      (hc_active, hc_cur_state, hc_tar_state, th_cur_state, th_tar_state) => {
        this.say('set_hap_states :', {hc_active, hc_cur_state, hc_tar_state, th_cur_state, th_tar_state});
        this.#heater_cooler_service.updateCharacteristic(
          this.platform.Characteristic.Active,
          this.platform.Characteristic.Active[hc_active]);
        this.#heater_cooler_service.updateCharacteristic(
          this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState[hc_cur_state]);
        this.#heater_cooler_service.updateCharacteristic(
          this.platform.Characteristic.TargetHeaterCoolerState,
          this.platform.Characteristic.TargetHeaterCoolerState[hc_tar_state]);
        this.#thermostat_service.updateCharacteristic(
          this.platform.Characteristic.CurrentHeatingCoolingState,
          this.platform.Characteristic.CurrentHeatingCoolingState[th_cur_state]);
        this.#thermostat_service.updateCharacteristic(
          this.platform.Characteristic.TargetHeatingCoolingState,
          this.platform.Characteristic.TargetHeatingCoolingState[th_tar_state]);
      };

    const set_hap_sw = (dry) => {
      this.say(`[${this.mqtt_id}] set_hap_sw :`, {dry});
      this.#dry_switch_service.updateCharacteristic(
        this.platform.Characteristic.On, dry);
    };

    if ( msg?.state?.power === false ) {
      set_hap_sw(false);
      set_hap_states('INACTIVE', 'INACTIVE', 'AUTO', 'OFF', 'OFF');
      //  ┏━━━━━━━━━━━━━┛
      // see : HeaterCooler : https://developers.homebridge.io/#/service/HeaterCooler
      // and : Thermostat : https://developers.homebridge.io/#/service/Thermostat
    } else {
      // 運転モード
      switch (msg?.state?.mode) {
        case 'cool':
          set_hap_sw(false);
          set_hap_states('ACTIVE', 'COOLING', 'COOL', 'COOL', 'COOL');
          //  ┏━━━━━━━━━━━━━┛
          // see : HeaterCooler : https://developers.homebridge.io/#/service/HeaterCooler
          // and : Thermostat : https://developers.homebridge.io/#/service/Thermostat
          break;
        case 'warm':
          set_hap_sw(false);
          set_hap_states('ACTIVE', 'HEATING', 'HEAT', 'HEAT', 'HEAT');
          break;
        case 'dry':
          set_hap_sw(true);
          set_hap_states('INACTIVE', 'INACTIVE', 'AUTO', 'OFF', 'OFF');
          break;
        case 'auto':
          set_hap_sw(false);
          set_hap_states('ACTIVE',
            'IDLE', // only accepts HEATING COOLING IDLE INACTIVE : https://developers.homebridge.io/#/characteristic/CurrentHeaterCoolerState
            'AUTO',
            'OFF', // only accepts HEATING and COOLING : https://developers.homebridge.io/#/characteristic/CurrentHeatingCoolingState
            'AUTO');
          break;
        default:
          set_hap_sw(false);
          set_hap_states('INACTIVE', 'INACTIVE', 'AUTO', 'OFF', 'OFF');
          this.say('warn', 'unknown mode :', msg?.state?.mode, '; msg:', msg);
      }
      // 風量
      if ( 'strength' in (msg?.state ?? {}) ) {
        const hap_rotation_speed = this.#get_hap_rotation_speed(msg.state.strength);
        this.#heater_cooler_service.updateCharacteristic(
          this.platform.Characteristic.RotationSpeed, hap_rotation_speed);
      }
      // 風向スイング？
      if ( 'direction' in (msg?.state ?? {}) ) {
        this.#get_hap_swing_mode(msg.direction);
      }
      // 温度
      if ( 'temp' in (msg?.state ?? {}) ) {
        const temp = Math.round(msg.state.temp);
        this.#set_hap_temps(this.#current_temp ?? temp, this.#current_temp ?? temp, temp);
      }
    }

  }
}

module.exports = {
  accessory_name : 'National-aircond',
  cls : NationalAircondAccessory,
};

