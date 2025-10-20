import { Buffer } from 'node:buffer';
import EventEmitter from 'events';
import WebSocket from 'ws';
import { translateTextWithLLM } from './llmService.js';


export class PipeLineService extends EventEmitter {
  constructor(ttsService, transcriptionService, sourceLanguage, targetLanguage,ws) {
    super();
    this.ttsService = ttsService;
    this.transcriptionService = transcriptionService;
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.context = [];
    this.ws = ws;

    this.transcriptionService.on("transcription", async (transcription) => {
      console.log('transcription: ', transcription);
      this.context.push({ role: 'user', content: transcription });
      this.ws.send(JSON.stringify({ type: 'caption', transcription: transcription, language: this.targetLanguage }));
      const response = await translateTextWithLLM(transcription, this.sourceLanguage, this.targetLanguage, this.context);
      console.log('translation: ', response);
      this.context.push({ role: 'assistant', content: response.text || "" });


      //only last 10 messages in context
      this.context = this.context.slice(-10);
      this.ttsService.sendText(response.text);
    });
  }

}

