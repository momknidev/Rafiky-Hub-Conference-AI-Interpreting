import { PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';


export class SmoothAudioStreamer {
    constructor(outputStream, frameDurationMs = 20, sampleRate = 48000, channels = 1, sampleSize = 2) {
        this.outputStream = outputStream;
        this.frameDurationMs = frameDurationMs;
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.sampleSize = sampleSize;
        this.frameSize = Math.floor((sampleRate * frameDurationMs) / 1000) * channels * sampleSize;
        this.buffer = Buffer.alloc(0);
        this.silence = Buffer.alloc(this.frameSize, 0x00);
        this.timer = null;
    }


    start() {
        this.timer = setInterval(() => this.processFrame(), this.frameDurationMs);
    }

    stop() {
        clearInterval(this.timer);
    }

    addChunk(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
    }

    processFrame() {
        let frame;
        if (this.buffer.length >= this.frameSize) {
            frame = this.buffer.slice(0, this.frameSize);
            this.buffer = this.buffer.slice(this.frameSize);
        } else if (this.buffer.length > 0) {
            frame = Buffer.alloc(this.frameSize, 0x00);
            this.buffer.copy(frame, 0);
            this.buffer = Buffer.alloc(0);
        } else {
            frame = this.silence;
        }
        this.outputStream.write(frame);
    }
}

export class RTMPPusher {
    constructor(rtmpUrl, sampleRate = 48000, channels = 1, frameDurationMs = 20, sampleSize = 2) {
        this.rtmpUrl = rtmpUrl;
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.frameDurationMs = frameDurationMs;
        this.sampleSize = sampleSize;

        this.outputStream = new PassThrough();
        this.streamer = new SmoothAudioStreamer(
            this.outputStream,
            frameDurationMs,
            sampleRate,
            channels,
            sampleSize
        );
        this.ffmpegProcess = null;
    }

    start() {
        this.streamer.start();

        this.ffmpegProcess = ffmpeg(this.outputStream)
            .inputFormat('s16le')
            .audioFrequency(this.sampleRate)
            .audioChannels(this.channels)
            .audioCodec('aac')
            .format('flv')
            .output(this.rtmpUrl)
            .on('start', () => console.log('FFmpeg started'))
            .on('error', (err) => console.error('FFmpeg error:', err))
            .on('end', () => console.log('FFmpeg ended'))
            .run();

        console.log('RTMPPusher started.');
    }

    stop() {
        this.streamer.stop();
        if (this.ffmpegProcess) {
            this.ffmpegProcess.kill('SIGKILL');
            console.log('FFmpeg process stopped.');
        }
    }

    pushChunk(chunk) {
        this.streamer.addChunk(chunk);
    }
}