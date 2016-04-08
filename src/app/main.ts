/// <reference path="../../typings/browser.d.ts" />

import BrowserWindow = Electron.BrowserWindow;
import IPCMain = Electron.IPCMain;
import IPCMainEvent = Electron.IPCMainEvent;
import * as electron from 'electron';
import * as http from "http";
import * as fs from "fs";
import * as notifier from "node-notifier";
import {IncomingMessage} from "http";
import {ClientRequest} from "http";
import {NodeNotifier} from "node-notifier";
import {Notification} from "node-notifier";

interface IChannel {
	url: string;
}

interface IConfig {
	version: number;
	channels: IChannel[];
}

const trayImagePath: string = __dirname + "/../browser/tray.png";
const trayActiveImagePath: string = __dirname + "/../browser/tray-active.png";
const pollingIntervalMillisec: number = 60000;

let app: Electron.App = electron.app;
let dialog: Electron.Dialog = electron.dialog;
let ipcMain: IPCMain = electron.ipcMain;
let mainWindow: BrowserWindow = undefined;
let tray: Electron.Tray = undefined;
let channels: IChannel[] = [];
let lastChannelBroadcastings: boolean[] = [];

function createWindow() {
	'use strict';
	if (mainWindow !== undefined) {
		mainWindow.focus();
		return;
	}
	let browserWindowOptions: Electron.BrowserWindowOptions = {
		width: 600,
		height: 600,
		webPreferences: {
			plugins: true,
		},
	};
	mainWindow = new electron.BrowserWindow(browserWindowOptions);
	mainWindow.setMenu(null);
	mainWindow.loadURL('file://' + __dirname + '/../browser/index.html');
	// mainWindow.webContents.openDevTools();
	mainWindow.on('closed', () => {
		mainWindow = undefined;
	});
}

function checkBroadcasting(body: string): boolean {
	'use strict';
	let notBroadcastingText: string = '<div id="broadTitle"></div>';
	let divIndex: number = body.indexOf('<div id="broadTitle">');
	if (divIndex < 0) {
		return false;
	}
	return (body.substr(divIndex, notBroadcastingText.length) !== notBroadcastingText);
}

function extractChannelTitle(body: string): string {
	'use strict';
	let titleMarker: string = '<span id="channelName_view">';
	let titleIndex: number = body.indexOf(titleMarker);
	if (titleIndex < 0) {
		return "(タイトル不明)";
	}
	let end: number = body.indexOf('</span>', titleIndex);
	if (end < 0) {
		return "(タイトル不明(2))";
	}
	return body.substr(titleIndex + titleMarker.length, end - (titleIndex + titleMarker.length));
}

function updateTrayIcon(): void {
	'use strict';
	let broadcastingChannelExists: boolean = false;
	for (let key in lastChannelBroadcastings) {
		if (lastChannelBroadcastings[key]) {
			broadcastingChannelExists = true;
		}
	}
	if (broadcastingChannelExists) {
		tray.setImage(trayActiveImagePath);
	} else {
		tray.setImage(trayImagePath);
	}
}

function alertChannels(): void {
	'use strict';
	channels.forEach((channel: IChannel) => {
		let request: ClientRequest = http.get(channel.url, (res: IncomingMessage) => {
			let url: string = channel.url;
			let body: string = "";
			res.setEncoding("utf8");
			res.on("data", (chunk: string) => {
				body += chunk;
			});
			res.on("error", (error: any) => {
				console.log(`Conection Error : ${error.message}`);
			});
			res.on("end", () => {
				let title: string = extractChannelTitle(body);
				let broadcasting: boolean = checkBroadcasting(body);
				if (broadcasting) {
					if (lastChannelBroadcastings[url] === undefined ||
						lastChannelBroadcastings[url] === false) {
						lastChannelBroadcastings[url] = true;
						notifier.notify({
							title: title,
							message: url,
							icon: __dirname + "/../browser/notification.png",
							sound: true,
							wait: true,
						});
						notifier.on("click", (notifierObject: NodeNotifier, options: Notification) => {
							electron.shell.openExternal(options.message);
						});
					}
				} else {
					lastChannelBroadcastings[url] = false;
				}
				updateTrayIcon();
				if (mainWindow !== undefined) {
					mainWindow.webContents.send("updateChannelStatus", JSON.stringify({
						url: url,
						title: title,
						broadcasting: broadcasting,
					}));
				}
			});
		});
		request.on("error", (error: any) => {
			console.log(`Conection Error : ${error.message}`);
		});
	});
}

function getConfigFileName(): string {
	'use strict';
	return app.getPath('userData') + "/config.json";
}

function deleteDeprecatedConfig(config: IConfig): void {
	'use strict';
	for (let i: number = 0; i < config.channels.length; ++i) {
		delete config.channels[i]["title"];
	}
}

app.on('ready', () => {
	tray = new electron.Tray(trayImagePath);
	let contextMenu: Electron.Menu = electron.Menu.buildFromTemplate([
		{
			label: "設定...",
			click: () => {
				createWindow();
			},
		},
		{
			label: "バージョン情報...",
			click: () => {
				dialog.showMessageBox({
					type: "info",
					buttons: [ "OK" ],
					title: "バージョン情報",
					message: "SavannaAlert バージョン 20160408",
				});
			},
		},
		{
			label: "終了",
			click: () => {
				app.quit();
			},
		},
	]);
	tray.setToolTip("SavannaAlert");
	tray.setContextMenu(contextMenu);
	tray.on("click", createWindow);
});
app.on("window-all-closed", () => {
	// do nothing not to quit the app
});
ipcMain.on("save", (event: IPCMainEvent, arg: string) => {
	channels = JSON.parse(arg);
	let config: IConfig = {
		version: 1,
		channels: channels,
	};
	fs.writeFileSync(getConfigFileName(), JSON.stringify(config));
	let channelUrlSet: boolean[] = [];
	channels.forEach((channel: IChannel) => {
		channelUrlSet[channel.url] = true;
	});
	for (let key in lastChannelBroadcastings) {
		if (!(key in channelUrlSet)) {
			delete lastChannelBroadcastings[key];
		}
	}
	updateTrayIcon();

});
ipcMain.on("getChannels", (event: IPCMainEvent) => {
	event.sender.send("getChannels", JSON.stringify(channels));
});
ipcMain.on("alertChannels", (event: IPCMainEvent) => {
	alertChannels();
});
try {
	let configText: string = fs.readFileSync(getConfigFileName(), "utf8");
	let config: IConfig = JSON.parse(configText);
	deleteDeprecatedConfig(config);
	channels = config.channels;
} catch (e) {
	channels = [
		{
			url: "http://afreecatv.jp/35841790",
		},
	];
}
setInterval(
	() => {
		alertChannels();
	},
	pollingIntervalMillisec);
alertChannels();
