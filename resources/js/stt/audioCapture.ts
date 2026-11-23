const WHISPER_SAMPLE_RATE = 16_000;
const SILENCE_THRESHOLD = 0.008;
const SILENCE_MARGIN_SECONDS = 0.25;

function stopTracks(stream: MediaStream | null): void {
    stream?.getTracks().forEach((track) => track.stop());
}

export function trimSilence(
    samples: Float32Array,
    sampleRate = WHISPER_SAMPLE_RATE,
): Float32Array {
    const length = samples.length;
    if (length === 0) return samples;

    let firstActive = -1;
    for (let i = 0; i < length; i++) {
        if (Math.abs(samples[i]) >= SILENCE_THRESHOLD) {
            firstActive = i;
            break;
        }
    }

    if (firstActive === -1) {
        return samples.subarray(0, Math.min(length, Math.round(sampleRate * 0.5)));
    }

    let lastActive = firstActive;
    for (let i = length - 1; i >= firstActive; i--) {
        if (Math.abs(samples[i]) >= SILENCE_THRESHOLD) {
            lastActive = i;
            break;
        }
    }

    const margin = Math.round(sampleRate * SILENCE_MARGIN_SECONDS);
    const start = Math.max(0, firstActive - margin);
    const end = Math.min(length, lastActive + margin + 1);
    if (start === 0 && end === length) return samples;
    return samples.slice(start, end);
}

export function resampleMono(
    audioBuffer: AudioBuffer,
    targetRate = WHISPER_SAMPLE_RATE,
): Float32Array {
    const sourceLength = audioBuffer.length;
    const numChannels = audioBuffer.numberOfChannels;
    const mono =
        numChannels === 1
            ? new Float32Array(audioBuffer.getChannelData(0))
            : new Float32Array(sourceLength);

    if (numChannels > 1) {
        const scale = 1 / numChannels;
        for (let channel = 0; channel < numChannels; channel++) {
            const samples = audioBuffer.getChannelData(channel);
            for (let index = 0; index < sourceLength; index++) {
                mono[index] += samples[index] * scale;
            }
        }
    }

    if (audioBuffer.sampleRate === targetRate) return trimSilence(mono, targetRate);

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

    return trimSilence(output, targetRate);
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

        let audioContext: AudioContext;
        try {
            audioContext = new AudioContext({ sampleRate: WHISPER_SAMPLE_RATE });
        } catch {
            audioContext = new AudioContext();
        }
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
