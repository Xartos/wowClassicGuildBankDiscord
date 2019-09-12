import * as discord from "discord.js";
import * as cheerio from "cheerio";
import * as request from "request-promise";
import * as fs from "fs";
import { DMChannel, GroupDMChannel, Guild, Message, TextChannel, RichEmbed } from "discord.js";

const util = require('util');

import * as config from "../config.json";

class ArgNum {
  public argument: string;
  public num: number;

  public constructor(argument: string, num: number){
    this.argument = argument;
    this.num = num;
  }
}

function handle_exception(error: Error | string): void {
  console.log("ERROR!!!! " + error);
}

async function from_table(table: Cheerio): Promise<string> {
    const regex_find = (lines: string[], regex: RegExp): string[] =>
    (lines.find((line) =>
      ((line || "").match(regex) || []).length > 0) || "").split(" ");

    const $ = cheerio.load(table.html());
    const table_contents = table.find("tr td").first();
    const name_node = table_contents.find("b").first();

    const name = name_node.text();
    return name;
  }


async function from_tooltip(html: string): Promise<string> {
    const $ = cheerio.load(html);
    const tables = $("div.tooltip > table tbody tr td").children("table");

    const stat_table = tables.get(0);

    return from_table($(stat_table));
  }

async function from_id(id: string | number): Promise<string> {
  const url = `https://classicdb.ch/?item=${id}`;
  const html = await request({uri: url});
  return from_tooltip(html);
}

function find_first_item_index(item_details: number[][]): number {
  for (let i = 0; i < item_details.length; i++) {
    if (item_details[i][0] === 3) {
      return i;
    }
  }
  return -1;
}

async function search(query: string): Promise<string> {
  const url = `https://classicdb.ch/opensearch.php?search=${query}`;
  const result = await request({json: true, uri: url});
  if (result === []) {
    return;
  }
  // Item information is always located in element 7 of the result.
  const item_details = result[7];
  if (!item_details) {
    return;
  }

  const first_item_index = find_first_item_index(item_details);
  if (first_item_index === -1) {
    return;
  }
  // Item ID is always located in element 1 of an item.
  const item_id = item_details[first_item_index][1];
  const item = await from_id(item_id);
  const messages = item; // item.build_messages();
  if (!messages) {
    return; 
  } else {
    return messages;
  }
}

function getArgumentAndNumber(argument: string): ArgNum {
  var nrToChange = 1;
  var lastArg = Number(argument.split(' ').slice(-1).join(' '));
  var newArg = argument;
  if (!isNaN(lastArg)){
    nrToChange = lastArg;
    newArg = argument.split(' ').slice(0, -1).join(' ');
  }

  return new ArgNum(newArg, nrToChange);
}

function add(message: Message, argNum: ArgNum, toAdd: string, list: { [item: string]: number; }): void {
  console.log(message.author.username + " is adding " + argNum.num + " of " + toAdd);
  message.reply("Adding " + argNum.num + " of " + toAdd).catch(handle_exception);
  const listEntry: number = list[toAdd];
  if (listEntry){
    list[toAdd] = listEntry + argNum.num;
  } else {
    list[toAdd] = argNum.num;
  }
}

function remove(message: Message, argNum: ArgNum, toRemove: string, list: { [item: string]: number; }): void {
  if (toRemove in list){
    console.log(message.author.username + " is removing " + argNum.num + " of " + toRemove);
    message.reply("Removing " + argNum.num + " of " + toRemove).catch(handle_exception);
    const listEntry = list[toRemove];
    if (listEntry - argNum.num <= 0){
      list[toRemove] = 0;
    } else {
      list[toRemove] = listEntry - argNum.num;
    }
  }
}

(async () => {
  // Init discord virtual client.
  const discord_client = new discord.Client();
  const dicord_token = config.discord.token;
  var list: { [item: string]: number; } = {};

  if (config.listFileName) {
    if(fs.existsSync(config.listFileName)){
      try{
        var content = fs.readFileSync(config.listFileName);
      } catch (err) {
        handle_exception(err);
      }
      if (content) {
        list = JSON.parse(content.toString('utf8'));
      }
    } else {
      console.log("Warning: No guild file present, starting with empty list");
    }
  }

  console.log("Awaiting response from discord");
  discord_client.on("ready", () => {
    console.log(`Started classicdb_bot`);
  });

  // On message received behavior.
  discord_client.on("message", async (message) => {
    if (!message.author.username){
      return;
    }

    const command = message.content.split(' ')[0];
    const argument = message.content.split(' ').slice(1).join(' ');
    var argNum: ArgNum;

    switch(command){
      case '!add':
        argNum = getArgumentAndNumber(argument);
        const toAdd: string = await search(argNum.argument);
        if (!toAdd) {
          message.reply("Didn't find any item").catch(handle_exception);
          console.log("Didn't find anything");
          return;
        }
        add(message, argNum, toAdd, list);
        break;
      case '!forceAdd':
        argNum = getArgumentAndNumber(argument);
        add(message, argNum, argNum.argument, list);
        break;
      case '!remove':
        argNum = getArgumentAndNumber(argument);

        const toRemove: string = await search(argNum.argument);
        if (!toRemove) {
          message.reply("Didn't find any item").catch(handle_exception);
          console.log("Didn't find anything");
          return;
        }
        remove(message, argNum, toRemove, list);
        break;
      case '!forceRemove':
        argNum = getArgumentAndNumber(argument);
        remove(message, argNum, argNum.argument, list);
        break;
      case '!list':
        var msg = "Content:\n";
        for(var key in list){
          var value = list[key];
          if (value > 0){
            msg += value + " of " + key + "\n";
          }
        }
        console.log(message.author.username + " is listing list");
        message.reply(msg).catch(handle_exception);
        break;
      case '!search':
        console.log(message.author.username + " is searching for \"" + argument + "\"");
        const response: string = await search(argument);

        if (!response) {
          message.reply("Didn't find any item").catch(handle_exception);
          console.log("Nothing to respond to");
          return;
        }

        message.reply("Found item " + response).catch(handle_exception);
        break;
    }

    if (config.saveList){
      const listString = JSON.stringify(list);
      try{
        fs.writeFileSync(config.listFileName, listString);
      } catch (err) {
        handle_exception(err);
      }
    }

  });

  // Authenticate.
  discord_client.login(dicord_token).catch(handle_exception);
})();

