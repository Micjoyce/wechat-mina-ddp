'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SynchronousWriteTransaction = require('./SynchronousWriteTransaction');

var _ = require('../../underscore');
var invariant = require('./invariant');

var ServerQuery = (function () {
  function ServerQuery(cache, key) {
    _classCallCheck(this, ServerQuery);

    this.cache = cache;
    this.key = key;

    this.mounted = false;
    this.querying = false;
  }

  _createClass(ServerQuery, [{
    key: 'getInitialState',
    value: function getInitialState() {
      return {};
    }
  }, {
    key: 'queryDidMount',
    value: function queryDidMount() {}
  }, {
    key: 'queryDidUpdate',
    value: function queryDidUpdate(prevProps) {}
  }, {
    key: 'query',
    value: function query() {
      throw new Error('ServerQuery.query() not implemented');
    }
  }, {
    key: 'setState',
    value: function setState(updates) {
      var _this = this;

      var mergedState = _.assign({}, this.state, updates);
      var cb = function cb() {
        _this.cache.serverQueries.upsert({
          _id: _this.key,
          state: mergedState
        });
      };

      this.state = mergedState;

      if (this.querying) {
        this.cache.withTransaction(new SynchronousWriteTransaction(), cb);
      } else {
        cb();
      }
    }
  }, {
    key: 'execute',
    value: function execute(props) {
      this.querying = true;
      try {
        if (!this.mounted) {
          this.props = props;
          this.state = this.getInitialState();
          this.setState(this.state);
          this.state = this.cache.serverQueries.get(this.key).state;
          this.mounted = true;
          this.queryDidMount();
        } else {
          var prevProps = this.props;
          var prevState = this.state;
          this.props = props;
          this.state = this.cache.serverQueries.get(this.key).state;
          this.queryDidUpdate(prevProps, prevState);
        }

        return this.query();
      } finally {
        this.querying = false;
      }
    }
  }]);

  return ServerQuery;
})();

function createNewServerQuery(cache, key, spec) {
  invariant(spec.hasOwnProperty('query'), 'You must implement query()');

  if (!cache.hasOwnProperty('serverQueries')) {
    cache.addCollection('serverQueries');
  }

  var serverQuery = new ServerQuery(cache, key);
  _.mixin(serverQuery, spec);

  return serverQuery;
}

var serverQueries = {};
var numTypes = 0;

var WithServerQuery = {
  createServerQuery: function createServerQuery(spec) {
    var cache = this;
    invariant(spec.hasOwnProperty('statics'), 'spec must have statics property');
    invariant(spec.statics.hasOwnProperty('getKey'), 'statics.getKey must be a function');

    var typeId = numTypes++;

    function getInstance(props) {
      var key = spec.statics.getKey(props);
      invariant(typeof key === 'string', 'You must return a string key');
      key = typeId + '~' + key;
      if (!serverQueries.hasOwnProperty(key)) {
        serverQueries[key] = createNewServerQuery(cache, key, spec);
      }
      return serverQueries[key];
    }

    function serverQuery(props) {
      return getInstance(props).execute(props);
    }

    serverQuery.getInstance = getInstance;

    return serverQuery;
  }
};

module.exports = WithServerQuery;
