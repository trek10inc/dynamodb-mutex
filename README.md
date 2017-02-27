# dynamodb-mutex

## Installation : 

```
npm install dynamodb-mutex
```


## How to use
```js
const mutex = require( 'dynamodb-mutex' );


let config = {
    region: 'REGION',
    accessKeyId: 'ACCESS_KEY_ID',
    accessKey: 'ACCESS_KEY',
    retryInterval: INTERVAL_TIME,
    maxTries: 3,
    tableName: 'TABLE_NAME'
    readCapacityUnits: 5, // Default 1,
    writeCapacityUnits: 5, // Default 1
};

let timeout = 2000;


const sampleMutex = new mutex(config);


sampleMutex.lock('keyName', timeout, (err, unlock) => {
  if (err) {
  	console.log('Lock failed')
  } else {
   // DO AWESOME STUFF HERE
    unlock();
  }
});


## License

MIT
