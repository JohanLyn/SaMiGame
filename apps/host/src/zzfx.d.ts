declare module 'zzfx' {
  export const ZZFX: {
    sampleRate: number;
    volume: number;
    buildSamples(...params: number[]): number[];
  };
  export function zzfx(...params: number[]): AudioBufferSourceNode;
}
