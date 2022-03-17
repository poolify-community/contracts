# contracts

## Documentation

There is no documentation yet, this will be provided later.


## How to use it :

#### Installation:
First install all the dependencies

```sh
npm install 
```

Then run this command to automatically create the wall.config.json file for the different environments.
```sh
npm run init_wallet
```

```js
{
    "bsc":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "bscTest":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

#### Test:
Run the tests:

```sh
npm run test
```


#### Deployment:

The script used depend of the network target:

| Network       | Script        |
| ------------- | ------------- |
| develop       | local_deploy  |
| bscTest       | bscTest_deploy|
| bsc           | bsc_deploy    |

Example for the development network:
```sh
npm run local_deploy
```

This will create new files in the build folder:
1. `build/abis` will contain the abis files
2. `build/config` is containing the JSON config file for the frontend app !

#### Current Setup:

1. PLFY Maxi vault (PLFY => PLFY)
2. PLFY Liquidity BSC (PLFY-BNB => PLFY)
