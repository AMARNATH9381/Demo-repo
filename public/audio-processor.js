class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 512; // Buffer size ~32ms at 16kHz
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputChannel = input[0];

            // Fill the buffer
            for (let i = 0; i < inputChannel.length; i++) {
                if (this.bufferIndex < this.bufferSize) {
                    this.buffer[this.bufferIndex++] = inputChannel[i];
                } else {
                    // Buffer full, send it
                    this.port.postMessage(this.buffer);
                    this.bufferIndex = 0;
                    this.buffer[this.bufferIndex++] = inputChannel[i];
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
