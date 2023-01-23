"use strict";
const settings = require("./settings");
const {CocoaHomePlatform} = require("./cocoa-home-platform");

module.exports = (api) => {
    api.registerPlatform(settings.PLATFORM_NAME, CocoaHomePlatform);
};

