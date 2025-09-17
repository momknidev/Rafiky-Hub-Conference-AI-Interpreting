// import waveFile from 'wavefile';
// import fs from 'fs';
// import path from 'path';


// // Usage Example:
// import { RTMPPusher } from './services/rtmpPusher.js';
// const rtmpUrl = "rtmp://rtls-ingress-prod-eu.agoramdn.com/live/pmUOWK2UWjuxHgcmD7vkXpnDhQbIcM2";
// const rtmpPusher = new RTMPPusher(rtmpUrl,24000);

// rtmpPusher.start();

// try {
//     const filePath = path.resolve('./interpreter-server/test-voice.wav');
//     console.log('Loading file from:', filePath);
//     const buffer = fs.readFileSync(filePath);
//     const wav = new waveFile.WaveFile(buffer);
//     wav.toSampleRate(44100);
//     const samples = Buffer.from(wav.data.samples);

//     console.log('WAV loaded, pushing chunk...');
//     rtmpPusher.pushChunk(samples);
//     rtmpPusher.pushChunk(samples);
//     rtmpPusher.pushChunk(samples);
//     rtmpPusher.pushChunk(samples);
// } catch (error) {
//     console.error('Error processing WAV file:', error);
// }


import express from 'express';
import expressWs from 'express-ws';
import { RTMPPusher } from './services/rtmpPusher.js';
import path from 'path';
import fs from 'fs';
import waveFile from 'wavefile';
import config from 'dotenv';
config.config({path: '.env.local'});
import { textToSpeechService } from './services/ttsService.js';

const app = express();
expressWs(app);


app.ws('/interpreter', (ws, req) => {
  const query = req.query;
  const language = query.language;
  const rtmpUrl = query.rtmpUrl;
  const rtmpPusher = new RTMPPusher(rtmpUrl,24000);
  rtmpPusher.start();


    //text to speech
    const ttsRef = textToSpeechService(rtmpPusher,{voice_id: "aura-2-thalia-en"})

  console.log('WebSocket connected', query);
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    const type = data.type;
    if(type === "translation"){
      const text = data.text;
      const language = data.language;
      console.log('Translation received', text, language);
      ttsRef.send(JSON.stringify({ 'type': 'Speak', 'text': text }));
      ttsRef.send(JSON.stringify({ 'type': 'Flush' }));
    }
      
  });

  ws.on('close', () => {
    rtmpPusher.stop();
  });
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});