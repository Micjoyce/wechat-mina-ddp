const EV = require("./EV");
const Meteor = require('../Meteor');
const Tracker = Meteor.Tracker;
const _ = Meteor.underscore;

class StreamerCentral extends EV {
	constructor() {
		super();

		this.instances = {};
		this.ddpConnections = {};		// since each Streamer instance can provide its own ddp connection, store them by streamer name

	}

	setupDdpConnection(name, ddpConnection) {
		// make sure we only setup event listeners for each ddp connection once
		if (ddpConnection.hasMeteorStreamerEventListeners) {
			return;
		}
		ddpConnection.socket.on('message:in', (msg) => {
			// const msg = DDPCommon.parseDDP(raw_msg);
			if (msg && msg.msg === 'changed' && msg.collection && msg.fields && msg.fields.eventName && msg.fields.args) {
				msg.fields.args.unshift(msg.fields.eventName);
				msg.fields.args.unshift(msg.collection);
				this.emit.apply(this, msg.fields.args);
			}
		});
		// store ddp connection
		this.storeDdpConnection(name, ddpConnection);

	}

	storeDdpConnection(name, ddpConnection) {
		// mark the connection as setup for Streamer, and store it
		ddpConnection.hasMeteorStreamerEventListeners = true;
		this.ddpConnections[name] = ddpConnection;
	}
}

Meteor.streamerCentral = new StreamerCentral();
// export streamerCentral;

class Streamer extends EV {
	constructor(name, {useCollection = false, ddpConnection = Meteor.ddp } = {}) {
		if (Meteor.streamerCentral.instances[name]) {
			console.warn('Streamer instance already exists:', name);
			return Meteor.streamerCentral.instances[name];
		}
		Meteor.streamerCentral.setupDdpConnection(name, ddpConnection);

		super();

		this.ddpConnection = ddpConnection || Meteor.ddp;

		Meteor.streamerCentral.instances[name] = this;

		this.name = name;
		this.useCollection = useCollection;
		this.subscriptions = {};
		Meteor.streamerCentral.on(this.subscriptionName, (eventName, ...args) => {
			if (this.subscriptions[eventName]) {
				this.subscriptions[eventName].lastMessage = args;
				super.emit.call(this, eventName, ...args);
			}
		});

		this.ddpConnection.on('reset', () => {
			super.emit.call(this, '__reconnect__');
		});
	}

	get name() {
		return this._name;
	}

	set name(name) {
		if (!_.isString(name)) {
			return console.log(`name: ${name} must be a String`);
		}
		this._name = name;
	}

	get subscriptionName() {
		return `stream-${this.name}`;
	}

	get useCollection() {
		return this._useCollection;
	}

	set useCollection(useCollection) {
		if (!_.isBoolean(useCollection)) {
			return console.log(`useCollection: ${useCollection} must be a Boolean`);
		}
		this._useCollection = useCollection;
	}

	stop(eventName) {
		if (this.subscriptions[eventName] && this.subscriptions[eventName].subscription) {
			this.subscriptions[eventName].subscription.stop();
		}
		this.unsubscribe(eventName);
	}

	stopAll() {
		for (let eventName in this.subscriptions) {
			if (this.subscriptions.hasOwnProperty(eventName)) {
				this.stop(eventName);
			}
		}
	}

	unsubscribe(eventName) {
		this.removeAllListeners(eventName);
		delete this.subscriptions[eventName];
	}

	subscribe(eventName) {
		let subscribe;
		Tracker.nonreactive(() => {
			subscribe = Meteor.subscribe(this.subscriptionName, eventName, this.useCollection, {
				onStop: () => {
					this.unsubscribe(eventName);
				}
			});
		});
		return subscribe;
	}

	onReconnect(fn) {
		if (typeof fn === 'function') {
			super.on('__reconnect__', fn);
		}
	}

	getLastMessageFromEvent(eventName) {
		const subscription = this.subscriptions[eventName];
		if (subscription && subscription.lastMessage) {
			return subscription.lastMessage;
		}
	}

	once(eventName, callback) {
		if (!_.isString(eventName)) {
			return console.log(`eventName: ${name} must be a NonEmptyString`);
		}
		if (!_.isFunction(callback)) {
			return console.log(`callback: ${name} must be a Function`);
		}

		if (!this.subscriptions[eventName]) {
			this.subscriptions[eventName] = {
				subscription: this.subscribe(eventName)
			};
		}

		super.once(eventName, callback);
	}

	on(eventName, callback) {
		if (!_.isString(eventName)) {
			return console.log(`eventName: ${name} must be a NonEmptyString`);
		}
		if (!_.isFunction(callback)) {
			return console.log(`callback: ${name} must be a Function`);
		}

		if (!this.subscriptions[eventName]) {
			this.subscriptions[eventName] = {
				subscription: this.subscribe(eventName)
			};
		}

		super.on(eventName, callback);
	}

	emit(...args) {
		Meteor.call(this.subscriptionName, ...args);
		// this.ddpConnection.call(this.subscriptionName, ...args);
	}
};

module.exports = Streamer;
