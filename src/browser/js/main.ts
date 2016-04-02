/// <reference path="../../../typings/browser.d.ts" />
/// <reference path="../../../node_modules/vue-class-component/index.d.ts" />

import * as Vue from 'vue';
import * as VueRouter from 'vue-router';
import VueComponent from 'vue-class-component';
import * as $ from 'jquery';
import * as electron from 'electron';
let ipcRenderer: Electron.IpcRenderer = require('electron').ipcRenderer;

interface IChannel {
	url: string;
	title: string;
}

interface IAppModelListener {
	onAppModelChanged: (sender: AppModel) => void;
}

class AppModel {
	private listeners: IAppModelListener[] = [];
	public addListener(listener: IAppModelListener): void {
		this.listeners.push(listener);
	}
	public removeListener(listener: IAppModelListener): void {
		let index: number = this.listeners.indexOf(listener);
		if (index >= 0) {
			this.listeners.splice(index, 1);
		}
	}
	public channels: IChannel[] = [];
	public fireChanged(): void {
		this.listeners.forEach((listener: IAppModelListener) => {
			listener.onAppModelChanged(this);
		});
	}
}

let appModel: AppModel = new AppModel();

@VueComponent({
	template: `
		<div class="channel">
			<a v-on:click.prevent="openPage" href="#">{{ item.url }}</a>
			{{ item.title }}
			<input class="delete" type="button" value="削除" v-on:click="delete(item)"/>
		</div>
	`,
	props: ["item", "index"],
})
class ChannelView extends Vue {
	public delete(item: IChannel): void
	{
		appModel.channels.splice(this.$get("index"), 1);
		ipcRenderer.send("save", JSON.stringify(appModel.channels));
		appModel.fireChanged();
	}
	public openPage(): void {
		electron.shell.openExternal(this.$get("item").url);
	}
}

@VueComponent({
	template: `
		<div class="channelList" v-for="channel in channels">
			<channel :item="channel" :index="$index"></channel>
		</div>
	`,
	props: ['channels'],
})
class ChannelListView extends Vue {
}

@VueComponent({
	template: `
		<form class="channelForm" v-on:submit.prevent="onSubmit">
			<input class="url" type="text" placeholder="チャンネルのURL" v-model="url"/>
			<input type="submit" value="追加"/>
		</form>
	`,
})
class ChannelFormView extends Vue {
	private url: string;
	public data(): any {
		return {
			url: '',
		};
	}
	public onSubmit(): void {
		const regexp = new RegExp("^(.+[^.]\.)?afreecatv\.jp");
		if (this.url === '' || !this.url.match(regexp)) {
			this.url = '';
			return;
		}
		this.$dispatch('add-channel', {
			url: this.url,
		});
		this.url = '';
	}
}

interface IAddingChannel {
	url: string;
}

@VueComponent({
	template: `
		<div class="channelBox">
			<h1>チャンネル一覧</h1>
			<channel-list :channels="channels"></channel-list>
			<channel-form v-on:add-channel="addChannel"></channel-form>
		</div>
	`,
})
class ChannelBoxView extends Vue implements IAppModelListener {
	private channels: IChannel[];
	public data(): any {
		return {
			channels: appModel.channels,
		};
	}
	public attached(): void {
		ipcRenderer.send("getChannels");
		ipcRenderer.on("getChannels", (e: any, arg: string) => {
			appModel.channels = JSON.parse(arg);
			appModel.fireChanged();
		});
		appModel.addListener(this);
	}
	public detached(): void {
		appModel.removeListener(this);
	}
	public addChannel(item: IAddingChannel): void {
		appModel.channels.push({
			url: item.url,
			title: "",
		});
		ipcRenderer.send("save", JSON.stringify(appModel.channels));
		appModel.fireChanged();
	}
	public onAppModelChanged(sender: AppModel): void {
		this.channels = appModel.channels;
	}
}

@VueComponent({})
class App extends Vue {
}

Vue.component('channel', ChannelView);
Vue.component('channel-list', ChannelListView);
Vue.component('channel-form', ChannelFormView);
Vue.use(VueRouter);
let router: any = new VueRouter();
router.map({
	'/': {
		component: ChannelBoxView,
	},
});

$(function() {
	router.start(App, '#content');
});
