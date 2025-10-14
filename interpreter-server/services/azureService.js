import {
    AudioStreamFormat,
    AudioConfig,
    CancellationErrorCode,
    OutputFormat,
    ResultReason,
    SpeechTranslationConfig,
    TranslationRecognizer,
    SpeakerAudioDestination,
    SpeechSynthesisOutputFormat,
    PullAudioOutputStream,
    PushAudioInputStream,
} from "microsoft-cognitiveservices-speech-sdk";
import { WebSocket } from "ws";


export const azureService  = (rtmpPusher, cfg) => {
    console.log('azure TTS: cfg', cfg);
    const subscriptionKey = cfg.apiKey || process.env.AZURE_SPEECH_KEY;
    const region = cfg.region || process.env.AZURE_SPEECH_REGION; 
    const speechConfig = SpeechTranslationConfig.fromSubscription(subscriptionKey, region);

    const fromLang = cfg.fromLang || "en";
    const ttsLang  = cfg.ttsLang  || "hi";                // audio target locale
    const voice    = cfg.voiceName || "";                    // optional
    const outFmt   = (cfg.outFormat || "pcm").toLowerCase();



    speechConfig.speechRecognitionLanguage = "en-US";
    speechConfig.addTargetLanguage("de");


    speechConfig.setProperty("SpeechServiceResponse_OutputFormatOption", "raw-16khz-16bit-mono-pcm");
    speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm;


    speechConfig.speechSynthesisLanguage = ttsLang;
    if (voice) speechConfig.voiceName = voice;

    // Input: PCM16 LE mono 16kHz
    const format = AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = PushAudioInputStream.create(format);
    const audioCfg = AudioConfig.fromStreamInput(pushStream);

    const recognizer = new TranslationRecognizer(speechConfig, audioCfg);

    // TTS output stream (pull) so we can relay chunks over WS
    const pullingStream = PullAudioOutputStream.create();

    recognizer.synthesizing = (_, e) => {
        const buf = e.result?.audioData || e.result?.getAudio();
        if (!buf || !buf.byteLength) return;
        const b64 = Buffer.from(buf).toString("base64");
        console.log('azure TTS: chunk', b64);
    };


    recognizer.recognizing = (_, e) => {
        const tr = [];
        if (e.result?.translations) {
          e.result.translations.forEach((val, key) => tr.push({ lang: key, text: val }));
        }

        console.log('azure TTS: partial', tr);
    };

     // final text
    recognizer.recognized = (_, e) => {
        if (e.result?.reason === ResultReason.TranslatedSpeech) {
          const tr = [];
          e.result.translations.forEach((val, key) => tr.push({ lang: key, text: val }));
          console.log('azure TTS: final', tr);
        }
    };

    recognizer.canceled = (_, e) => {
        const code = e.errorCode || CancellationErrorCode.NoError;
        console.log('azure TTS: canceled', code);
    };

    recognizer.sessionStopped = () => {
        console.log('azure TTS: closed');
    };


    recognizer.outputFormat = OutputFormat.Detailed;

    recognizer.startContinuousRecognitionAsync(
        () => console.log('azure TTS: started'),
        (err) => console.log('azure TTS: error', String(err))
    );

    const close = () => {
        if (pushStream) {
            pushStream.close();
        }
        if (recognizer) {
            recognizer.stopContinuousRecognitionAsync(() => { 
                console.log('azure TTS: stopped')
            },
            (err) => {
                console.log('azure TTS: error', String(err))
            }
            );

            recognizer.stopContinuousRecognitionAsync(()=>{
                console.log('azure TTS: stopped');
            },(err)=>{
                console.log('azure TTS: error', String(err));
            });
            recognizer.close();
        }
    }

    const sendAudio = (audio) => {
        const pcmBuf = Buffer.from(audio, 'base64');
        pushStream.write(pcmBuf);
    }


    return {
        close,
        sendAudio,
        ws: {readyState: WebSocket.OPEN}
    }
}