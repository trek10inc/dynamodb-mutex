'use strict';

const aws = require('aws-sdk');

class Mutex {
  /**
   * Mutex class constructor
   * @param {Object} options configuration parameters
   *
   * options: {
   *  region :            AWS region
   *  accessKeyId:        AWS access key ID
   *  secretAccessKey:    AWS secret access key
   *                      (AWS parameters are optional and come from aws.config if missed)
   *
   *  maxTries:           number of times to try the lock before giving up
   *  lockRetryInterval:  lock retry interval (optional, 1000ms by default)
   *  lockTimeout:        lock timeout (optional, 10000ms by default)
   *  tableName:          mutex table name (optional, 'mutex-table' by default)
   * }
   */
  constructor(options) {
    if (!options) options = {};

    this._db = new aws.DynamoDB(options);
    this._dbc = new aws.DynamoDB.DocumentClient(options);
    this._tableName = options.tableName || 'mutex-table';
    this._hashKey = options.hashKey || 'key';
    this._lockTimeout = options.lockTimeout || 10000;
    this._maxTries = options.maxTries || 1;
    this._lockRetryInterval = options.lockRetryInterval || 1000;
    this._readCapacityUnits = options.readCapacityUnits || 1;
    this._writeCapacityUnits = options.writeCapacityUnits || 1;


  }

  initDB() {
    //check if mutex table exists and create one if does not
    this._db.describeTable({ TableName: this._tableName }, err => {
      if (err && err.code === 'ResourceNotFoundException') {
        console.log('creating', this._tableName, ' table...');

        this._db.createTable({
          TableName: this._tableName,

          AttributeDefinitions: [
            { AttributeName: this._hashKey, AttributeType: 'S' }
          ],

          KeySchema: [
            { AttributeName: this._hashKey, KeyType: 'HASH' }
          ],

          ProvisionedThroughput: {
            ReadCapacityUnits: this._readCapacityUnits,
            WriteCapacityUnits: this._writeCapacityUnits
          }
        }, () => {
          console.log(this._tableName, 'created');
        });
      }
    });
  }

  /**
   * Lock
   * @access public
   * @param {string} key
   * @param {number} maxTries (optional)
   * @param {function} action
   */
  lock(key, maxTries, callback) {
    if (typeof maxTries === 'function') {
      callback = maxTries;
      maxTries = this._maxTries;
    }

    console.log('acquiring lock for', key);
    this._writeLock(key, (success) => {
      if (success)
        callback(null, (cb) => this._unlock(key, cb))
      else {
        maxTries--
        if (maxTries <= 0)
          callback({ 'Error': 'Lock failed' })
        else {
          console.log('Already locked waiting, tries left', maxTries)
          setTimeout( () => this.lock(key, maxTries, callback), this._lockRetryInterval)
        }
      }

      // let retryLock = setInterval(() => {
      //   this._writeLock(key, maxTries, (success) => {
      //     if (success) {
      //       console.log(key, 'locked');
      //       clearInterval(retryLock);
      //       action(null, () => this._unlock(key));
      //     }
      //   });
      // }, this._lockRetryInterval);
    })
  }

  _writeLock(key, callback) {
    let now = Date.now();

    let params = {
      TableName: this._tableName,

      Item: {
        expire: now + this._lockTimeout
      },

      ConditionExpression: '#key <> :key OR (#key = :key AND #expire < :expire)',

      ExpressionAttributeNames: {
        '#key': this._hashKey,
        '#expire': 'expire'
      },

      ExpressionAttributeValues: {
        ':key': key,
        ':expire': now
      }
    }
    params.Item[this._hashKey] = key
    this._dbc.put(params, err => { callback(!err); });
  }

  _unlock(key, cb) {
    cb = cb || function() {}
    let params = {
      TableName: this._tableName,
      Key: {}
    };
    params.Key[this._hashKey] = key

    this._dbc.delete(params, () => {
      console.log(key, 'unlocked');
      cb()
    });
  }
}

module.exports = Mutex;