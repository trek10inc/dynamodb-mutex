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

        this._lockTimeout = options.lockTimeout || 10000;
        this._lockRetryInterval = options.lockRetryInterval || 1000;

        //check if mutex table exists and create one if does not
        this._db.describeTable({ TableName: this._tableName }, err => {
            if (err && err.code === 'ResourceNotFoundException') {
                console.log('creating', this._tableName, ' table...');

                this._db.createTable({
                    TableName: this._tableName,

                    AttributeDefinitions: [
                        { AttributeName: 'key', AttributeType: 'S' }
                    ],

                    KeySchema: [
                        { AttributeName: 'key', KeyType: 'HASH' }
                    ],

                    //probably need to make this configurable as well...
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 1,
                        WriteCapacityUnits: 1
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
     * @param {number} timeout (optional)
     * @param {function} action
     */
    lock(key, timeout, action) {
        if (typeof timeout === 'function') {
            action = timeout;
            timeout = this._lockTimeout;
        }

        console.log('acquiring lock for', key);

        let retryLock = setInterval(() => {
            this._writeLock(key, timeout, (success) => {
                if (success) {
                    console.log(key, 'locked');
                    clearInterval(retryLock);
                    action(() => this._unlock(key));
                }
            });
        }, this._lockRetryInterval);
    }

    _writeLock(key, timeout, callback) {
        let now = Date.now();

        this._dbc.put({
            TableName: this._tableName,

            Item: {
                key: key,
                expire: now + timeout
            },

            ConditionExpression: '#key <> :key OR (#key = :key AND #expire < :expire)',

            ExpressionAttributeNames: {
                '#key': 'key',
                '#expire': 'expire'
            },

            ExpressionAttributeValues: {
                ':key': key,
                ':expire': now
            }
        }, err => {
            callback(!err);
        });
    }

    _unlock(key) {
        let params = {
            TableName: this._tableName,
            Key: { key: key }
        };

        this._dbc.delete(params, () => {
            console.log(key, 'unlocked');
        });
    }
}

module.exports = Mutex;