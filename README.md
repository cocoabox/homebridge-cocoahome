# homebridge-cocoahome

cocoa 専用のmqtt➔homebridgeゲートウェイです。
主に irkit2mqtt と switchbot2mqtt 用。あと、typescript 書かないので純 javascript で書く。

## Features

- [irkit2mqtt](https://github.com/cocoabox/irkit2mqtt) の SHARP(リモコン品番`A909JB`、National（リモコン品番`A75C3026`) エアコンを Homekit デバイスに変換する    
  - Dehumidifier (乾燥モード切り替え)
  - Switch (室内干しモード切り替え)
  - Thermostat (暖房・冷房・ドライモード切替え、温度調節)
    - 現在温度は他MQTTメッセージから読み取り可
  - Heater/cooler (風向スイングON/OFF切替え、風量調整)
- switchbot2mqttの以下のデバイス対応
  - curtain
  - plug mini
  - temp humidity sensor
- sb2m の is-presence の BLE,MAC,PERSON 検知フラグを Occupacny Sensor に変換
- irkit2mqtt の toshiba ceiling light を Light に変換

## 開発手順

1. このディレクトリを `/opt/homebridge-cocoahome` にコピーする
1. `npm i` する
1. symlink を作る `/var/lib/homebridge/node_modules/homebridge-cocoahome` -> `/opt/homebridge-cocoahome` 
1. 好きなだけコードを書く。検証作業を行う前はすべてのコードを`/opt/homebridge-cocoahome` にコピーする。
1. `sudo systemctl stop homebridge` でサービスを停止する
1. cocoahomeの必須設定項目（以下configを参照）を `/var/lib/homebridge/config.json` に追加する
1. `DEBUG=homebridge-cocoahome  /opt/homebridge/start.sh  -D --stdout` でhomebridgeを起動する
1. 問題あったら`^C`でhomebridgeを終了する
1. 開発作業終わったら `sudo systemctl restart homebridge`で再起する


## config

```
{
        :
       前略
        :
   "platforms": [
        :
       前略
        :
   {
      "platform": "cocoahome",
      "mqtt": {
        "host": "cocoa-mqtt",
        "port": 8883,
        "key": "/opt/mqtt-certs/key.pem",
        "cert": "/opt/mqtt-certs/cert.pem",
        "ca": "/opt/mqtt-certs/ca.pem",
        "username": "USERNAME",
        "password": "PASSWORD"
      },
      "subscribe_to": [
        "irkit2mqtt/+",
        "sb2m/+"
      ],
      "publish_on_startup": {
        "irkit2mqtt/__hello__":""
      },
      "accessory_config": {
        "National-aircond": {
          "living-room-aircond": {
            "current_temp_topic": "sb2m/living-room-temp-sensor",
            "current_temp_object_path": "serviceData.temperature.c"
          }
        },
        "sharp-aircond": {
          "bedroom-aircond": {
            "current_temp_topic": "sb2m/bedroom-temp-sensor",
            "current_temp_object_path": "serviceData.temperature.c"
          }
        }
      }
    }
  ]
}
```
