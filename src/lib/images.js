// Fotos de la carta: se recortan a 4:3 y se comprimen en el navegador antes de guardarlas
const toBlob = (canvas, type, quality) => new Promise((res) => canvas.toBlob(res, type, quality))

export async function compressPhoto(file, width = 900) {
  let bmp
  try { bmp = await createImageBitmap(file) } catch { throw new Error('No pudimos leer esa imagen. Prueba con una foto JPG o PNG.') }
  const side = Math.min(bmp.width, bmp.height * 4 / 3)
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(width, Math.round(side))
  canvas.height = Math.round(canvas.width * 3 / 4)
  canvas.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side * 3 / 4) / 2, side, side * 3 / 4, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const webp = await toBlob(canvas, 'image/webp', 0.8)
  // Safari no genera WebP: devuelve PNG, que pesa demasiado
  return webp?.type === 'image/webp' ? webp : toBlob(canvas, 'image/jpeg', 0.8)
}
