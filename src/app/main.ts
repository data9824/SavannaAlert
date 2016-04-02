/// <reference path="../../typings/browser.d.ts" />
import BrowserWindow = Electron.BrowserWindow;

import * as electron from 'electron';
import IPCMain = Electron.IPCMain;
import IPCMainEvent = Electron.IPCMainEvent;
import {Socket} from "net";
import {Stats} from "fs";
import {parse} from "querystring";
import {IncomingMessage} from "http";
import {NodeNotifier} from "node-notifier";
let fs: any = require('fs');
let http: any = require('http');
let notifier: NodeNotifier = require('node-notifier');
let app: Electron.App = electron.app;
let dialog: Electron.Dialog = electron.dialog;
let mainWindow: BrowserWindow = undefined;

function createWindow() {
	'use strict';
	if (mainWindow !== undefined) {
		mainWindow.focus();
		return;
	}
	let browserWindowOptions: Electron.BrowserWindowOptions = {
		width: 800,
		height: 600,
		webPreferences: {
			plugins: true,
		},
	};
	mainWindow = new electron.BrowserWindow(browserWindowOptions);
	mainWindow.setMenu(null);
	mainWindow.loadURL('file://' + __dirname + '/../browser/index.html');
//	mainWindow.webContents.openDevTools();
	mainWindow.on('closed', () => {
		mainWindow = undefined;
	});
}

app.on('ready', () => {
	let tray: Electron.Tray = new electron.Tray(__dirname + "/../browser/tray.png");
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
				dialog.showErrorBox("バージョン情報", "バージョン 20160402");
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

interface IChannel {
	url: string;
	title: string;
}

function checkBroadcasting(body: string): boolean {
	let notBroadcastingText: string = '<div id="broadTitle"></div>';
	let divIndex: number = body.indexOf('<div id="broadTitle">');
	if (divIndex < 0) {
		return false;
	}
	return (body.substr(divIndex, notBroadcastingText.length) !== notBroadcastingText);
}

function extractChannelTitle(body: string): string {
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

let channels: IChannel[] = [];
let lastChannelBroadcastings: boolean[] = [];

setInterval(() => {
	alertChannels();
}, 30000);

function alertChannels(): void {
	channels.forEach((channel: IChannel) => {
		http.get(channel.url, (res: IncomingMessage) => {
			let url: string = channel.url;
			let body: string = "";
			res.setEncoding("utf8");
			res.on("data", (chunk: string) => {
				body += chunk;
			});
			res.on("error", (e) => {
				console.log(`Conection Error : ${e.message}`);
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
							icon: __dirname + "/../browser/tray.png",
							sound: true,
							wait: true,
						});
						notifier.on("click", (notifierObject, options) => {
							electron.shell.openExternal(options.message);
						});
					}
				} else {
					lastChannelBroadcastings[url] = false;
				}
			});
		});
	});
}

interface IConfig {
	version: number;
	channels: IChannel[];
}

function getConfigFileName(): string {
	return app.getPath('userData') + "/config.json";
}

let ipcMain: IPCMain = require('electron').ipcMain;
ipcMain.on("save", (event: IPCMainEvent, arg: string) => {
	channels = JSON.parse(arg);
	console.log(app.getPath('userData'));
	let config: IConfig = {
		version: 1,
		channels: channels,
	};
	fs.writeFileSync(getConfigFileName(), JSON.stringify(config));
});
ipcMain.on("getChannels", (event: IPCMainEvent) => {
	event.sender.send("getChannels", JSON.stringify(channels));
});

try {
	let configText: string = fs.readFileSync(getConfigFileName(), "utf8");
	let config: IConfig = JSON.parse(configText);
	channels = config.channels;
} catch (e) {
	channels = [
		{
			url: "http://afreecatv.jp/35841790",
			title: "",
		},
	];
}

alertChannels();
