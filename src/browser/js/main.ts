/// <reference path="../../../typings/browser.d.ts" />
/// <reference path="../../../node_modules/vue-class-component/index.d.ts" />

import * as Vue from 'vue';
import * as VueRouter from 'vue-router';
import VueComponent from 'vue-class-component';
import * as $ from 'jquery';
import * as electron from 'electron';
let ipcRenderer: Electron.IpcRenderer = require('electron').ipcRenderer;
let clipboard: Electron.Clipboard = require('electron').clipboard;

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

interface IChannelStatus {
	url: string;
	title: string;
	broadcasting: boolean;
}

@VueComponent({
	template: `
		<div class="channel">
			<div class="live-icon">
				{{{ broadcasting }}}
			</div>
			<div class="live-title">
				{{{ title }}}
			</div>
			<a class="address" v-on:click.prevent="openPage" href="#">{{ item.url }}</a>
			<button
				class="
					mdl-button
					mdl-button--accent
					mdl-button--icon
					mdl-js-button"
				v-on:click="remove(item)"
			><i class="fa fa-trash"></i></button>
		</div>
	`,
	props: ["item", "index"],
})
class ChannelView extends Vue {
	private title: string;
	private broadcasting: string;
	private updateChannelStatus: Function;
	public data(): any {
		return {
			title: "",
			broadcasting: "",
		}
	}
	public attached(): void {
		this.updateChannelStatus = (e: any, arg: string) => {
			let channelStatus: IChannelStatus = JSON.parse(arg);
			if (channelStatus.url === this.$get("item").url) {
				this.title = channelStatus.title;
				const onair: string = `<i class="onair fa-2x fa fa-microphone"></i>`;
				const offair: string = `<i class="offair fa-2x fa fa-microphone-slash"></i>`;
				this.broadcasting = channelStatus.broadcasting ? onair : offair;
			}
		};
		ipcRenderer.on("updateChannelStatus", this.updateChannelStatus);
	}
	public detached(): void {
		ipcRenderer.removeListener("updateChannelStatus", this.updateChannelStatus);
		this.updateChannelStatus = undefined;
	}
	public remove(item: IChannel): void
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
		<form v-on:submit.prevent class="channelForm">
			<div class="url-form mdl-textfield mdl-js-textfield">
				<input
					id="channel-url"
					class="url mdl-textfield__input"
					placeholder="チャンネルのURL"
					type="text"
					v-model="url"
				/>
			</div>
			<button
				class="
					mdl-button
					mdl-js-button
					mdl-js-ripple-effect"
				v-on:click="onPaste"
			/><i class="fa fa-clipboard"></i> 貼り付け</button>
			<button
				class="
					mdl-button
					mdl-button--primary
					mdl-js-button
					mdl-js-ripple-effect"
					v-on:click="onSubmit"
			><i class="fa fa-plus"></i> 追加</button>
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
	public onPaste(): void {
		this.url = clipboard.readText("selection").trim();
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
			ipcRenderer.send("alertChannels"); // to update channel status
		});
		appModel.addListener(this);
	}
	public detached(): void {
		appModel.removeListener(this);
	}
	public addChannel(item: IAddingChannel): void {
		appModel.channels.push({
			url: item.url,
			title: '',
		});
		ipcRenderer.send("save", JSON.stringify(appModel.channels));
		appModel.fireChanged();
		ipcRenderer.send("alertChannels"); // to update channel status
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
