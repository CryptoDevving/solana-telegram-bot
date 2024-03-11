const web3 = require("@solana/web3.js")
const splToken = require("@solana/spl-token")
const bs58 = require("bs58")
const TelegramBot = require("node-telegram-bot-api")
require("dotenv").config()

//telegram bot configuration
const commands = ["/start", "/deploytoken"]
const allowedUsers = ["raymanoos", "lekheydeter"]

const botToken = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(botToken, { polling: true })

//solana configuration
const ownerPrivateKey = bs58.decode(process.env.OWNER_PRIVATE_KEY)
const ownerKeypair = web3.Keypair.fromSecretKey(new Uint8Array(ownerPrivateKey))
const ownerPublicKey = ownerKeypair.publicKey

const connection = new web3.Connection(
  web3.clusterApiUrl("devnet"),
  "confirmed"
)

const userSessions = {}

//verify user who is allowed to access this bot.
const verifyUser = (username) => {
  if (allowedUsers.includes(username)) return true
  else return false
}

//set up the chat state and text.
const resetSession = (chatId) => {
  userSessions[chatId] = {
    step: "awaiting_name",
    data: {},
  }
}

const deployToken = async (name, symbol, decimals, totalSupply) => {
  const mint = await splToken.createMint(
    connection,
    ownerKeypair,
    ownerPublicKey,
    ownerPublicKey,
    decimals
  )
  return mint.toBase58()
}

//start command handling
bot.onText(/\/start$/, (msg) => {
  const chatId = msg.chat.id
  const username = msg.from.username.toLowerCase()

  if (!verifyUser(username)) {
    bot.sendMessage(
      chatId,
      `Sorry @${username}, you're not authorized to use this bot. please contact the support team.`
    )
    return
  }

  bot.sendMessage(
    chatId,
    "Welcome to Crown Token Bot!\nI can help you deploy, create a market, snipe tokens.\n\nYou can control me by sending these commands:\n\n/start - start a bot\n/deploytoken - deploy a new token to the Solana network"
  )
})

//deploytoken command handling
bot.onText(/\/deploytoken$/, async (msg) => {
  const chatId = msg.chat.id
  const username = msg.from.username.toLowerCase()

  if (!verifyUser(username)) {
    bot.sendMessage(
      chatId,
      `Sorry @${username}, you're not authorized to use this bot. please contact the support team.`
    )
    return
  }

  resetSession(chatId)
  bot.sendMessage(chatId, "Enter the token name:")

  //   bot.sendMessage(chatId, "I'm deploying your token...")

  //   const mint = await splToken.createMint(
  //     connection,
  //     ownerKeypair,
  //     tokenInfo.mintAuthority,
  //     tokenInfo.freezeAuthority,
  //     tokenInfo.decimals,
  //     splToken.TOKEN_PROGRAM_ID
  //   )

  //   bot.sendMessage(chatId, `Successful!\n\ntoken address:\n${mint.toBase58()}`)
})

//other commands handling
bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const username = msg.from.username.toLowerCase()

  if (!verifyUser(username)) {
    bot.sendMessage(
      chatId,
      `Sorry @${username}, you're not authorized to use this bot. please contact the support team.`
    )
    return
  }

  if (msg.text.startsWith("/")) {
    const command = msg.text.split(" ")[0]
    if (commands.includes(command)) return
    else bot.sendMessage("Please input the correct command.")
  }

  if (!userSessions[chatId]) return

  switch (userSessions[chatId].step) {
    case "awaiting_name":
      userSessions[chatId].data.name = msg.text
      userSessions[chatId].step = "awaiting_symbol"
      bot.sendMessage(chatId, "Enter the token symbol:")
      break
    case "awaiting_symbol":
      userSessions[chatId].data.symbol = msg.text
      userSessions[chatId].step = "awaiting_decimals"
      bot.sendMessage(chatId, "Enter the token decimals:")
      break
    case "awaiting_decimals":
      userSessions[chatId].data.decimals = msg.text
      userSessions[chatId].step = "awaiting_totalsupply"
      bot.sendMessage(chatId, "Enter the token totalsupply:")
      break
    case "awaiting_totalsupply":
      userSessions[chatId].data.totalSupply = msg.text
      userSessions[chatId].step = "awaiting_deploy_confirm"
      bot.sendMessage(
        chatId,
        "Are you sure to deploy a new token to the Solana blokchain with data you entered above?\nplease reply only (yes/no)."
      )
      break
    case "awaiting_deploy_confirm":
      const answer = msg.text
      console.log(`Answer: ${answer}`)
      console.log()
      if (answer == "yes") {
        try {
          bot.sendMessage(chatId, "I'm deploying your token...")
          const { name, symbol, decimals, totalSupply } =
            userSessions[chatId].data
          console.log(
            `Name: ${name}\nSymbol:${symbol}\nDecimals: ${decimals}\nTotalSupply: ${totalSupply}\n`
          )
          const address = await deployToken(name, symbol, decimals, totalSupply)
          bot.sendMessage(
            chatId,
            `Deployed successfully!\n\n${symbol} address:\n${address}`
          )
          delete userSessions[chatId]
        } catch (error) {
          console.error(error)
          bot.sendMessage(
            "Something went wrong! please try it again with /deploy command."
          )
          delete userSessions[chatId]
        }
      } else if (answer == "no") {
        bot.sendMessage(
          chatId,
          "Please restart the token deployment with /deploytoken."
        )
        delete userSessions[chatId]
      } else {
        bot.sendMessage(
          chatId,
          "Wrong answer! please reply only with (yes/no)."
        )
      }
      break
  }
})

//bot error handling
bot.on("polling_error", (err) => console.log(err))

// const main = async () => {
//   const mint = await splToken.createMint(
//     connection,
//     ownerKeypair,
//     mintAuthority.publicKey,
//     freezeAuthority.publicKey,
//     9
//   )

//   console.log(mint.toBase58())
// }

// main()
//   .then(() => {
//     console.log("Successful!")
//   })
//   .catch((err) => {
//     console.error(err)
//   })
