---
title: hexo5-next8 配置
date: 2021-11-23 13:09:23
tags: hexo
---
## 安装

```
## 安装 hexo，需要 nodejs
npm install hexo-cli -g
hexo init blog
cd blog
npm install
hexo server

## 安装 next 主题
npm install hexo-theme-next

## 初始化 next 配置
## hexo5 推荐将主题配置文件放在根目录，命名为：_config.[name].yml
## 下面两种任选一种
cp node_modules/hexo-theme-next/_config.yml _config.next.yml
cp themes/next/_config.yml _config.next.yml
```

### 版本要求

| Hexo version | Minimum Node.js version |
| --- | --- |
| 5.0+ | 10.13.0 |
| 4.1 - 4.2 | 8.10 |
| 4.0 | 8.6 |
| 3.3 - 3.9 | 6.9 |
| 3.2 - 3.3 | 0.12 |
| 3.0 - 3.1 | 0.10 or iojs |
| 0.0.1 - 2.8 | 0.10 |

## 配置

### 站点配置
站点配置文件 _config.yml
主题：`theme: next`
站点信息：title
hexo 永久链接：url
nofollow 减少出站链接
lazeload 图片懒加载

### 主题配置
主题： `scheme:Gemini`
菜单：menu。需要添加对应页面，如： hexo new page about
本地搜索
rss 订阅
站点的 footer 信息
社交信息：social
友链：links_icon
首页文章不展示全文显示摘要
页面阅读统计

## 优化

### cdn 加速
需要一个二级域名，在 dns 上配置 cname 到 xxx.github.io。生效后，在 github page 中设置自定义域名，成功后 github 会在根目录创建一个 CNAME 配置文件。之后访问 xxx.github.io 会 301 到自定义域名

cloudflare 配置 cdn 加速

![dns配置](https://i.loli.net/2021/11/24/x3U2zQtdoB7nHgE.jpg)

### github 图床 + jsdelivr

推荐使用 picgo 上传图片到 github

jsdelivr cdn 可以直接加速 github 资源。原链接：https://raw.githubusercontent.com/zhouxinghang/resources/master/ZBlog/drawio18.svg。 cdn 链接：https://cdn.jsdelivr.net/gh/zhouxinghang/resources/ZBlog/drawio18.svg

picgo 配置如下：

![image-20211124143006109](https://cdn.jsdelivr.net/gh/zhouxinghang/resources/Zblog/202111241430146.png)

## 参考

https://hexo.io/docs/configuration
https://theme-next.js.org/docs/theme-settings/
https://tding.top/archives/42c38b10.html
https://tding.top/archives/12c6c559.html