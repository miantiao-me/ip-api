import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'
import app from './src/index'

const port = Number(process.env.PORT || 3000)
const server = createServer(async (request, response) => {
  const result = app.fetch({
    url: `http://localhost${request.url}`,
    headers: {
      get(name) {
        const value = request.headers[name.toLowerCase()]
        return Array.isArray(value) ? value.join(', ') : value ?? null
      }
    }
  })

  response.statusCode = result.status
  // 保持旧 Bun 服务的文本 Content-Type 和 HEAD 响应头行为。
  result.headers.forEach((value, name) => {
    if (name === 'content-type' && value.toLowerCase() === 'text/plain;charset=utf-8') {
      if (request.method === 'HEAD') return
      value = 'text/plain;charset=utf-8'
    }
    response.setHeader(name, value)
  })
  const body = await result.text()
  if (request.method === 'HEAD') {
    response.setHeader('content-length', Buffer.byteLength(body))
    response.end()
    return
  }
  response.end(body)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on 0.0.0.0:${port}`)
})
