---
title: Http 407 问题排查
date: 2019-07-25 19:08:25
tags: [Http, HttpClient]
categories: 异常排查
---

## 问题

最近接一个新的代理平台出现了大量 Http 请求 407 的错误，主要是 HttpClient 的“延迟认证”导致的，排查原因记录下

## basic 认证

实现简单，但如果是 http 请求的话，信息会泄露，存在安全风险

https://juejin.im/entry/5ac175baf265da239e4e3999

## 认证流程

client -> server：未携带认证信息
server -> client：返回407
client -> server：携带认证信息
server -> client：返回200

注意这两步在代码层面是无感知的，只会收到最后的200。如果这个tcp连接已经建立，下次请求就会直接携带认证信息

看看 httpClient 的 debug 日志

``` java
// 请求报文
10:19:46.002 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "GET Http://www.baidu.com/ HTTP/1.1[\r][\n]"
10:19:46.002 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "Host: www.baidu.com[\r][\n]"
10:19:46.002 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "Proxy-Connection: Keep-Alive[\r][\n]"
10:19:46.002 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "User-Agent: Apache-HttpClient/4.5.6 (Java/1.8.0_45)[\r][\n]"
10:19:46.002 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "Accept-Encoding: gzip,deflate[\r][\n]"
10:19:46.002 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "[\r][\n]"
// 返回报文
10:19:46.034 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "HTTP/1.1 407 Proxy Authentication Required[\r][\n]"
10:19:46.034 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Mime-Version: 1.0[\r][\n]"
10:19:46.034 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Date: Wed, 31 Jul 2019 02:19:45 GMT[\r][\n]"
10:19:46.034 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Content-Type: text/html;charset=utf-8[\r][\n]"
10:19:46.034 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Content-Length: 80[\r][\n]"
10:19:46.034 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Proxy-Authenticate: Basic realm="dobel's  server"[\r][\n]"
10:19:46.035 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Connection: keep-alive[\r][\n]"
10:19:46.035 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "[\r][\n]"
10:19:46.035 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "407 Authentication Failed!Maybe Proxy-uthentication header is missing or wrong![\n]"
// 第二次请求报文
10:19:46.060 [main] DEBUG org.apache.http.headers - http-outgoing-0 >> Proxy-Authorization: Basic TVRIVU9DSEU2RUVHOFFMUTEwOnhtS1FHbmJF
10:19:46.060 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "GET Http://www.baidu.com/ HTTP/1.1[\r][\n]"
10:19:46.060 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "Host: www.baidu.com[\r][\n]"
10:19:46.061 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "Proxy-Connection: Keep-Alive[\r][\n]"
10:19:46.061 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "User-Agent: Apache-HttpClient/4.5.6 (Java/1.8.0_45)[\r][\n]"
10:19:46.061 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "Accept-Encoding: gzip,deflate[\r][\n]"
10:19:46.061 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "Proxy-Authorization: Basic TVRIVU9DSEU2RUVHOFFMUTEwOnhtS1FHbmJF[\r][\n]"
10:19:46.061 [main] DEBUG org.apache.http.wire - http-outgoing-0 >> "[\r][\n]"
// 第二次返回报文
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "HTTP/1.1 200 OK[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Cache-Control: private, no-cache, no-store, proxy-revalidate, no-transform[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Content-Encoding: gzip[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Content-Type: text/html[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Date: Wed, 31 Jul 2019 02:19:46 GMT[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Last-Modified: Mon, 23 Jan 2017 13:27:36 GMT[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Pragma: no-cache[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Set-Cookie: BDORZ=27315; max-age=86400; domain=.baidu.com; path=/[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Transfer-Encoding: chunked[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "Connection: keep-alive[\r][\n]"
10:19:46.757 [main] DEBUG org.apache.http.wire - http-outgoing-0 << "[\r][\n]"
```

## 抢占式认证

HttpClient 为了安全考虑，默认是不会发送认证信息的，只有在服务端要求情况下，才回去携带。可以通过直接设置 header 来实现抢先式认证。

## 请求方 407 原因

请求方 HttpClient 在 407 时候会再次请求服务端，这两次请求对上层是透明的。按理说请求方是不知道有 407 的错误的。但是如果在超时时间内未完成这两次请求，HttpClient 就会抛出 407。

## 参考

https://www.baeldung.com/httpclient-4-basic-authentication
