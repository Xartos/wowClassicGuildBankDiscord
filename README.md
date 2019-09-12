# Wow classic guild bank discord bot

## Requirements

To be able to run this bot you need to first install these packages

```
npm install -g ts-node
npm install -g typescript

npm install discord.js
npm install cheerio
npm install @types/cheerio
npm install request-promise
npm install @types/request-promise
```

## Configure

To configure the bot, edit the `config.json.example` and save it as `config.json`

## Run

To run just execute this command:

```
ts-node src/main.ts
```

## Using the bot

Send a message which starts with a `!` and one of these commands:

* add \<name of item\> [number to add, Default 1]

  Searches for the name and adds it to the list

* forceAdd \<name of item\> [number to add, Default 1]

  Adds the name to the list without searching

* remove \<name of item\> [number to remove, Default 1]

  Searches for the name and removes it from the list

* forceRemove \<name of item\> [number to add, Default 1]

  Removes the name to the list without searching

* list

  Shows the content of the list

* search \<name of item\>

  Searches for an item and returns the name of it

### Example

* Search

```
User: !search blood shard
Bot : Found item Blood Shard

User: !search somethingThatDontExist
Bot : Didn't find any item
```

* Add

```
User: !add blood shard
Bot : Adding 1 of Blood Shard

User: !add blood shard 100
Bot : Adding 100 of Blood Shard

User: !forceAdd somethingThatDontExist
Bot : Adding 1 of somethingThatDontExist
```

* Remove

```
User: !remove blood shard
Bot : Removing 1 of Blood Shard

User: !remove blood shard 100
Bot : Removing 100 of Blood Shard

User: !forceRemove somethingThatDontExist
Bot : Removing 1 of somethingThatDontExist
```

* List

```
User: !list
Bot : Content:
100 of Blood Shard
```
