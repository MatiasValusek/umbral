// Codificación a MP4 en el navegador (WebCodecs + mediabunny). Se carga solo al grabar.
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from 'mediabunny'

export async function crearMp4(lienzo: HTMLCanvasElement, ancho: number, alto: number, fps: number) {
  // H.264 primero: es lo que abren todos los reproductores, WhatsApp e Instagram
  const codec = await getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width: ancho, height: alto })
  if (!codec)
    throw new Error(
      `Este navegador no puede codificar video a ${ancho} × ${alto}. Probá con un formato más chico o con Chrome / Edge actualizados.`,
    )
  const destino = new BufferTarget()
  const salida = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: destino })
  const fuente = new CanvasSource(lienzo, { codec, quality: QUALITY_HIGH, keyFrameInterval: 2 })
  salida.addVideoTrack(fuente, { frameRate: fps })
  await salida.start()

  return {
    codec,
    /** Captura el lienzo como el cuadro n (respeta la cola del codificador) */
    agregar: (n: number) => fuente.add(n / fps, 1 / fps),
    async terminar() {
      await salida.finalize()
      return destino.buffer ? new Blob([destino.buffer], { type: 'video/mp4' }) : null
    },
    async cancelar() {
      if (salida.state !== 'finalized' && salida.state !== 'canceled') await salida.cancel().catch(() => {})
    },
  }
}
