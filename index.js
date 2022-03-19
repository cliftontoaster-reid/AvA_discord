require('dotenv').config()
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    AudioPlayerStatus,
    NoSubscriberBehavior
} = require('@discordjs/voice')

const {
    Wit,
    log
} = require('node-wit');
var search = require('youtube-search');
const witc = new Wit({
    accessToken: process.env.WIT_TOKEN,
    logger: new log.Logger(log.DEBUG) // optional
});
const ytdl = require('ytdl-core')

let audio
let connection
let player
let queue = []
let audiostat = {
    playing: false
}

const {
    Client,
    Intents,
    MessageEmbed
} = require('discord.js');
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
});

/// START FUNCTIONS

async function playAudio(track, message_discord) {
    let stream
    switch (track.type) {
        case 'youtube':
            stream = ytdl(track.link, {
                filter: 'audioonly'
            });
            break;
    }

    console.info(queue.length)
    

    if (audiostat.playing) {
        return console.log('added')
    }
    let now = queue.shift();
    console.info(queue.length)

    if (!message_discord) return console.error('message_discord is empty')
    connection = joinVoiceChannel({
        channelId: message_discord.member.voice.channel.id,
        guildId: message_discord.guild.id,
        adapterCreator: message_discord.guild.voiceAdapterCreator
    })
    player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
        },
    });


    var resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
    });
    player.play(resource);
    audiostat.playing = true
    player.addListener("stateChange", (oldOne, newOne) => {
        if (newOne.status == "idle") {
            audiostat.playing = false
            if (queue.length === 0) {
                return;
            } else {
                playAudio(queue[0], null)
            }
        }
    })
    player.on('error', console.error)

    connection.subscribe(player)
}

/// END FUNCTIONS

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('.')) return;
    if (message.author.bot) return
    witc.message(message.content, {})
        .then(async (data) => {
            if (data.intents[0].name === "YOUTUBE_PLAY") {
                let voiceChannel = message.member.voice.channel
                if (!voiceChannel) {
                    message.reply('Vous devez rejoindre un canal vocal pour utiliser cette commande.')
                    return
                }
                var opts = {
                    maxResults: 1,
                    key: process.env.GOOGLE_TOKEN
                };
                search(data.entities['YOUTUBE_VIDEO_TITLE:YOUTUBE_VIDEO_TITLE'][0].value, opts, function (err, results) {
                    if (err) return console.log(err);
                    let title = results[0].title.replace('&quot;', `'`)
                    message.reply(title)
                    let data = {
                        type: "youtube",
                        link: results[0].link
                    }
                    queue.push(data)
                    playAudio(data, message)

                    ;
                });

            } else if (data.intents[0].name === "AUDIO_PAUSE") {
                if (!player) return message.reply('Player does not exist')
                player.pause()
            }



        })
        .catch(console.error);

})

client.on('error', console.error);


client.login(process.env.DISCORD_TOKEN)