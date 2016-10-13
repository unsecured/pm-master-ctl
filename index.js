/*jslint node: true */

'use strict';

var Q = require('q');
var se = require('stream-extra');
var net = require('net');
var debug = require('debug')('pm-master-ctl');

var PMMasterCtl = function(opts) {
  this.serverHost = opts.serverHost;
  this.serverPort = opts.serverPort;
  this.rpcConnectedDeffered = Q.defer();
};

module.exports = PMMasterCtl;

PMMasterCtl.prototype.connect = function(opts) {
  if (this.rpc || this.rawSocket) {
    return new Q(new Error('client is conencted'));
  }

  var deferred = Q.defer();
  debug(
    'connecting to ' + this.serverHost +
    ':' + this.serverPort
  );
  this.rawSocket =
    net.createConnection(this.serverPort, this.serverHost);
  this.rawSocket.once(
    'connect',
    this._onRawSocketConnection.bind(this)
  );
  this.rawSocket.once('connect', deferred.resolve);
  this.rawSocket.once('error', deferred.reject);

  if (opts && opts.reconnect) {
    var _this = this;
    this.rawSocket.once('close', function(hadError) {
      debug('socket close hadError: ' + hadError);
      _this.disconnect();
      var reconnectTimeout = opts.reconnectTimeout || 3000;
      debug('reconnecting in ' + reconnectTimeout + 'ms');
      setTimeout(function() {
        debug('reconnecting now');
        _this.connect(opts)
        .then(function() {
          debug('reconnect done');
        }).fail(function(err) {
          debug('reconnect failed: ' + err.message);
        }).done();
      }, reconnectTimeout);
    });
  }

  return deferred.promise;
};

PMMasterCtl.prototype.disconnect = function() {
  debug('disconnect');

  if (this.rpc) {
    this.rpc.end();
    this.rpc = null;
  }

  if (this.rawSocket) {
    this.rawSocket.end();
    this.rawSocket.destroy();
    this.rawSocket.removeAllListeners();
    this.rawSocket = null;
  }

  if (this.mux) {
    this.mux = null;
  }

  return new Q(true);
};

PMMasterCtl.prototype._onRawSocketConnection = function() {
  debug('got raw socket to server');
  if (!this.rawSocket) {
    return debug(
      'ERROR: _onRawSocketConnection without socket'
    );
  }

  if (this.mux) {
    return debug(
      'ERROR: _onRawSocketConnection but mux is not null'
    );
  }

  if (this.rpc) {
    return debug(
      'ERROR: _onRawSocketConnection but rpc is not null'
    );
  }

  this.mux = new se.Mux(new se.Buffered(this.rawSocket, {
    lengthEncoding: 4
  }));
  var jsonStream = new se.JSON(this.mux);
  this.rpc = new se.RPC(jsonStream, {});
};

var createServerCall = function(method) {
  return function(data) {
    debug(method);
    var _this = this;
    return Q.try(function() {
      if (!_this.rpc) {
        throw new Error('not connected');
      }

      return _this.rpc.call(method, data);
    });
  };
};

['getClients', 'getProcesses', 'getCores', 'kill']
.forEach(function(method) {
  PMMasterCtl.prototype[method] = createServerCall(method);
});

PMMasterCtl.prototype.spawn = function(opts) {
  var _this = this;
  return Q.try(function() {
    if (!_this.rpc) {
      throw new Error('not connected');
    }

    if (opts.promise === 'execution') {
      var deferred = Q.defer();
      debug('spawn execution');
      var mux = _this.mux;
      _this.rpc.call('spawn', opts)
      .progress(function(info) {
        debug('got spawn info', info);
        var ctlInfo = {};

        // stream creation
        if (info.stdout) {
          ctlInfo.stdout = mux.createStream(info.stdout);
        }

        // stream creation
        if (info.stderr) {
          ctlInfo.stderr = mux.createStream(info.stderr);
        }

        deferred.notify(ctlInfo);
      }).then(deferred.resolve)
      .fail(deferred.reject);
      return deferred.promise;
    } else {
      // normal execution - no streams
      return _this.rpc.call('spawn', opts);
    }
  });
};
