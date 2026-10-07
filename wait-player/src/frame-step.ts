import { BlobSource, Input, EncodedPacketSink, MP4, QTFF, MATROSKA, OGG, MPEG_TS } from 'mediabunny';

/** Seek by presentation timestamps, including variable-rate video and B-frames. */
export class FrameStepper {
  private input: Input;
  private sink: Promise<EncodedPacketSink>;
  constructor(file: Blob) {
    this.input = new Input({ source: new BlobSource(file), formats: [MP4, QTFF, MATROSKA, OGG, MPEG_TS] });
    this.sink = this.input.getPrimaryVideoTrack().then(track => {
      if (!track) throw new Error('frame stepping is unavailable for this file');
      return new EncodedPacketSink(track);
    });
  }
  dispose() { this.input.dispose(); }
  async step(time: number, direction: -1 | 1): Promise<number> {
    const sink = await this.sink, options = { metadataOnly: true };
    const current = await sink.getPacket(time + 1e-7, options) ?? await sink.getFirstPacket(options);
    if (!current) return time;
    if (direction < 0) {
      const previous = await sink.getPacket(current.timestamp - 1e-6, options);
      return Math.max(0, (previous ?? current).timestamp + 1e-7);
    }
    // getNextPacket is decode order, which can skip backward/forward with B-frames.
    // Find the adjacent presentation timestamp with bounded metadata-only queries.
    let next = await sink.getPacket(Infinity, options);
    if (!next || next.timestamp <= current.timestamp) return Math.max(0, current.timestamp + 1e-7);
    let low = current.timestamp, high = next.timestamp;
    for (let i = 0; i < 48 && high - low > 1e-7; i++) {
      const mid = (low + high) / 2, packet = await sink.getPacket(mid, options);
      if (packet && packet.timestamp > current.timestamp) { next = packet; high = packet.timestamp; }
      else low = mid;
    }
    return Math.max(0, next.timestamp + 1e-7);
  }
}
