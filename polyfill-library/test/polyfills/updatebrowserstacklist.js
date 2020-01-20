"use strict";

const path = require("path");
const fs = require("fs");
const BrowserStack = require("browserstack");
const dotenv = require("dotenv");
dotenv.config({
	path: path.join(__dirname, "../../.env")
});
const browserStackCredentials = {
	username: process.env.BROWSER_STACK_USERNAME,
	password: process.env.BROWSER_STACK_ACCESS_KEY
};

if (!process.env.BROWSER_STACK_USERNAME || !process.env.BROWSER_STACK_ACCESS_KEY) {
	throw new Error("BROWSER_STACK_USERNAME and BROWSER_STACK_ACCESS_KEY must be set in the environment to run this script.");
}

const automateClient = BrowserStack.createAutomateClient(browserStackCredentials);
const TOML = require('@iarna/toml');
automateClient.getBrowsers(function(error, browsers) {
	console.log("Updated the browser list for automated testing via BrowserStack.");
	fs.writeFileSync(path.join(__dirname, "browserstackBrowsers.toml"), TOML.stringify({browsers}));
	fs.writeFileSync(
		path.join(__dirname, "browsers.toml"),
		TOML.stringify({
			browsers: Array.from(new Set(browsers.map(b => (b.browser_version ? `${b.browser}/${b.browser_version}` : `${b.os}/${b.os_version}`)))).sort()
		})
	);
});
