export const LanguageBotMap = {
    arabicEG:   { subId: 90001, pubId: 90002, hostUid: 200001, langCode: "ar-EG" },
    arabicJO:   { subId: 90003, pubId: 90004, hostUid: 200002, langCode: "ar-JO" },
    arabicSA:   { subId: 90005, pubId: 90006, hostUid: 200003, langCode: "ar-SA" },
    arabic:   { subId: 90007, pubId: 90008, hostUid: 200004, langCode: "ar-AE" },
    bengali:    { subId: 90009, pubId: 90010, hostUid: 200005, langCode: "bn-IN" },
    chinese:    { subId: 90011, pubId: 90012, hostUid: 200006, langCode: "zh-CN" },
    chineseHK:  { subId: 90013, pubId: 90014, hostUid: 200007, langCode: "zh-HK" },
    chineseTW:  { subId: 90015, pubId: 90016, hostUid: 200008, langCode: "zh-TW" },
    dutch:      { subId: 90017, pubId: 90018, hostUid: 200009, langCode: "nl-NL" },
    englishIN:  { subId: 90019, pubId: 90020, hostUid: 200010, langCode: "en-IN" },
    english:  { subId: 90021, pubId: 90022,hostUid: 200011, langCode: "en-US" },
    filipino:   { subId: 90023, pubId: 90024,hostUid: 200012, langCode: "fil-PH" },
    french:     { subId: 90025, pubId: 90026,hostUid: 200013, langCode: "fr-FR" },
    german:     { subId: 90027, pubId: 90028, hostUid: 200014, langCode: "de-DE" },
    gujarati:   { subId: 90029, pubId: 90030, hostUid: 200015, langCode: "gu-IN" },
    hebrew:     { subId: 90031, pubId: 90032, hostUid: 200016, langCode: "he-IL" },
    hindi:      { subId: 90033, pubId: 90034, hostUid: 200017, langCode: "hi-IN" },
    indonesian: { subId: 90035, pubId: 90036, hostUid: 200018, langCode: "id-ID" },
    italian:    { subId: 90037, pubId: 90038, hostUid: 200019, langCode: "it-IT" },
    japanese:   { subId: 90039, pubId: 90040, hostUid: 200020, langCode: "ja-JP" },
    kannada:    { subId: 90041, pubId: 90042, hostUid: 200021, langCode: "kn-IN" },
    korean:     { subId: 90043, pubId: 90044, hostUid: 200022, langCode: "ko-KR" },
    malay:      { subId: 90045, pubId: 90046, hostUid: 200023, langCode: "ms-MY" },
    persian:    { subId: 90047, pubId: 90048, hostUid: 200024, langCode: "fa-IR" },
    portuguese: { subId: 90049, pubId: 90050, hostUid: 200025, langCode: "pt-PT" },
    russian:    { subId: 90051, pubId: 90052, hostUid: 200026, langCode: "ru-RU" },
    spanish:    { subId: 90053, pubId: 90054, hostUid: 200027, langCode: "es-ES" },
    tamil:      { subId: 90055, pubId: 90056, hostUid: 200028, langCode: "ta-IN" },
    telugu:     { subId: 90057, pubId: 90058, hostUid: 200029, langCode: "te-IN" },
    thai:       { subId: 90059, pubId: 90060, hostUid: 200030, langCode: "th-TH" },
    turkish:    { subId: 90061, pubId: 90062, hostUid: 200031, langCode: "tr-TR" },
    vietnamese: { subId: 90063, pubId: 90064, hostUid: 200032, langCode: "vi-VN" }
} 


export const defaultData = {
    subId: 900089,
    pubId: 900090,
    hostUid: 2000579,
    langCode: "en-US"
}


export const interpreters = [
    "english",
    // "russian",
    "italian",
    "french",
    "spanish",
    "german",
]

export const codeToLanguage = {
    "hi-IN": "hindi",
    "de-DE": "german",
    "fr-FR": "french",
    "es-ES": "spanish",
    "it-IT": "italian",
    "pt-PT": "portuguese",
    "ru-RU": "russian",
    "ar-EG": "arabic",
    "ar-JO": "arabic",
    "ar-SA": "arabic",
    "ar-AE": "arabic",
    "bn-IN": "bengali",
    "zh-CN": "chinese",
    "zh-HK": "chinese",
    "zh-TW": "chinese",
    "nl-NL": "dutch",
    "en-IN": "english",
    "en-US": "english",
    "fil-PH": "filipino",
    "id-ID": "indonesian",
    "ja-JP": "japanese",
    "kn-IN": "kannada",
    "ko-KR": "korean",
    "ms-MY": "malay",
    "fa-IR": "persian",
    "pt-PT": "portuguese",
    "ru-RU": "russian",
    "es-ES": "spanish",
    "ta-IN": "tamil",
    "te-IN": "telugu",
    "th-TH": "thai",
}



export const languageToCode = {
    hindi: "hi-IN",
    german: "de-DE",
    french: "fr-FR",
    spanish: "es-ES",
    italian: "it-IT",
    portuguese: "pt-PT",
    russian: "ru-RU",
    arabic: "ar-EG",
    bengali: "bn-IN",
    chinese: "zh-CN",  
    dutch: "nl-NL",
    english: "en-US",  
    filipino: "fil-PH",
    indonesian: "id-ID",
    japanese: "ja-JP",
    kannada: "kn-IN",
    korean: "ko-KR",
    malay: "ms-MY",
    persian: "fa-IR",
    tamil: "ta-IN",
    telugu: "te-IN",
    thai: "th-TH",
  };
  

export const intrepreterUids = {
    "hindi": 600001,
    "german": 600002,
    "french": 600003,
    "spanish": 600004,
    "italian": 600005,
    "portuguese": 600006,
    "russian": 600007,
    "arabic": 600008,
    "bengali": 600009,
    "chinese": 600010,
    "dutch": 600011,
    "english": 600012,
    "filipino": 600013,
    "indonesian": 600014,
    "japanese": 600015,
    "kannada": 600016,
    "korean": 600017,
    "malay": 600018,
    "persian": 600019,
    "portuguese": 600020,
    "russian": 600021,
    "spanish": 600022,
    "tamil": 600023,
    "telugu": 600024,
    "thai": 600025,
    "turkish": 600026,
    "vietnamese": 600027,
}



export const ttsProviders = [
    {
        name: "Primary",
        value: "cartesia"
    },
    {
        name: "Backup 1",
        value: "elevenlabs"
    },
    // {
    //     name: "Backup 2",
    //     value: "smallest"
    // }
    {
        name: "Backup 2",
        value: "deepgram"
    },
]