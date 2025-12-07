# IP-API

利用 Cloudflare Workers / Vercel Edge / Netlify Edge 快速搭一个获取 IP 地址和地理位置信息的接口。

## 使用方式

### 自动化调用

**如果你有程序自动化调用需求，请使用下面的 API , 不限制请求和流量。**

> #### IP
>
> - `curl https://ip.agi.li` 或者直接访问 <https://ip.agi.li>
> - `curl -4 https://ipv4.agi.li` 或者直接访问 <https://ipv4.agi.li>
> - `curl -6 https://ipv6.agi.li` 或者直接访问 <https://ipv6.agi.li>

> #### IP GEO
> 
> - `curl https://ip.agi.li/geo` 或者直接访问 <https://ip.agi.li/geo>
> - `curl -4 https://ipv4.agi.li/geo` 或者直接访问 <https://ipv4.agi.li/geo>
> - `curl -6 https://ipv6.agi.li/geo` 或者直接访问 <https://ipv6.agi.li/geo>

---

**以下接口不支持程序自动化调用，有限流。**

### IP

1. 通过访问 Cloudflare 获取本机 IP：<https://cloudflare-ip.html.zone>
2. 通过访问 Vercel 获取本机 IP：<https://vercel-ip.html.zone>
3. 通过访问 Netlify 获取本机 IP：<https://netlify-ip.html.zone>

### IP GEO

1. 通过访问 Cloudflare 获取本机 IP 地理位置信息, <https://cloudflare-ip.html.zone/geo>
2. 通过访问 Vercel 获取本机 IP 地理位置信息, <https://vercel-ip.html.zone/geo>
3. 通过访问 Netlify 获取本机 IP 地理位置信息, <https://netlify-ip.html.zone/geo>

> HTTP 响应头 `x-client-ip` 也是用户 IP 地址。

GEO 信息格式：

```json
{
    "ip": "142.171.116.110",
    "city": "Los Angeles",
    "country": "US",
    "flag": "🇺🇸",
    "countryRegion": "California",
    "region": "LAX",
    "latitude": "34.05440",
    "longitude": "-118.24410",
    "asOrganization": "Multacom Corporation"
}
```

## 部署方式

### 1. 部署代码

```bash
# clone 此项目
git clone https://github.com/miantiao-me/ip-api.git

# 进入项目目录
cd ip-api
# 安装依赖
npm i

## 部署到 Cloudflare Workers
npm run deploy:cloudflare

## 部署到 Vercel Edge
npm run deploy:vercel

## 部署到 Netlify Edge
npm run deploy:netlify
```

### 2. 绑定域名

按照 Cloudflare/Vercel/Netlify 文档绑定域名即可。

### 3. IPv4/IPv6 Only

Cloudflare 支持 IPv4 和 IPv6 访问，如果想只支持单栈，可以只解析 A/AAAA 记录到 Cloudflare 的泛拨 IP。

比如: <https://ipv4.agi.li> 和 <https://ipv6.agi.li>
