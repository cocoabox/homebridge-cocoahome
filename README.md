# homebridge-cocoahome

cocoa 専用のmqtt➔homebridgeゲートウェイです。
主に irkit2mqtt と switchbot2mqtt 用。あと、typescript 書かないので純 javascript で書く。

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

```json
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
      "topic_prefixes": [
        "irkit2mqtt",
        "switchbots"
      ],
      "publish_on_startup": {
        "irkit2mqtt/__hello__":""
      }
    }
  ]
}
```
