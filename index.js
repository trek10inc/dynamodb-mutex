'use strict';

const aws = require('aws-sdk');

class Mutex {

    /**
     * Mutex class constructor
     * @param {Object} opts AWS configuration parameters
     *
     */

    constructor(opts) {
        aws.config.update({

            region : opts.region,
            apiVersions: {
                dynamodb: '2012-08-10'
            },

            credentials: new aws.Credentials({
                accessKeyId: opts.accessKeyId,
                secretAccessKey: opts.secretAccessKey
            })

        });

        this._db = new aws.DynamoDB();
        this._dbc = new aws.DynamoDB.DocumentClient();
        this._tableName = opts.tableName;

        this._db.describeTable({ TableName : this._tableName }, err => {
            if(err && err.code === 'ResourceNotFoundException') {

                this._db.createTable({
                    TableName : this._tableName,
                    AttributeDefinitions : [
                        { AttributeName : 'key', AttributeType : 'S' },
                        { AttributeName : 'expire', AttributeType : 'N' }
                    ],
                    KeySchema : [
                        { AttributeName : 'key', KeyType : 'HASH' },
                        { AttributeName : 'expire', KeyType : 'RANGE' }
                    ],
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 1,
                        WriteCapacityUnits: 1
                    }
                });
            }
        });
    }

    /**
     * Write Lock
     * @access private
     * @param {string} key
     * @param {number} timeout
     * @param {object} runner
     * @param {function} callback
     */

    _writeLock(key, timeout, runner, callback) {

      let now = Date.now();
      let item = {
          key : key,
          expire : now + timeout
      };

        this._dbc.put({
            TableName : this._tableName,
            Item: item,
            ConditionExpression: '#key <> :key OR (#key = :key AND #expire < :expire)',
            ExpressionAttributeNames: {
                '#key': 'key',
                '#expire': 'expire'
            },
            ExpressionAttributeValues: {
                ':key': item.key,
                ':expire': now
            }
        }, err => {
            if(!err) clearInterval(runner);
            callback(!err);
        });
    }

    /**
     * Acquire Lock
     * @access public
     * @param {string} key
     * @param {number} timeout
     * @param {function} callback
     */

    acquireLock(key, timeout, callback) {

        let runner = setInterval( () => {

            this._writeLock(key, timeout, runner, (success) => {
                if(success) callback(() => this._unlock(key));
            });

        }, 1000);

    }

    /**
     * Unlock
     * @access private
     * @param {string} key
     */

    _unlock(key) {
        let params = {
            TableName : this._tableName,
            Key: {
                key: key
            }
        };
        this._dbc.delete(params, err => err);
    }
}

module.exports = Mutex;