---
title: hexo deploy 指定 git 账户
date: 2019-03-04 11:32:31
tags: [hexo]
categories: 计算机操作
---

## 问题

hexo deploy默认使用全局的git user.name user.email，通过设置自定义 git 用户

## 操作

在 hexo 全局 _config.yml 中添加配置

``` bash
deploy:
  type: git
  repo: <repository url>
  branch: [branch]
  message: [message]
  name: [git user]
  email: [git email]
  extend_dirs: [extend directory]
```

然后需要删除 .deploy_git 目录，重新 hexo deploy 生成即可

## 参考

https://github.com/hexojs/hexo/issues/2125
