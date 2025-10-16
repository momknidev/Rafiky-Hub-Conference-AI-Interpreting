import {
    AudioConfig,
    ResultReason,
    SpeechTranslationConfig,
    TranslationRecognizer,
    CancellationReason,
  } from "microsoft-cognitiveservices-speech-sdk";
  import dotenv from "dotenv";
  dotenv.config({ path: ".env.local" });
  
  const subscriptionKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  if (!subscriptionKey || !region) {
    console.error("Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION in .env.local");
    process.exit(1);
  }
  
  // 1) Build config and set languages BEFORE making the recognizer
  const cfg = SpeechTranslationConfig.fromSubscription(subscriptionKey, region);
  
  // source speech locale (full BCP-47):
  cfg.speechRecognitionLanguage = "en-US";
  
  // add at least one translation target (text). For German it's "de".
  cfg.addTargetLanguage("de");
  
  // OPTIONAL: if you also want synthesized speech in the target language:
  // cfg.speechSynthesisLanguage = "de-DE";               // full locale for TTS
  // cfg.voiceName = "de-DE-KatjaNeural";                 // a valid neural voice
  // cfg.speechSynthesisOutputFormat =
  //   SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm;  // or an MP3 format
  
  // 2) Audio source
  // For quick local testing on desktop Node, this can work. If it doesn’t on your OS,
  // switch to PushAudioInputStream and feed PCM16 chunks yourself.
  const audioCfg = AudioConfig.fromDefaultMicrophoneInput();
  
  // 3) Now create the recognizer
  const recognizer = new TranslationRecognizer(cfg, audioCfg);
  
  // 4) Events
  recognizer.recognizing = (_, e) => {
    console.log("PARTIAL src:", e.result.text);
    e.result.translations?.forEach((val, key) =>
      console.log(`  → ${key}: ${val}`)
    );
  };
  
  recognizer.recognized = (_, e) => {
    if (e.result.reason === ResultReason.TranslatedSpeech) {
      console.log("FINAL src:", e.result.text);
      e.result.translations.forEach((val, key) =>
        console.log(`  → ${key}: ${val}`)
      );
    } else if (e.result.reason === ResultReason.NoMatch) {
      console.log("NoMatch: speech could not be translated.");
    }
  };
  
  recognizer.canceled = (_, e) => {
    console.log("CANCELED:", e.reason, e.errorCode, e.errorDetails || "");
    if (e.reason === CancellationReason.Error) {
      console.log("Check your key/region and language/voice settings.");
    }
    recognizer.stopContinuousRecognitionAsync();
  };
  
  recognizer.sessionStopped = () => {
    console.log("Session stopped.");
    recognizer.stopContinuousRecognitionAsync();
  };
  
  // 5) Start (choose one mode — continuous OR once)
  // Continuous:
  recognizer.startContinuousRecognitionAsync();
  
  // If you prefer single-shot instead of continuous, comment out the line above and use:
  // recognizer.recognizeOnceAsync(r => {
  //   console.log("Once:", r.text);
  //   recognizer.close();
  // });
  