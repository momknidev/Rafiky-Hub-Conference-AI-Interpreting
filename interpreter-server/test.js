// import { PassThrough } from 'stream';
// import ffmpeg from 'fluent-ffmpeg';
// import waveFile from 'wavefile';
// import fs from 'fs';
// import path from 'path';

// class SmoothAudioStreamer {
//     constructor(outputStream, frameDurationMs = 20, sampleRate = 44100, channels = 2, sampleSize = 2) {
//         this.outputStream = outputStream;
//         this.frameDurationMs = frameDurationMs;
//         this.sampleRate = sampleRate;
//         this.channels = channels;
//         this.sampleSize = sampleSize;
//         this.frameSize = Math.floor((sampleRate * frameDurationMs) / 1000) * channels * sampleSize;
//         this.buffer = Buffer.alloc(0);
//         this.silence = Buffer.alloc(this.frameSize, 0x00);
//         this.timer = null;
//     }

//     start() {
//         this.timer = setInterval(() => this.processFrame(), this.frameDurationMs);
//     }

//     stop() {
//         clearInterval(this.timer);
//     }

//     addChunk(chunk) {
//         this.buffer = Buffer.concat([this.buffer, chunk]);
//     }

//     processFrame() {
//         let frame;
//         if (this.buffer.length >= this.frameSize) {
//             frame = this.buffer.slice(0, this.frameSize);
//             this.buffer = this.buffer.slice(this.frameSize);
//         } else if (this.buffer.length > 0) {
//             frame = Buffer.alloc(this.frameSize, 0x00);
//             this.buffer.copy(frame, 0);
//             this.buffer = Buffer.alloc(0);
//         } else {
//             frame = this.silence;
//         }
//         this.outputStream.write(frame);
//     }
// }

// const outputStream = new PassThrough();
// const streamer = new SmoothAudioStreamer(outputStream, 20, 44100, 2, 2);
// streamer.start();

// function onChunkReceived(chunk) {
//     streamer.addChunk(chunk);
// }

// ffmpeg(outputStream)
//     .inputFormat('s16le')
//     .audioFrequency(44100)
//     .audioChannels(2)
//     .audioCodec('aac')
//     .format('flv')
//     .output("rtmp://rtls-ingress-prod-eu.agoramdn.com/live/pmUOWK2UWjuxHgcmD7vkXpnDhQbIcM2")
//     .on('start', () => console.log('FFmpeg started'))
//     .on('error', (err) => console.error('FFmpeg error:', err))
//     .on('end', () => console.log('FFmpeg ended'))
//     .run();

// console.log('Now trying to push to stream');

// try {
//     const filePath = path.resolve('./interpreter-server/test-voice.wav');
//     console.log('Loading file from:', filePath);
//     const buffer = fs.readFileSync(filePath);
//         const wav = new waveFile.WaveFile(buffer);
//     wav.toSampleRate(44100); // Match ffmpeg's expected sample rate
//     const samples = Buffer.from(wav.data.samples);

//     console.log('WAV loaded, pushing chunk...');
//     onChunkReceived(samples);
//     onChunkReceived(samples);
//     onChunkReceived(samples);
//     onChunkReceived(samples);
// } catch (error) {
//     console.error('Error processing WAV file:', error);
// }

















// Usage Example:

const rtmpUrl = "rtmp://rtls-ingress-prod-eu.agoramdn.com/live/pmUOWK2UWjuxHgcmD7vkXpnDhQbIcM2";
const rtmpPusher = new RTMPPusher(rtmpUrl);

rtmpPusher.start();

try {
    const filePath = path.resolve('./interpreter-server/test-voice.wav');
    console.log('Loading file from:', filePath);
    const buffer = fs.readFileSync(filePath);
    const wav = new waveFile.WaveFile(buffer);
    wav.toSampleRate(44100);
    const samples = Buffer.from(wav.data.samples);

    console.log('WAV loaded, pushing chunk...');
    rtmpPusher.pushChunk(samples);
    rtmpPusher.pushChunk(samples);
    rtmpPusher.pushChunk(samples);
    rtmpPusher.pushChunk(samples);
} catch (error) {
    console.error('Error processing WAV file:', error);
}

// Stop after some time for demonstration
// setTimeout(() => {
//     rtmpPusher.stop();
// }, 10000);
