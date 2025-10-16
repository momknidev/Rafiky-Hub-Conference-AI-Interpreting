import { Buffer } from 'node:buffer';
import EventEmitter from 'events';
import WebSocket from 'ws';
import { translateTextWithLLM } from './llmService.js';


export class PipeLineService extends EventEmitter {
  constructor(ttsService, transcriptionService, sourceLanguage, targetLanguage) {
    super();
    this.ttsService = ttsService;
    this.transcriptionService = transcriptionService;
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;

    this.transcriptionService.on("transcription", async (transcription) => {
      console.log('transcription: ', transcription);
      const response = await translateTextWithLLM(transcription, this.sourceLanguage, this.targetLanguage);
      console.log('translation: ', response.text);
      this.ttsService.sendText(response.text);
    });
  }

}

