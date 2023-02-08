const BaseAccessory = require('../base-accessory');

//
// irkit2mqtt sharp aircond with remote controller A909JB
//
// status update: irkit2mqtt/AIRCOND_NAME
// body :         {state:STATE_OBJ, model:"A909JB", ...} where STATE_OBJ is the following
//
// command :      irkit2mqtt/AIRCOND_NAME/set
// body :         STATE_OBJ
//
// STATE_OBJ :
//
// {
//     "power": false,
//     "temp": 25,
//     "mode": "cool",
//     "timer": "unset",
//     "timer_hours": 0,
//     "direction": "auto",
//     "strength": "auto",
//     "internal_clean": true,
//     "ion": true,
//     "power_saving": false,
//     "simple": true
// }
//
class SharpAircondAccessory extends BaseAccessory {
  #heater_cooler_service;
  #thermostat_service;
  #dry_switch_service;
  #indoor_drying_switch_service;

  constructor(platform, accessory, homebridge_log, mqtt_client) {
    super(platform, accessory, homebridge_log, mqtt_client, '/set');

    this.accessory.getService(this.platform.Service.AccessoryInformation)
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Sharp')
      .setCharacteristic(this.platform.Characteristic.Model, 'A909JB')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.mqtt_id);

    this.#dry_switch_service = this.accessory.getService('Dehumidifier') ||
      this.accessory.addService(this.platform.Service.Switch, 'Dehumidifier', 'dehumidifier-switch');
    this.#dry_switch_service.setCharacteristic(this.platform.Characteristic.Name, '乾燥');
    this.#dry_switch_service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.dry_switch_get_on.bind(this))
      .onSet(this.dry_switch_set_on.bind(this));

    this.#indoor_drying_switch_service = this.accessory.getService('Indoor Drying') ||
      this.accessory.addService(this.platform.Service.Switch, 'Indoor Drying', 'indoor-drying-switch');
    this.#indoor_drying_switch_service.setCharacteristic(this.platform.Characteristic.Name, '部屋干し');
    this.#indoor_drying_switch_service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.indoor_drying_switch_get_on.bind(this))
      .onSet(this.indoor_drying_switch_set_on.bind(this));

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
      .onSet(this.thermostat_set_target_temperatore.bind(this));

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

  thermostat_set_target_temperatore(temp) {
    this.set_states({temp : Math.round(temp)});
  }

  thermostat_get_current_heating_cooling_state() {
    // this.platform.Characteristic.CurrentHeatingCoolingState.{OFF|HEAT|COOL}
    if ( ! this.state?.power ) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    }
    return {
      ion : this.platform.Characteristic.CurrentHeatingCoolingState.COOL,
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
      [this.platform.Characteristic.CurrentHeatingCoolingState.AUTO] : {},
    }[cooling_state] ?? {};
    const final_state = Object.assign({}, power_obj, mode_obj);
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
    return {
      auto : 0,
      1 : 25,
      2 : 50,
      3 : 75,
      4 : 100,
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
      strength = 'auto';
    }
    strength = Math.round(this.constructor.convert_range(speed, [1, 100], [1, 4]));
    this.say(`💨 set strength: HAP:${speed} --> mqtt:${strength}`);
    this.set_states({strength});
  }

  #get_hap_swing_mode(mqtt_direction) {
    return {
      swing : this.platform.Characteristic.SwingMode.SWING_ENABLED,
      auto : this.platform.Characteristic.SwingMode.SWING_DISABLED,
      1 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
      2 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
      3 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
      4 : this.platform.Characteristic.SwingMode.SWING_DISABLED,
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
      const previous_dir = this.#direction_before_swing ?? 'auto';
      this.set_states({direction : previous_dir});
    }
  }

  indoor_drying_switch_get_on() {
    // return bool
    return this.state?.mode === 'indoor_drying';
  }

  indoor_drying_switch_set_on(bool) {
    this.set_states(bool
      ? {power : true, mode : 'indoor_drying'}
      : {power : false});
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
    if ( message_obj?.model === 'A909JB' ) {
      const mqtt_id = topic.match(/\/(.*)$/)?.[1];
      return {mqtt_id};
    }
  }

  received_mqtt_message(msg) {
    super.received_mqtt_message(msg);
    this.say('❄️  aircond message received :', msg);

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
    const set_hap_temps = (hc_cur_temp, th_cur_temp, th_tar_temp) => {
      this.say('set_hap_temps :', {hc_cur_temp, th_cur_temp, th_tar_temp});
      this.#heater_cooler_service.updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature, hc_cur_temp);
      this.#thermostat_service.updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature, th_cur_temp);
      this.#thermostat_service.updateCharacteristic(
        this.platform.Characteristic.TargetTemperature, th_tar_temp);
    };
    const set_hap_sw = (dry, indoor_drying) => {
      this.say('set_hap_sw :', {dry, indoor_drying});
      this.#dry_switch_service.updateCharacteristic(
        this.platform.Characteristic.On, dry);
      this.#indoor_drying_switch_service.updateCharacteristic(
        this.platform.Characteristic.On, indoor_drying);
    };

    if ( msg?.state?.power === false ) {
      set_hap_states('INACTIVE', 'INACTIVE', 'AUTO', 'OFF', 'OFF');
      //  ┏━━━━━━━━━━━━━┛
      // see : HeaterCooler : https://developers.homebridge.io/#/service/HeaterCooler
      // and : Thermostat : https://developers.homebridge.io/#/service/Thermostat
    } else {
      // 運転モード
      switch (msg?.state?.mode) {
        case 'ion':
        case 'cool':
          set_hap_sw(false, false);
          set_hap_states('ACTIVE', 'COOLING', 'COOL', 'COOL', 'COOL');
          //  ┏━━━━━━━━━━━━━┛
          // see : HeaterCooler : https://developers.homebridge.io/#/service/HeaterCooler
          // and : Thermostat : https://developers.homebridge.io/#/service/Thermostat
          break;
        case 'warm':
          set_hap_sw(false, false);
          set_hap_states('ACTIVE', 'HEATING', 'HEAT', 'HEAT', 'HEAT');
          break;
        case 'dry':
          set_hap_sw(true, false);
          set_hap_states('INACTIVE', 'INACTIVE', 'AUTO', 'OFF', 'OFF');
          break;
        case 'indoor_drying':
          set_hap_sw(false, true);
          set_hap_states('INACTIVE', 'INACTIVE', 'AUTO', 'OFF', 'OFF');
          break;
        default:
          set_hap_sw(false, false);
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
        this.#heater_cooler_service.updateCharacteristic(
          this.platform.Characteristic.CurrentTemperature, temp);
        this.#thermostat_service.updateCharacteristic(
          this.platform.Characteristic.CurrentTemperature, temp);
        this.#thermostat_service.updateCharacteristic(
          this.platform.Characteristic.TargetTemperature, temp);
      }
    }

  }
}

module.exports = {
  accessory_name : 'sharp-aircond',
  cls : SharpAircondAccessory,
};

