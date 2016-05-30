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
    tableName: 'TABLE_NAME'
};

let timeout = 2000;


const sampleMutex = new mutex(config);


sampleMutex.lock('keyName', timeout, (unlock) => {
  // DO AWESOME STUFF HERE
  unlock();
});


## License

MIT
