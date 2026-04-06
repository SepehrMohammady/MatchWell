#!/usr/bin/env node
// One-time script to update all locale files for v0.8.36 changes:
// 1. Add namePromptTitle, namePromptMessage, saveNameButton to multiplayer section
// 2. Update localPlay (remove Bluetooth/WiFi), add offline key, update description, hardwareReminder

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'locales');

// Translations for new/updated keys
const translations = {
    ar: {
        namePromptTitle: "ما اسمك؟",
        namePromptMessage: "اختر اسمًا سيراه اللاعبون الآخرون",
        saveNameButton: "هيا نلعب!",
        localPlay: "لعب محلي",
        offline: "غير متصل",
        description: "العب مع أصدقائك القريبين - بدون إنترنت!",
        hardwareReminder: "يرجى التأكد من تمكين Wi-Fi والموقع للحصول على اتصال ثابت."
    },
    cs: {
        namePromptTitle: "Jak se jmenuješ?",
        namePromptMessage: "Zvol si jméno, které uvidí ostatní hráči",
        saveNameButton: "Pojďme hrát!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    da: {
        namePromptTitle: "Hvad hedder du?",
        namePromptMessage: "Vælg et navn, som andre spillere vil se",
        saveNameButton: "Lad os spille!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    de: {
        namePromptTitle: "Wie heißt du?",
        namePromptMessage: "Wähle einen Namen, den andere Spieler sehen werden",
        saveNameButton: "Los geht's!",
        localPlay: "Lokales Spiel",
        offline: "Offline",
        description: "Spiele mit Freunden in der Nähe - kein Internet nötig!",
        hardwareReminder: "Bitte stellen Sie sicher, dass WLAN und Standortdienste aktiviert sind."
    },
    el: {
        namePromptTitle: "Πώς σε λένε;",
        namePromptMessage: "Επίλεξε ένα όνομα που θα βλέπουν οι άλλοι παίκτες",
        saveNameButton: "Πάμε να παίξουμε!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    es: {
        namePromptTitle: "¿Cómo te llamas?",
        namePromptMessage: "Elige un nombre que verán los demás jugadores",
        saveNameButton: "¡A jugar!",
        localPlay: "Juego Local",
        offline: "Sin conexión",
        description: "¡Juega con amigos cercanos - sin internet!",
        hardwareReminder: "Asegúrate de que el Wi-Fi y la Ubicación estén activados para una conexión estable."
    },
    fa: {
        namePromptTitle: "نام شما چیست؟",
        namePromptMessage: "نامی انتخاب کنید که بازیکنان دیگر خواهند دید",
        saveNameButton: "بزن بریم!",
        localPlay: "بازی محلی",
        offline: "آفلاین",
        description: "با دوستان نزدیک خود بازی کنید - بدون نیاز به اینترنت!",
        hardwareReminder: "لطفاً اطمینان حاصل کنید که Wi-Fi و مکان برای اتصال پایدار روشن هستند."
    },
    fi: {
        namePromptTitle: "Mikä on nimesi?",
        namePromptMessage: "Valitse nimi, jonka muut pelaajat näkevät",
        saveNameButton: "Pelataan!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    fr: {
        namePromptTitle: "Comment t'appelles-tu ?",
        namePromptMessage: "Choisis un nom que les autres joueurs verront",
        saveNameButton: "C'est parti !",
        localPlay: "Jeu Local",
        offline: "Hors ligne",
        description: "Jouez avec des amis proches - sans internet !",
        hardwareReminder: "Assurez-vous que le Wi-Fi et les services de localisation sont activés."
    },
    he: {
        namePromptTitle: "מה השם שלך?",
        namePromptMessage: "בחר שם שהשחקנים האחרים יראו",
        saveNameButton: "!בואו נשחק",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    hi: {
        namePromptTitle: "आपका नाम क्या है?",
        namePromptMessage: "एक नाम चुनें जो अन्य खिलाड़ी देखेंगे",
        saveNameButton: "चलो खेलते हैं!",
        localPlay: "स्थानीय खेल",
        offline: "ऑफ़लाइन",
        description: "पास के दोस्तों के साथ खेलें - इंटरनेट की आवश्यकता नहीं!",
        hardwareReminder: "स्थिर कनेक्शन के लिए कृपया सुनिश्चित करें कि Wi-Fi और स्थान सेवाएँ सक्षम हैं।"
    },
    hu: {
        namePromptTitle: "Hogy hívnak?",
        namePromptMessage: "Válassz egy nevet, amit a többi játékos látni fog",
        saveNameButton: "Játsszunk!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    id: {
        namePromptTitle: "Siapa namamu?",
        namePromptMessage: "Pilih nama yang akan dilihat pemain lain",
        saveNameButton: "Ayo main!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    it: {
        namePromptTitle: "Come ti chiami?",
        namePromptMessage: "Scegli un nome che gli altri giocatori vedranno",
        saveNameButton: "Giochiamo!",
        localPlay: "Gioco Locale",
        offline: "Offline",
        description: "Gioca con amici vicini - senza internet!",
        hardwareReminder: "Assicurati che Wi-Fi e posizione siano abilitati."
    },
    ja: {
        namePromptTitle: "お名前は？",
        namePromptMessage: "他のプレイヤーに表示される名前を入力してください",
        saveNameButton: "プレイ開始！",
        localPlay: "ローカルプレイ",
        offline: "オフライン",
        description: "近くの友達と遊ぼう - インターネット不要！",
        hardwareReminder: "安定した接続のために、Wi-Fiと位置情報が有効になっていることを確認してください。"
    },
    ko: {
        namePromptTitle: "이름이 뭐예요?",
        namePromptMessage: "다른 플레이어가 볼 이름을 선택하세요",
        saveNameButton: "플레이하자!",
        localPlay: "로컬 플레이",
        offline: "오프라인",
        description: "근처 친구와 플레이 - 인터넷 불필요!",
        hardwareReminder: "안정적인 연결을 위해 Wi-Fi 및 위치 서비스가 켜져 있는지 확인하세요."
    },
    nl: {
        namePromptTitle: "Hoe heet je?",
        namePromptMessage: "Kies een naam die andere spelers zullen zien",
        saveNameButton: "Laten we spelen!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    pl: {
        namePromptTitle: "Jak masz na imię?",
        namePromptMessage: "Wybierz nazwę, którą zobaczą inni gracze",
        saveNameButton: "Grajmy!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    pt: {
        namePromptTitle: "Qual é o seu nome?",
        namePromptMessage: "Escolha um nome que os outros jogadores verão",
        saveNameButton: "Vamos jogar!",
        localPlay: "Jogo Local",
        offline: "Offline",
        description: "Jogue com amigos próximos - sem internet!",
        hardwareReminder: "Certifique-se de que Wi-Fi e Localização estão ativados."
    },
    ro: {
        namePromptTitle: "Cum te numești?",
        namePromptMessage: "Alege un nume pe care ceilalți jucători îl vor vedea",
        saveNameButton: "Hai să jucăm!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    ru: {
        namePromptTitle: "Как тебя зовут?",
        namePromptMessage: "Выбери имя, которое увидят другие игроки",
        saveNameButton: "Поехали!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    sv: {
        namePromptTitle: "Vad heter du?",
        namePromptMessage: "Välj ett namn som andra spelare ser",
        saveNameButton: "Nu kör vi!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    sw: {
        namePromptTitle: "Jina lako ni nani?",
        namePromptMessage: "Chagua jina ambalo wachezaji wengine wataona",
        saveNameButton: "Tucheze!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    th: {
        namePromptTitle: "คุณชื่ออะไร?",
        namePromptMessage: "เลือกชื่อที่ผู้เล่นคนอื่นจะเห็น",
        saveNameButton: "เล่นเลย!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    tl: {
        namePromptTitle: "Ano ang pangalan mo?",
        namePromptMessage: "Pumili ng pangalan na makikita ng ibang manlalaro",
        saveNameButton: "Maglaro na!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    tr: {
        namePromptTitle: "Adın ne?",
        namePromptMessage: "Diğer oyuncuların göreceği bir isim seç",
        saveNameButton: "Hadi oynayalım!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    uk: {
        namePromptTitle: "Як тебе звати?",
        namePromptMessage: "Обери ім'я, яке бачитимуть інші гравці",
        saveNameButton: "Грати!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    vi: {
        namePromptTitle: "Tên bạn là gì?",
        namePromptMessage: "Chọn tên mà người chơi khác sẽ thấy",
        saveNameButton: "Chơi thôi!",
        localPlay: "Local Play",
        offline: "Offline",
        description: "Play with friends nearby - no internet needed!",
        hardwareReminder: "Please ensure Wi-Fi and Location services are enabled for stable connections."
    },
    zh: {
        namePromptTitle: "你叫什么名字？",
        namePromptMessage: "选择一个其他玩家会看到的名字",
        saveNameButton: "开始游戏！",
        localPlay: "本地游戏",
        offline: "离线",
        description: "与附近的朋友一起玩 - 无需网络！",
        hardwareReminder: "为获得稳定的连接，请确保已启用Wi-Fi和位置服务。"
    }
};

let updated = 0;
let errors = 0;

for (const [lang, trans] of Object.entries(translations)) {
    const filePath = path.join(localesDir, `${lang}.json`);
    
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Add new keys to multiplayer section
        if (content.multiplayer) {
            // Insert after enterName
            content.multiplayer.namePromptTitle = trans.namePromptTitle;
            content.multiplayer.namePromptMessage = trans.namePromptMessage;
            content.multiplayer.saveNameButton = trans.saveNameButton;
        }
        
        // Update localMultiplayer section
        if (content.localMultiplayer) {
            content.localMultiplayer.localPlay = trans.localPlay;
            content.localMultiplayer.offline = trans.offline;
            content.localMultiplayer.description = trans.description;
            content.localMultiplayer.hardwareReminder = trans.hardwareReminder;
        }
        
        // Write back with proper formatting
        fs.writeFileSync(filePath, JSON.stringify(content, null, 4) + '\n', 'utf8');
        updated++;
        console.log(`✓ Updated ${lang}.json`);
    } catch (err) {
        errors++;
        console.error(`✗ Error updating ${lang}.json:`, err.message);
    }
}

console.log(`\nDone: ${updated} updated, ${errors} errors`);
