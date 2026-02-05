class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048; // Larger buffer for 48kHz -> 16kHz downsampling
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    // Downsample from 48kHz to 16kHz (3:1 ratio)
    downsample(input) {
        const ratio = 3;
        const outputLength = Math.floor(input.length / ratio);
        const output = new Float32Array(outputLength);
        
        for (let i = 0; i < outputLength; i++) {
            output[i] = input[i * ratio];
        }
        return output;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputChannel = input[0];
            const downsampled = this.downsample(inputChannel);

            // Fill the buffer
            for (let i = 0; i < downsampled.length; i++) {
                if (this.bufferIndex < this.bufferSize) {
                    this.buffer[this.bufferIndex++] = downsampled[i];
                } else {
                    // Buffer full, send it
                    this.port.postMessage(this.buffer.slice(0, this.bufferIndex));
                    this.bufferIndex = 0;
                    this.buffer[this.bufferIndex++] = downsampled[i];
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
