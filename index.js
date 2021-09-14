//@ts-check
import dotenv from "dotenv";
import path from "path";
import { Telegraf } from "telegraf";
import { Low, JSONFile } from "lowdb";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const BOT_ADMINS = process.env.BOT_ADMINS.split(",").map(Number);

const DB_FILE = path.join(__dirname, "db", "db.json");
const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter);

const bot = new Telegraf(process.env.BOT_TOKEN);

const dots = [
  ".",
  ".",
  "．",
  "｡",
  "•",
  "•",
  "•",
  "∙",
  ".",
  ".",
  ".",
  "/.\n" + ".",
];
const hacks = [" ", "ㅤ", "ᅠ", "‎", "\n"];

function hasDot(string, strict = false) {
  let dotsStarted = false;
  for (let i = string.length - 1; i >= 0; i--) {
    const char = string[i];
    const isHack = hacks.includes(char);
    if (isHack && dotsStarted) return true;
    if (isHack) continue;
    const isDot = dots.includes(char);
    if (strict) return isDot;
    if (dotsStarted) return !isDot;
    if (!isDot) return false;
    // fix for only one dot
    if (i === 0) return true;
    dotsStarted = true;
  }
}

const FILTERS = [/.*[^.]+\.$/, /.*[^.]+\.ㅤ$/];
const STRICT_FILTERS = [/.*\.$/, /.*\.ㅤ$/];

const state = {
  repliesMap: {},
};

const FIVE_MINUTES = 1000 * 60 * 5;

function canReply(ctx) {
  const userId = ctx.update.message.from.id;
  const lastReply = state.repliesMap[userId] || -Infinity;
  state.repliesMap[userId] = Date.now();
  return Date.now() - lastReply > FIVE_MINUTES;
}

function getUser(ctx) {
  return ctx.update.message.from.id;
}

function userIsAdmin(id) {
  return BOT_ADMINS.includes(id);
}

function userIsWhitelisted(id) {
  return db.data.whitelist.includes(id);
}

function userIsBlacklisted(id) {
  console.log(db.data.blacklist, id);
  return db.data.blacklist.includes(id);
}

function messageIsBlocked(ctx) {
  const { text } = ctx.update.message;
  const user = getUser(ctx);
  const strict = userIsBlacklisted(user);
  return hasDot(text, strict);
}

function getMention(ctx) {
  const { from } = ctx.update.message;
  const user = getUser(ctx);
  const placeholder = userIsBlacklisted(user)
    ? "Мразь обоссаная"
    : "Долбоеб без юзернейма";
  return from.username ? `@${from.username}` : placeholder;
}

const COMMANDS = [".bl", ".wl", ".blr", ".wlr"];

function handleAdmin(ctx) {
  const { message } = ctx.update;
  const reply = message.reply_to_message;

  if (!COMMANDS.includes(message.text)) {
    return;
  }

  if (!reply) {
    ctx.reply("Нет реплая", {
      reply_to_message_id: message.message_id,
      disable_notification: true,
    });
    return;
  }

  const target = reply.from.id;

  if (userIsAdmin(target)) {
    ctx.reply("Сорян, нихуя", {
      reply_to_message_id: message.message_id,
      disable_notification: true,
    });
    return;
  }

  if (message.text === ".bl") {
    db.data.blacklist.push(target);
    db.data.whitelist = db.data.whitelist.filter((id) => id !== target);
    ctx.reply("Пидорас ушел в бан, вкусно", {
      reply_to_message_id: reply.message_id,
      disable_notification: true,
    });
  }

  if (message.text === ".wl") {
    db.data.whitelist.push(target);
    db.data.blacklist = db.data.blacklist.filter((id) => id !== target);
    ctx.reply("С господина сняты точечные ограничения", {
      reply_to_message_id: reply.message_id,
      disable_notification: true,
    });
  }

  if (message.text === ".blr") {
    db.data.blacklist = db.data.blacklist.filter((id) => id !== target);
    ctx.reply("Ну зачем прощать эту мразину?", {
      reply_to_message_id: reply.message_id,
      disable_notification: true,
    });
  }

  if (message.text === ".wlr") {
    db.data.whitelist = db.data.whitelist.filter((id) => id !== target);
    ctx.reply("Доигрался дебилоид, обратно в очередняру", {
      reply_to_message_id: reply.message_id,
      disable_notification: true,
    });
  }

  db.write();
}

function handleDumbass(ctx) {
  const user = getUser(ctx);

  if (userIsWhitelisted(user)) return;
  if (!messageIsBlocked(ctx)) return;

  const { message_id } = ctx.update.message;
  ctx.deleteMessage(message_id);

  if (!canReply(ctx)) return;

  const mention = getMention(ctx);

  if (userIsBlacklisted(user)) {
    ctx.reply(`${mention}, ливни нахуй`, {
      disable_notification: true,
    });
  } else {
    ctx.reply(
      `${mention}, здесь запрещено писать сообщения с точками на конце`,
      {
        disable_notification: true,
      }
    );
  }
}

function handleMessage(ctx) {
  const { edited_message } = ctx.update;
  if (edited_message) {
    ctx.update.message = edited_message;
  }

  const { message } = ctx.update;
  if (!message) return;

  const user = getUser(ctx);

  if (userIsAdmin(user)) {
    return handleAdmin(ctx);
  }

  return handleDumbass(ctx);
}

bot.on("text", handleMessage);
bot.on("edited_message", handleMessage);

async function bootstrap() {
  await db.read();

  if (!db.data) {
    db.data = { whitelist: [], blacklist: [] };
  }

  bot.launch();
}

bootstrap();
