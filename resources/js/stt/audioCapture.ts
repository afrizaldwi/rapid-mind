const WHISPER_SAMPLE_RATE = 16_000;

function stopTracks(stream: MediaStream | null): void {
    stream?.getTracks().forEach((track) => track.stop());
}

function resampleMono(
    audioBuffer: AudioBuffer,
    targetRate = WHISPER_SAMPLE_RATE,
): Float32Array {
    const sourceLength = audioBuffer.length;
    const mono = new Float32Array(sourceLength);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const samples = audioBuffer.getChannelData(channel);
        for (let index = 0; index < sourceLength; index++) {
            mono[index] += samples[index] / audioBuffer.numberOfChannels;
        }
    }

    if (audioBuffer.sampleRate === targetRate) return mono;

    const targetLength = Math.max(
        1,
        Math.round((sourceLength * targetRate) / audioBuffer.sampleRate),
    );
    const output = new Float32Array(targetLength);
    const ratio = audioBuffer.sampleRate / targetRate;

    for (let index = 0; index < targetLength; index++) {
        const sourcePosition = index * ratio;
        const left = Math.min(Math.floor(sourcePosition), sourceLength - 1);
        const right = Math.min(left + 1, sourceLength - 1);
        const weight = sourcePosition - left;
        output[index] = mono[left] * (1 - weight) + mono[right] * weight;
    }

    return output;
}

export class LocalAudioCapture {
    private stream: MediaStream | null = null;
    private recorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private cancelled = false;

    async start(): Promise<void> {
        if (this.recorder?.state === "recording") return;
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            throw new Error("MICROPHONE_UNSUPPORTED");
        }

        this.cancelled = false;
        this.chunks = [];
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            },
            video: false,
        });

        try {
            this.recorder = new MediaRecorder(this.stream);
            this.recorder.addEventListener("dataavailable", (event) => {
                if (event.data.size > 0) this.chunks.push(event.data);
            });
            this.recorder.start();
        } catch (error) {
            stopTracks(this.stream);
            this.stream = null;
            throw error;
        }
    }

    async stop(): Promise<Float32Array> {
        const recorder = this.recorder;
        if (!recorder || recorder.state !== "recording") {
            throw new Error("RECORDING_NOT_ACTIVE");
        }

        const blob = await new Promise<Blob>((resolve, reject) => {
            recorder.addEventListener(
                "stop",
                () =>
                    resolve(
                        new Blob(this.chunks, {
                            type: recorder.mimeType || "audio/webm",
                        }),
                    ),
                { once: true },
            );
            recorder.addEventListener(
                "error",
                () => reject(new Error("RECORDING_FAILED")),
                { once: true },
            );
            recorder.stop();
        }).finally(() => this.releaseRecorder());

        if (this.cancelled) throw new Error("RECORDING_CANCELLED");
        if (blob.size === 0) throw new Error("EMPTY_RECORDING");

        const audioContext = new AudioContext();
        try {
            const decoded = await audioContext.decodeAudioData(
                await blob.arrayBuffer(),
            );
            return resampleMono(decoded);
        } finally {
            await audioContext.close();
            this.chunks = [];
        }
    }

    cancel(): void {
        this.cancelled = true;
        if (this.recorder?.state === "recording") this.recorder.stop();
        this.releaseRecorder();
    }

    private releaseRecorder(): void {
        stopTracks(this.stream);
        this.stream = null;
        this.recorder = null;
    }
}
