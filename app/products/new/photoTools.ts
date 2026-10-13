/**
 * Photo helpers for "Add with camera". Everything here runs in the admin's browser, free.
 *
 * Background removal uses IS-Net "general-use" (DIS, ECCV 2022, Apache-2.0 weights), the
 * general-object model behind tools like rembg, run with ONNX Runtime Web (MIT). Both are
 * loaded at runtime from pinned URLs, so nothing is added to the Next.js bundle. The model
 * (~44 MB, 8-bit) downloads on first use and is kept in the browser's Cache Storage.
 */

const ORT_VERSION = '1.29.0'
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`
// Pinned to a fixed commit of an Apache-2.0 mirror of the official DIS weights.
const MODEL_URL = 'https://huggingface.co/SacredNoir/isnet-general-use-onnx/resolve/ff56cb825ee2637d4726f8a739fb7bf1bf4bea04/isnet-general-use-q8.onnx'
const MODEL_SIZE = 1024
const CACHE_NAME = 'manokamna-photo-cleaner-v1'

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process the photo'))), type, quality)
  )
}

/** Shrinks a phone photo (often 4000px, 5–10 MB) and applies its EXIF rotation. */
export async function downscale(file: Blob, max = 1600, quality = 0.88): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return canvasToBlob(canvas, 'image/jpeg', quality)
}

async function loadModelBytes(onStatus?: (msg: string) => void): Promise<Uint8Array> {
  const cache = 'caches' in window ? await caches.open(CACHE_NAME).catch(() => null) : null
  const cached = await cache?.match(MODEL_URL)
  if (cached) return new Uint8Array(await cached.arrayBuffer())

  const res = await fetch(MODEL_URL)
  if (!res.ok || !res.body) throw new Error(`Could not download the photo cleaner (${res.status})`)
  const total = Number(res.headers.get('content-length')) || 44_436_071
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onStatus?.(`Downloading photo cleaner (first time only)… ${Math.min(99, Math.round((loaded / total) * 100))}%`)
  }
  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const c of chunks) { bytes.set(c, offset); offset += c.length }
  await cache?.put(MODEL_URL, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } })).catch(() => {})
  return bytes
}

let sessionPromise: Promise<{ ort: any; session: any }> | null = null

function getSession(onStatus?: (msg: string) => void) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort: any = await import(/* webpackIgnore: true */ `${ORT_BASE}ort.wasm.min.mjs`)
      ort.env.wasm.wasmPaths = ORT_BASE
      const bytes = await loadModelBytes(onStatus)
      onStatus?.('Starting photo cleaner…')
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
      return { ort, session }
    })().catch(err => {
      sessionPromise = null
      throw err
    })
  }
  return sessionPromise
}

/** Runs IS-Net and returns a 0–255 mask the size of the image (255 = product). */
async function productMask(bmp: ImageBitmap, onStatus?: (msg: string) => void): Promise<Uint8ClampedArray> {
  const { ort, session } = await getSession(onStatus)
  onStatus?.('Removing background…')

  // Model input: 1024×1024 RGB, (pixel − 128) / 256, channels first.
  const inCanvas = document.createElement('canvas')
  inCanvas.width = MODEL_SIZE
  inCanvas.height = MODEL_SIZE
  const ictx = inCanvas.getContext('2d')!
  ictx.drawImage(bmp, 0, 0, MODEL_SIZE, MODEL_SIZE)
  const rgba = ictx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data
  const plane = MODEL_SIZE * MODEL_SIZE
  const input = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    input[i] = (rgba[i * 4] - 128) / 256
    input[plane + i] = (rgba[i * 4 + 1] - 128) / 256
    input[2 * plane + i] = (rgba[i * 4 + 2] - 128) / 256
  }
  const feeds = { [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, MODEL_SIZE, MODEL_SIZE]) }
  const results = await session.run(feeds)
  const pred: Float32Array = results[session.outputNames[0]].data

  // Stretch to 0..1 (as the reference DIS code does), then draw back at the photo's size.
  let min = Infinity, max = -Infinity
  for (let i = 0; i < plane; i++) { const v = pred[i]; if (v < min) min = v; if (v > max) max = v }
  const range = max - min || 1
  const maskImg = ictx.createImageData(MODEL_SIZE, MODEL_SIZE)
  for (let i = 0; i < plane; i++) {
    const v = Math.round(((pred[i] - min) / range) * 255)
    maskImg.data[i * 4] = maskImg.data[i * 4 + 1] = maskImg.data[i * 4 + 2] = v
    maskImg.data[i * 4 + 3] = 255
  }
  ictx.putImageData(maskImg, 0, 0)
  const outCanvas = document.createElement('canvas')
  outCanvas.width = bmp.width
  outCanvas.height = bmp.height
  const octx = outCanvas.getContext('2d')!
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(inCanvas, 0, 0, bmp.width, bmp.height)
  const scaled = octx.getImageData(0, 0, bmp.width, bmp.height).data
  const mask = new Uint8ClampedArray(bmp.width * bmp.height)
  for (let i = 0; i < mask.length; i++) mask[i] = scaled[i * 4]
  return mask
}

/**
 * Keeps the product and drops small leftover blobs (bits of table, cloth, shelf). A blob is
 * kept if it is at least 15% the size of the largest one, so a separate cap or lid survives.
 */
function removeSpecks(mask: Uint8ClampedArray, w: number, h: number) {
  const labels = new Int32Array(w * h) // 0 = unvisited/background, n = blob id
  const sizes: number[] = [0]
  const stack: number[] = []
  for (let start = 0; start < w * h; start++) {
    if (labels[start] || mask[start] === 0) continue
    const id = sizes.length
    let size = 0
    labels[start] = id
    stack.push(start)
    while (stack.length) {
      const p = stack.pop()!
      size++
      const x = p % w
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < w * h && !labels[q] && mask[q] !== 0) {
          labels[q] = id
          stack.push(q)
        }
      }
    }
    sizes.push(size)
  }
  let largest = 0
  for (const s of sizes) if (s > largest) largest = s
  for (let p = 0; p < w * h; p++) {
    if (labels[p] && sizes[labels[p]] < largest * 0.15) mask[p] = 0
  }
}

/**
 * Removes the background and places the product centred on a white square, like
 * marketplace product shots. Throws if no product is found.
 */
export async function cleanProductPhoto(photo: Blob, onStatus?: (msg: string) => void, size = 1200): Promise<Blob> {
  const bmp = await createImageBitmap(photo)
  try {
    const w = bmp.width
    const h = bmp.height
    const mask = await productMask(bmp, onStatus)

    // Firm up the mask: unsure pixels (a table or cloth the model half-kept) become background,
    // with a short ramp so edges stay smooth.
    const LOW = 90, HIGH = 170
    for (let i = 0; i < mask.length; i++) {
      const a = mask[i]
      mask[i] = a <= LOW ? 0 : a >= HIGH ? 255 : Math.round(((a - LOW) / (HIGH - LOW)) * 255)
    }
    removeSpecks(mask, w, h)

    let minX = w, minY = h, maxX = -1, maxY = -1, kept = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x] > 0) {
          kept++
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < 0 || kept < w * h * 0.01) throw new Error('Could not find the product in the photo')

    // Cut-out: the photo with the mask as transparency.
    const cut = document.createElement('canvas')
    cut.width = w
    cut.height = h
    const cctx = cut.getContext('2d')!
    cctx.drawImage(bmp, 0, 0)
    const px = cctx.getImageData(0, 0, w, h)
    for (let i = 0; i < mask.length; i++) px.data[i * 4 + 3] = mask[i]
    cctx.putImageData(px, 0, 0)

    // Centre on white with ~8% margin each side.
    const boxW = maxX - minX + 1
    const boxH = maxY - minY + 1
    const scale = (size * 0.84) / Math.max(boxW, boxH)
    const out = document.createElement('canvas')
    out.width = size
    out.height = size
    const octx = out.getContext('2d')!
    octx.fillStyle = '#ffffff'
    octx.fillRect(0, 0, size, size)
    octx.imageSmoothingQuality = 'high'
    const dw = boxW * scale
    const dh = boxH * scale
    octx.drawImage(cut, minX, minY, boxW, boxH, (size - dw) / 2, (size - dh) / 2, dw, dh)
    return canvasToBlob(out, 'image/jpeg', 0.9)
  } finally {
    bmp.close()
  }
}
