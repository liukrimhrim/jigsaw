declare module 'heic-decode' {
  interface DecodeResult {
    width: number
    height: number
    data: ArrayBuffer
  }
  export default function decode(opts: { buffer: Uint8Array }): Promise<DecodeResult>
}
