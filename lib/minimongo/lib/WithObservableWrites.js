var EventEmitter, WithObservableWrites, WriteTransaction, _;

EventEmitter = require('../../EventEmitter');

WriteTransaction = require('./WriteTransaction');

_ = require('../../underscore');

WithObservableWrites = {
  getDefaultTransaction: function() {
    this.setMaxListeners(0);
    return new WriteTransaction(this);
  }
};

_.mixin(WithObservableWrites, EventEmitter.prototype);

module.exports = WithObservableWrites;
