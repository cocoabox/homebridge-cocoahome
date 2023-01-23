const BaseAccessory = require('../base-accessory');

class ToshibaCeilingLightAccessory extends BaseAccessory {
    #light_normal_service;
    #light_theater_service;
    #light_relax_service;
    #light_benkyo_service;
    #light_kirei_service;
    #light_color_service;
    #light_oyasumi_service;
    #light_nightlight_service;
    constructor(platform, accessory, homebridge_log, mqtt_client) {
        super(platform, accessory, homebridge_log, mqtt_client, '/set');

        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Toshiba')
            .setCharacteristic(this.platform.Characteristic.Model, 'FRC205T')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.mqtt_id);

        // see : https://developers.homebridge.io/#/service/Lightbulb<D-[>
        this.#light_normal_service = this.accessory.getService('Normal') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Normal', 'normal');
        this.#light_normal_service.setCharacteristic(
            this.platform.Characteristic.Name, '全光');
        this.#light_normal_service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.normal_on_get.bind(this)) 
            .onSet(this.normal_on_set.bind(this));
        this.#light_normal_service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onGet(this.common_brightness_get.bind(this)) 
            .onSet(this.common_brightness_set.bind(this));
        this.#light_normal_service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
            .onGet(this.normal_color_temperature_get.bind(this)) 
            .onSet(this.normal_color_temperature_set.bind(this));
        this.#light_normal_service.getCharacteristic(this.platform.Characteristic.Saturation)
            .onGet(this.normal_saturation_get.bind(this)) 
            .onSet(this.normal_saturation_set.bind(this));
        this.#light_normal_service.getCharacteristic(this.platform.Characteristic.Hue)
            .onGet(this.normal_hue_get.bind(this)) 
            .onSet(this.normal_hue_set.bind(this));

        this.#light_theater_service = this.accessory.getService('Theater') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Theater', 'theater');
        this.#light_theater_service.setCharacteristic(
            this.platform.Characteristic.Name, 'シアター');
        this.#light_theater_service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.theater_on_get.bind(this)) 
            .onSet(this.theater_on_set.bind(this));
        this.#light_theater_service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onGet(this.common_brightness_get.bind(this)) 
            .onSet(this.common_brightness_set.bind(this));

        this.#light_relax_service = this.accessory.getService('Relax') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Relax', 'relax');
        this.#light_relax_service.setCharacteristic(
            this.platform.Characteristic.Name, 'くつろぎ');
        this.#light_relax_service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.relax_on_get.bind(this)) 
            .onSet(this.relax_on_set.bind(this));
        this.#light_relax_service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onGet(this.common_brightness_get.bind(this)) 
            .onSet(this.common_brightness_set.bind(this));

        this.#light_benkyo_service = this.accessory.getService('Benkyo') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Benkyo', 'benkyo');
        this.#light_benkyo_service.setCharacteristic(
            this.platform.Characteristic.Name, '勉強');
        this.#light_benkyo_service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.benkyo_on_get.bind(this)) 
            .onSet(this.benkyo_on_set.bind(this));
        this.#light_benkyo_service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onGet(this.common_brightness_get.bind(this)) 
            .onSet(this.common_brightness_set.bind(this));

        this.#light_kirei_service = this.accessory.getService('Kirei') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Kirei', 'kirei');
        this.#light_kirei_service.setCharacteristic(
            this.platform.Characteristic.Name, 'キレイ');
        this.#light_kirei_service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.kirei_on_get.bind(this)) 
            .onSet(this.kirei_on_set.bind(this));
        this.#light_kirei_service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onGet(this.common_brightness_get.bind(this)) 
            .onSet(this.common_brightness_set.bind(this));

        this.#light_color_service = this.accessory.getService('Color') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Color', 'color');
        this.#light_color_service.setCharacteristic(
            this.platform.Characteristic.Name, 'カラー');
        this.#light_color_service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.color_on_get.bind(this)) 
            .onSet(this.color_on_set.bind(this));

        this.#light_oyasumi_service = this.accessory.getService('Oyasumi') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Oyasumi', 'oyasumi');
        this.#light_oyasumi_service.setCharacteristic(
            this.platform.Characteristic.Name, 'おやすみアシスト');
        this.#light_oyasumi_service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.oyasumi_on_get.bind(this)) 
            .onSet(this.oyasumi_on_set.bind(this));
        this.#light_oyasumi_service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onGet(this.common_brightness_get.bind(this)) 
            .onSet(this.common_brightness_set.bind(this));

        this.#light_nightlight_service = this.accessory.getService('Night light') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Night light', 'nightlight');
        this.#light_nightlight_service.setCharacteristic(
            this.platform.Characteristic.Name, '常夜灯');
        this.#light_nightlight_service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.nightlight_on_get.bind(this)) 
            .onSet(this.nightlight_on_set.bind(this));
        this.#light_nightlight_service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onGet(this.common_brightness_get.bind(this)) 
            .onSet(this.common_brightness_set.bind(this));
    }
    static #brightness_range(mode) {
        switch (mode) {
            case 'off': return [0, 20];
            case 'normal': return [0, 20];
            case 'theater':
            case 'benkyo':
            case 'relax':
            case 'oyasumi-assist':
            case 'kirei': return [1, 10];
            case 'night-light':  return [1, 6];
            default: return [0, 20];
        }
    }
    static #color_temp_hap2mqtt(hap_ct) {
        return Math.round(20 - this.convert_range(hap_ct, [140,500], [1,20]) + 1);
    }

    static #color_temp_mqtt2hap(mqtt_ct) {
        return Math.round(500 - this.convert_range(mqtt_ct, [1,20], [140,500]) + 140);
    }
    /**
     * 全光 ON/OFF getter
     */
    async normal_on_get() {
        const mode = this.state?.mode;
        if (typeof mode === 'undefined') {
            this.say('warn', 'HAP requested normal_on_get but we got no "mode" to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return mode === 'normal';
    }
    /**
     * 全光 ON/OFF setter
     */
    async normal_on_set(val) {
        if (val) this.set_states({mode: 'normal'});
        else this.set_states({mode: 'off'});
    }
    /**
     * シアター ON/OFF getter
     */
    async theater_on_get() {
        const mode = this.state?.mode;
        if (typeof mode === 'undefined') {
            this.say('warn', 'HAP requested theater_on_get but we got no "mode" to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return mode === 'theater';
    }
    /**
     * シアター ON/OFF setter
     */
    async theater_on_set(val) {
        if (val) this.set_states({mode: 'theater'});
        else this.set_states({mode: 'off'});
    }
    /**
     * くつろぎ ON/OFF getter
     */
    async relax_on_get() {
        const mode = this.state?.mode;
        if (typeof mode === 'undefined') {
            this.say('warn', 'HAP requested relax_on_get but we got no "mode" to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return mode === 'relax';
    }
    /**
     * くつろぎ ON/OFF setter
     */
    async relax_on_set(val) {
        if (val) this.set_states({mode: 'relax'});
        else this.set_states({mode: 'off'});
    }
    /**
     * 勉強 ON/OFF getter
     */
    async benkyo_on_get() {
        const mode = this.state?.mode;
        if (typeof mode === 'undefined') {
            this.say('warn', 'HAP requested benkyo_on_get but we got no "mode" to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return mode === 'benkyo';
    }
    /**
     * 勉強 ON/OFF setter
     */
    async benkyo_on_set(val) {
        if (val) this.set_states({mode: 'benkyo'});
        else this.set_states({mode: 'off'});
    }
    /**
     * キレイ ON/OFF getter
     */
    async kirei_on_get() {
        const mode = this.state?.mode;
        if (typeof mode === 'undefined') {
            this.say('warn', 'HAP requested kirei_on_get but we got no "mode" to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return mode === 'kirei';
    }
    /**
     * キレイ ON/OFF setter
     */
    async kirei_on_set(val) {
        if (val) this.set_states({mode: 'kirei'});
        else this.set_states({mode: 'off'});
    }
    /**
     * カラー ON/OFF getter
     */
    async color_on_get() {
        const mode = this.state?.mode;
        if (typeof mode === 'undefined') {
            this.say('warn', 'HAP requested color_on_get but we got no "mode" to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return mode === 'color';
    }
    /**
     * カラー ON/OFF setter
     */
    async color_on_set(val) {
        if (val) this.set_states({mode: 'color'});
        else this.set_states({mode: 'off'});
    }
    /**
     * おやすみアシスト ON/OFF getter
     */
    async oyasumi_on_get() {
        const mode = this.state?.mode;
        if (typeof mode === 'undefined') {
            this.say('warn', 'HAP requested oyasumi_on_get but we got no "mode" to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return mode === 'oyasumi-assist';
    }
    /**
     * おやすみアシスト ON/OFF setter
     */
    async oyasumi_on_set(val) {
        if (val) this.set_states({mode: 'oyasumi-assist'});
        else this.set_states({mode: 'off'});
    }
    /**
     * 常夜灯 ON/OFF getter
     */
    async nightlight_on_get() {
        const mode = this.state?.mode;
        if (typeof mode === 'undefined') {
            this.say('warn', 'HAP requested nightlight_on_get but we got no "mode" to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        return mode === 'night-light';
    }
    /**
     * 常夜灯 ON/OFF setter
     */
    async nightlight_on_set(val) {
        if (val) this.set_states({mode: 'night-light'});
        else this.set_states({mode: 'off'});
    }
    /**
     * 共通明るさ getter
     * irkit2mqtt(toshiba-ceiling-lamp)のrange をHAP range(0..100)に変換する
     */
    async common_brightness_get() {
        const mqtt_brightness = this.state?.brightness;
        if (typeof mqtt_brightness === 'undefined') {
            this.say('warn', 'HAP requested common_brightness_get but we got none to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
        const mqtt_range = this.constructor.#brightness_range(this.state.mode);
        return this.constructor.convert_range(mqtt_brightness, mqtt_range, [0,100]);
    }

    /**
     * 共通明るさ setter
     * HAP range(0..100)をirkit2mqtt(toshiba-ceiling-lamp)のrange(現在のMode次第）をに変換する
     */
    async common_brightness_set(hap_val) {
        this.say('set brightness:', hap_val);
        const mqtt_range = this.constructor.#brightness_range(this.state.mode);
        const mqtt_brightness = Math.round(
            this.constructor.convert_range(hap_val, [0,100], mqtt_range));
        this.say('converted to MQTT brightness:', mqtt_brightness);
        this.set_states({brightness: mqtt_brightness});
    }
    static #rgb2hsl(r,g,b) {
        // see : https://lab.syncer.jp/Web/JavaScript/Snippet/68/
        r = r / 10;
        g = g / 10;
        b = b / 10;
        let max = Math.max( r, g, b ) ;
        let min = Math.min( r, g, b ) ;
        let diff = max - min ;
        let h = 0 ;
        let l = (max + min) / 2 ;
        let s = diff / ( 1 - ( Math.abs( max + min - 1 ) ) ) ;

        switch( min ) {
            case max :
                h = 0 ;
                break ;
            case r :
                h = (60 * ((b - g) / diff)) + 180 ;
                break ;
            case g :
                h = (60 * ((r - b) / diff)) + 300 ;
                break ;
            case b :
                h = (60 * ((g - r) / diff)) + 60 ;
                break ;
        }
        s = s * 100; // convert 0..1  --> 0..100
        l = l * 100; 
        return {h,s,l};
    }
    static #hsl2rgb ( h,s,l ) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n =>
            l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return {r:Math.round(10 * f(0)), g:Math.round(10 * f(8)), 
            b:Math.round(10* f(4))};
    }
    get_rgb_from_state() {
        const {r,g,b} = this.state;
        if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
            return {r:10,g:10,b:10};
        }
        else {
            return {r,g,b}
        }
    }
    async normal_saturation_get() {
        const {r,g,b} = this.get_rgb_from_state();
        if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
            const {h,s,l} = this.constructor.#rgb2hsl(r,g,b);
            return s;
        }
        else {
            this.say('warn', 'HAP requested normal_saturation_get but we got none to report ; replying undefined');
            this.say('info', 'current state is :', JSON.stringify(this.state));
        }
    }
    #set_saturation;
    #set_hue;
    #set_sat_hue_springload_timer; 

    #later_set_hue_saturation() {
        const sat_hue_sat_springload_sec = 1;
        if (this.#set_sat_hue_springload_timer) {
            clearTimeout(this.#set_sat_hue_springload_timer);
            this.#set_sat_hue_springload_timer = null;
        }
        this.#set_sat_hue_springload_timer = setTimeout(() => {
            this.#execute_set_hue_sat();
            this.#set_sat_hue_springload_timer = null;
        }, sat_hue_sat_springload_sec * 1000);

    }
    #execute_set_hue_sat() {
        if (typeof this.#set_hue !== 'number') {
            this.say('warn', 'unable to set color because #set_hue is undefined');
            return;
        }
        if (typeof this.#set_saturation !== 'number') {
            this.say('warn', 'unable to set color because #set_saturation is undefined');
            return;
        }        
        this.say(`🎨 execute set color; h=${this.#set_hue}, s=${this.#set_saturation}`);
        const new_rgb = this.constructor.#hsl2rgb(this.#set_hue, this.#set_saturation, 
            50); // assume 50% L (for most vivid color)
        this.say('debug', '🎨 new RGB :', new_rgb);
        this.set_states({
            mode: 'normal',
            brightness: 0,
            r: new_rgb.r,
            g: new_rgb.g,
            b: new_rgb.b,
        });
    }
    async normal_saturation_set(saturation) {
        // HAP calls set_set() and set_hue() in undefined order, wait for
        // both calls to complete
        this.#set_saturation = saturation;
        this.#later_set_hue_saturation(); 
    }
    async normal_hue_get() {
        const {r,g,b} = this.get_rgb_from_state();
        if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
            const {h,s,l} = this.constructor.#rgb2hsl(r,g,b);
            return h;
        }
        else {
            this.say('warn', 'HAP requested normal_saturation_get but we got none to report ; replying undefined');
        }
    }
    async normal_hue_set(hue) {
        // HAP calls set_set() and set_hue() in undefined order, wait for
        // both calls to complete
        this.#set_hue = hue;
        this.#later_set_hue_saturation(); 
    }
    /**
     * 色温度 getter
     */
    async normal_color_temperature_get() {
        const mqtt_color_temperature = 
            this.state?.mode === 'normal' ? this.state?.color_temperature : undefined;
        if (typeof mqtt_color_temperature === 'undefined') {
            this.say('info', 'probably because we arent in normal mode; there is no color temp to report');
            return;
        }
        this.say('get color temp:', mqtt_color_temperature);
        const hap_ct = this.constructor.#color_temp_mqtt2hap(mqtt_color_temperature);
        this.say('converted to HAP color temp:', hap_ct);
        return hap_ct ;
    }
    /**
     * 色温度 setter
     */
    async normal_color_temperature_set(hap_val) {
        this.say('set color temp:', hap_val);
        const mqtt_ct = this.constructor.#color_temp_hap2mqtt(hap_val);
        this.say('MQTT color temp:', mqtt_ct);
        this.set_states({
            color_temp: mqtt_ct, 
            mode: 'normal',
        });
    }
    /**
     * to be called from cocoa-home-platform when an mqtt message is received
     * this function tells cocoa-home-platform whether this message represents a
     * ToshibaCeilingLightAccessory
     */
    static identify(topic, message_obj) {
        // when an "irkit2mqtt/+" message arrives, provide positive identification
        if (message_obj?.model === "toshiba-frc205t") {
            const mqtt_id = topic.match(/\/(.*)$/)?.[1];
            return {mqtt_id};
        }
    }
    received_mqtt_message(msg){
        super.received_mqtt_message(msg);

        const mode_to_service_mapping = {
            normal:this.#light_normal_service,
            theater:this.#light_theater_service,
            relax:this.#light_relax_service,
            benkyo:this.#light_benkyo_service,
            kirei:this.#light_kirei_service,
            color:this.#light_color_service,
            'oyasumi-assist':this.#light_oyasumi_service,
            'night-light':this.#light_nightlight_service,
        };
        const {mode, brightness, color_temp} = msg.state ?? {};
        if (mode) {
            for (const [mapped_mode, service] of Object.entries(mode_to_service_mapping)) {
                service.updateCharacteristic(this.platform.Characteristic.On, mapped_mode === mode);
            }
        }
        if (typeof brightness === 'number') {
            const mode_for_sure = mode ?? this.state.mode;
            const mqtt_range = this.constructor.#brightness_range(mode_for_sure);
            const hap_brightness = this.constructor.convert_range(brightness, mqtt_range, [0,100]);
            // this.say(`💡mode(${mode_for_sure}) received brightness(${brightness}) --> hap brightness(${hap_brightness})`);

            for (const [mapped_mode, service] of Object.entries(mode_to_service_mapping)) {
                service.updateCharacteristic(
                    this.platform.Characteristic.Brightness, 
                    mapped_mode === mode_for_sure ? hap_brightness : 0
                );
            }
        }
        if (typeof color_temp === 'number') {
            const hap_ct = this.constructor.#color_temp_mqtt2hap(color_temp);
            this.#light_normal_service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, hap_ct);
        }
    }
}

module.exports = {
    accessory_name: 'toshiba-ceiling-light',
    cls: ToshibaCeilingLightAccessory,
};
